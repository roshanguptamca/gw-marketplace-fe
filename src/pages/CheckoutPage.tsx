import { useRef, useState, type FormEvent } from 'react'
import { analytics } from '../analytics/analytics'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { groupItemsByShop } from '../cart/groupByShop'
import { useShopsForItems } from '../cart/useShopsForItems'
import { env } from '../config/env'
import { EmptyState } from '../components/EmptyState'
import { ShopFulfilment } from '../components/ShopFulfilment'
import { ApiError } from '../services/apiClient'
import { marketplaceService } from '../services/marketplaceService'
import type { OrderConfirmation, OrderRequest, Shop } from '../types/marketplace'
import { continueShoppingPath, formatPrice } from '../utils/shopLinks'
import { getFirstProductImageUrl, handleProductImageError } from '../utils/productImages'

interface CheckoutFields {
  fullName: string
  email: string
  phone: string
  street: string
  houseNumber: string
  houseNumberAddition: string
  postalCode: string
  city: string
  country: string
  notes: string
  termsAccepted: boolean
  createAccount: boolean
  password: string
  passwordConfirm: string
}

const initialFields: CheckoutFields = {
  fullName: '',
  email: '',
  phone: '',
  street: '',
  houseNumber: '',
  houseNumberAddition: '',
  postalCode: '',
  city: '',
  country: 'Netherlands',
  notes: '',
  termsAccepted: false,
  createAccount: false,
  password: '',
  passwordConfirm: '',
}

const MIN_PASSWORD_LENGTH = 8
function computeShopDeliveryFee(
  shop: Shop | undefined,
  orderType: 'pickup' | 'delivery',
  shopSubtotal: number,
): number {
  if (orderType === 'pickup') return 0
  const freeAbove = shop?.freeDeliveryAbove
  if (freeAbove !== undefined && freeAbove !== null && shopSubtotal >= freeAbove) {
    return 0
  }
  return shop?.localDeliveryFee ?? 0
}

export function CheckoutPage() {
  const { items, subtotal, clearCart, removeItem } = useCart()
  const { user } = useAuth()
  const [fields, setFields] = useState(initialFields)
  const [fulfilmentSelections, setFulfilmentSelections] = useState<
    Record<string, 'pickup' | 'delivery'>
  >({})
  const shopRefs = useRef<Record<string, HTMLFieldSetElement | null>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [confirmations, setConfirmations] = useState<OrderConfirmation[]>([])
  const [accountCreated, setAccountCreated] = useState(false)
  const [continuingAsGuest, setContinuingAsGuest] = useState(false)
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle')
  const currency = items[0]?.product.currency ?? 'EUR'
  const showAccountPrompt = !user && !continuingAsGuest

  // Load shop settings (delivery fees, free-delivery threshold) for every
  // shop represented in the cart so we can preview an accurate delivery fee
  // before the order is submitted. The backend recomputes this fee
  // authoritatively on submission — this is a preview only.
  const { shopsBySlug, error: shopError } = useShopsForItems(items)

  const shopGroups = groupItemsByShop(items)
  const isMultiShop = shopGroups.length > 1
  const continueShoppingLink = continueShoppingPath(shopGroups.map((group) => group.shopSlug))
  const methodFor = (slug: string): 'pickup' | 'delivery' =>
    fulfilmentSelections[slug] ??
    (shopsBySlug[slug]?.pickupAvailable !== false ? 'pickup' : 'delivery')
  const anyDelivery = shopGroups.some((group) => methodFor(group.shopSlug) === 'delivery')
  const shopGroupsWithFees = shopGroups.map((group) => ({
    ...group,
    deliveryFee: computeShopDeliveryFee(
      shopsBySlug[group.shopSlug],
      methodFor(group.shopSlug),
      group.subtotal,
    ),
  }))
  const estimatedDeliveryFee = shopGroupsWithFees.reduce(
    (total, group) => total + group.deliveryFee,
    0,
  )
  const estimatedTotal = subtotal + estimatedDeliveryFee

  const update = <Key extends keyof CheckoutFields>(key: Key, value: CheckoutFields[Key]) => {
    setFields((current) => ({ ...current, [key]: value }))
  }

  const findAddress = async () => {
    if (!fields.postalCode || !fields.houseNumber) return
    setLookupState('loading')
    const result = await marketplaceService.lookupAddress(fields.postalCode, fields.houseNumber)
    if (result) {
      setFields((current) => ({
        ...current,
        street: result.street,
        city: result.city,
        country: result.country || current.country,
      }))
      setLookupState('found')
    } else {
      setLookupState('not-found')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setErrorCode('')
    if (shopError || shopGroups.some((group) => !shopsBySlug[group.shopSlug])) {
      setError(shopError || 'Shop configuration is still loading. Please try again.')
      return
    }
    for (const group of shopGroups) {
      const shop = shopsBySlug[group.shopSlug]
      const minimum = Math.round(Number(shop.minimumOrderAmount ?? 0) * 100)
      const remaining = minimum - Math.round(group.subtotal * 100)
      if (remaining > 0) {
        setError(
          `Minimum order for ${shop.name} is ${formatPrice(minimum / 100, currency)}. Please add ${formatPrice(remaining / 100, currency)} more to place your order.`,
        )
        shopRefs.current[group.shopSlug]?.scrollIntoView?.({ block: 'center' })
        shopRefs.current[group.shopSlug]?.focus()
        return
      }
      if (
        (methodFor(group.shopSlug) === 'pickup' && shop.pickupAvailable === false) ||
        (methodFor(group.shopSlug) === 'delivery' && shop.deliveryAvailable !== true)
      ) {
        setError(`${shop.name} does not offer the selected fulfilment method.`)
        shopRefs.current[group.shopSlug]?.focus()
        return
      }
    }

    const requestingAccount = !user && fields.createAccount && !accountCreated
    if (requestingAccount) {
      if (!fields.password || !fields.passwordConfirm) {
        setError('Please enter and confirm a password to create your account.')
        return
      }
      if (fields.password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }
      if (fields.password !== fields.passwordConfirm) {
        setError('Passwords do not match.')
        return
      }
    }

    const groups = new Map<string, typeof items>()
    for (const item of items) {
      if (!item.product.shopId || !Number.isFinite(Number(item.product.shopId))) {
        setError('A product is missing seller information. Please remove it and add it again.')
        return
      }
      groups.set(item.product.shopId, [...(groups.get(item.product.shopId) ?? []), item])
    }

    const created: OrderConfirmation[] = []
    const completedProductIds: string[] = []
    setSubmitting(true)
    try {
      const deliveryAddress = [
        [fields.street, fields.houseNumber].filter(Boolean).join(' ') +
          (fields.houseNumberAddition ? ` ${fields.houseNumberAddition}` : ''),
        fields.postalCode,
        fields.city,
        fields.country,
      ]
        .filter(Boolean)
        .join(', ')
      // Submit one shop's order at a time (not Promise.all): SQLite only
      // allows a single writer, so firing all shop orders in parallel from a
      // multi-shop cart raced against each other and intermittently raised
      // "database is locked". Sequential awaits also let the account-creation
      // request (always first) fully commit before any other order write.
      for (const [index, [shopId, shopItems]] of [...groups.entries()].entries()) {
        const order: OrderRequest = {
          shop_id: Number(shopId),
          customer_name: fields.fullName,
          customer_email: fields.email,
          customer_phone: fields.phone,
          delivery_address:
            methodFor(shopItems[0].product.shopSlug) === 'delivery' ? deliveryAddress : '',
          order_type: methodFor(shopItems[0].product.shopSlug),
          delivery_zone: 'local',
          customer_note: fields.notes,
          payment_method: 'cash',
          terms_accepted: true,
          items: shopItems.map((item) => ({
            product_id: Number(item.product.id),
            quantity: item.quantity,
          })),
          // Only request account creation on the first order — a shopper
          // checking out across multiple shops should only get one account.
          ...(requestingAccount && index === 0
            ? {
                create_account: true,
                password: fields.password,
                password_confirm: fields.passwordConfirm,
              }
            : {}),
        }
        created.push(await marketplaceService.createOrderRequest(order))
        analytics.event('purchase', {
          transaction_id: created[created.length - 1].order_number,
          value: Number(created[created.length - 1].total),
          currency,
          items: shopItems.map(({ product, quantity }) => ({
            item_id: product.id,
            quantity,
            price: product.price,
          })),
        })
        completedProductIds.push(...shopItems.map((item) => item.product.id))
      }
      setConfirmations(created)
      setAccountCreated(requestingAccount)
      clearCart()
    } catch (caught) {
      if (created.length > 0) {
        completedProductIds.forEach(removeItem)
        if (requestingAccount) setAccountCreated(true)
      }
      const partialMessage = created.length
        ? `${created.length} shop order${created.length === 1 ? '' : 's'} already placed (${created.map((order) => order.order_number).join(', ')}). Those items were removed from your cart. Please submit the remaining shop orders separately. `
        : ''
      if (caught instanceof ApiError && caught.code === 'ACCOUNT_ALREADY_EXISTS') {
        setErrorCode('ACCOUNT_ALREADY_EXISTS')
        setError(
          partialMessage +
            'An account already exists with this email. Please log in to continue and track your order.',
        )
      } else if (caught instanceof ApiError && caught.code === 'SHOP_MINIMUM_ORDER_NOT_MET') {
        const detail = caught.details
        const minimum = Number(detail?.minimum_order_amount)
        const remaining = Number(detail?.remaining_amount)
        const shopName = typeof detail?.shop_name === 'string' ? detail.shop_name : 'this shop'
        setError(
          partialMessage +
            (Number.isFinite(minimum) && Number.isFinite(remaining)
              ? `Minimum order for ${shopName} is ${formatPrice(minimum, currency)}. Please add ${formatPrice(remaining, currency)} more to place your order.`
              : caught.message),
        )
        const group = shopGroups.find(
          (item) => shopsBySlug[item.shopSlug]?.id === String(detail?.shop_id),
        )
        if (group) {
          shopRefs.current[group.shopSlug]?.scrollIntoView?.({ block: 'center' })
          shopRefs.current[group.shopSlug]?.focus()
        }
      } else {
        setError(
          partialMessage +
            (caught instanceof Error ? caught.message : 'The order request could not be sent.'),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmations.length > 0) {
    return (
      <main className="page-shell checkout-page order-confirmation" aria-live="polite">
        <span className="confirmation-mark" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Order request received</p>
        <h1>Your order request has been sent to the seller.</h1>
        <p>
          No payment was collected. The seller will contact you to confirm fulfilment and payment.
        </p>
        <div className="confirmation-references">
          {confirmations.map((confirmation) => (
            <div key={confirmation.order_number}>
              <span>{confirmation.shop_name || 'Seller'} reference</span>
              <strong>{confirmation.order_number}</strong>
            </div>
          ))}
        </div>
        {user ? (
          <Link className="button" to="/account/orders">
            View order
          </Link>
        ) : accountCreated ? (
          <p className="confirmation-verify-note">
            We&apos;ve created your account. Check <strong>{fields.email}</strong> for a
            verification email to confirm it and start tracking your orders.
          </p>
        ) : (
          <a
            className="button"
            href={`${env.mainFrontendUrl}/#signup?next=${encodeURIComponent(env.marketplaceUrl)}`}
          >
            Create account to track your order
          </a>
        )}
        <Link className="button button--ghost" to="/">
          Continue shopping
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="page-shell section">
        <EmptyState
          title="Your cart is empty"
          message="Add a product before starting checkout."
          action={
            <Link className="button" to="/">
              Browse shops
            </Link>
          }
        />
      </main>
    )
  }

  return (
    <main className="page-shell section checkout">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Order request</p>
          <h1>Checkout</h1>
        </div>
        <p>No online payment is collected.</p>
      </div>
      <form className="checkout-layout" onSubmit={(event) => void submit(event)}>
        <section className="checkout-form">
          {showAccountPrompt && (
            <div className="checkout-account-prompt" role="note">
              <div>
                <h2>Save your orders &amp; track deliveries</h2>
                <p>
                  Create a free account to view order history, request cancellations, and get faster
                  checkout next time.
                </p>
              </div>
              <label className="checkout-account-prompt__checkbox">
                <input
                  type="checkbox"
                  checked={fields.createAccount}
                  onChange={(event) => {
                    const checked = event.target.checked
                    update('createAccount', checked)
                    // Unchecking "create an account" means the shopper decided to
                    // continue as a guest instead — any stale
                    // ACCOUNT_ALREADY_EXISTS error/"Log in to continue" CTA from a
                    // previous submit attempt no longer applies, so clear it
                    // immediately rather than leaving it stuck until next submit.
                    if (!checked && errorCode === 'ACCOUNT_ALREADY_EXISTS') {
                      setError('')
                      setErrorCode('')
                    }
                  }}
                />
                <span>Create an account to track my order</span>
              </label>
              {fields.createAccount ? (
                <div className="form-grid">
                  <label className="form-field">
                    Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={fields.password}
                      onChange={(event) => update('password', event.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    Confirm password
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={fields.passwordConfirm}
                      onChange={(event) => update('passwordConfirm', event.target.value)}
                      required
                    />
                  </label>
                </div>
              ) : (
                <div className="checkout-account-prompt__actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setContinuingAsGuest(true)}
                  >
                    Continue as guest
                  </button>
                </div>
              )}
            </div>
          )}

          <h2>Contact details</h2>
          <div className="form-grid">
            <label className="form-field form-field--wide">
              Full name
              <input
                autoComplete="name"
                value={fields.fullName}
                onChange={(event) => update('fullName', event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              Email
              <input
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={(event) => update('email', event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              Phone
              <input
                type="tel"
                autoComplete="tel"
                value={fields.phone}
                onChange={(event) => update('phone', event.target.value)}
                required
              />
            </label>
          </div>

          {shopGroups.map((group) => {
            const shop = shopsBySlug[group.shopSlug]
            return (
              <fieldset
                className="delivery-options checkout-shop-fulfilment"
                key={group.shopSlug}
                tabIndex={-1}
                ref={(node) => {
                  shopRefs.current[group.shopSlug] = node
                }}
              >
                <legend>{shop?.name ?? group.shopSlug} — Delivery method</legend>
                {!shop && <p>Loading shop fulfilment options…</p>}
                {shop?.pickupAvailable !== false && shop && (
                  <label>
                    <input
                      type="radio"
                      name={`deliveryMethod-${group.shopSlug}`}
                      checked={methodFor(group.shopSlug) === 'pickup'}
                      onChange={() => {
                        setFulfilmentSelections((current) => ({
                          ...current,
                          [group.shopSlug]: 'pickup',
                        }))
                        analytics.event('select_delivery_method', {
                          method: 'pickup',
                          shop_id: shop.id,
                        })
                      }}
                    />
                    <span>
                      <strong>Pickup</strong>
                    </span>
                  </label>
                )}
                {shop?.deliveryAvailable === true && (
                  <label>
                    <input
                      type="radio"
                      name={`deliveryMethod-${group.shopSlug}`}
                      checked={methodFor(group.shopSlug) === 'delivery'}
                      onChange={() => {
                        setFulfilmentSelections((current) => ({
                          ...current,
                          [group.shopSlug]: 'delivery',
                        }))
                        analytics.event('select_delivery_method', {
                          method: 'delivery',
                          shop_id: shop.id,
                        })
                      }}
                    />
                    <span>
                      <strong>Delivery</strong>
                    </span>
                  </label>
                )}
                {shop && <ShopFulfilment shop={shop} method={methodFor(group.shopSlug)} />}
                {shop && !shop.pickupAvailable && !shop.deliveryAvailable && (
                  <p role="alert">This shop has no available fulfilment methods.</p>
                )}
              </fieldset>
            )
          })}

          {anyDelivery && (
            <div className="delivery-address">
              {env.addressLookupEnabled && (
                <div className="form-grid address-lookup">
                  <label className="form-field">
                    Postcode
                    <input
                      autoComplete="postal-code"
                      placeholder="1234AB"
                      value={fields.postalCode}
                      onChange={(event) => {
                        setLookupState('idle')
                        update('postalCode', event.target.value)
                      }}
                    />
                  </label>
                  <label className="form-field">
                    House number
                    <input
                      value={fields.houseNumber}
                      onChange={(event) => {
                        setLookupState('idle')
                        update('houseNumber', event.target.value)
                      }}
                    />
                  </label>
                  <label className="form-field">
                    Addition
                    <input
                      value={fields.houseNumberAddition}
                      onChange={(event) => update('houseNumberAddition', event.target.value)}
                    />
                  </label>
                  <div className="form-field form-field--action">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => void findAddress()}
                      disabled={
                        lookupState === 'loading' || !fields.postalCode || !fields.houseNumber
                      }
                    >
                      {lookupState === 'loading' ? 'Looking up address…' : 'Find address'}
                    </button>
                  </div>
                  {lookupState === 'not-found' && (
                    <p className="inline-note form-field--wide">
                      We could not find the address automatically. Please enter it manually.
                    </p>
                  )}
                </div>
              )}
              <div className="form-grid">
                <label className="form-field form-field--wide">
                  Street and house number
                  <input
                    autoComplete="street-address"
                    value={fields.street}
                    onChange={(event) => update('street', event.target.value)}
                    required
                  />
                </label>
                {!env.addressLookupEnabled && (
                  <>
                    <label className="form-field">
                      House number
                      <input
                        value={fields.houseNumber}
                        onChange={(event) => update('houseNumber', event.target.value)}
                        required
                      />
                    </label>
                    <label className="form-field">
                      Postal code
                      <input
                        autoComplete="postal-code"
                        value={fields.postalCode}
                        onChange={(event) => update('postalCode', event.target.value)}
                        required
                      />
                    </label>
                  </>
                )}
                <label className="form-field">
                  City
                  <input
                    autoComplete="address-level2"
                    value={fields.city}
                    onChange={(event) => update('city', event.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  Country
                  <input
                    autoComplete="country-name"
                    value={fields.country}
                    onChange={(event) => update('country', event.target.value)}
                    required
                  />
                </label>
              </div>
            </div>
          )}

          <label className="form-field">
            Notes to seller
            <textarea
              rows={4}
              value={fields.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Allergies, preferred pickup time, or other useful details"
            />
          </label>
        </section>

        <aside className="checkout-order">
          <h2>Order summary</h2>
          {isMultiShop && (
            <p className="inline-note checkout-multi-shop-note">
              Your cart has items from {shopGroupsWithFees.length} shops. Each shop ships as a
              separate order.
            </p>
          )}
          {shopGroupsWithFees.map((group) => {
            const shop = shopsBySlug[group.shopSlug]
            return (
              <div className="checkout-shop-group" key={group.shopSlug}>
                {isMultiShop && (
                  <h3 className="checkout-shop-group__name">{shop?.name ?? group.shopSlug}</h3>
                )}
                {group.items.map(({ product, quantity }) => (
                  <div className="checkout-line" key={product.id}>
                    <img
                      src={getFirstProductImageUrl(product.images)}
                      alt=""
                      onError={handleProductImageError}
                    />
                    <span>
                      <strong>{product.name}</strong>
                      {quantity} × {formatPrice(product.price, product.currency)}
                    </span>
                    <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
                  </div>
                ))}
                {Number(shop?.minimumOrderAmount ?? 0) > 0 && (
                  <div className="shop-minimum">
                    <span>
                      Minimum order: {formatPrice(Number(shop?.minimumOrderAmount), currency)}
                    </span>
                    {Math.round(group.subtotal * 100) <
                      Math.round(Number(shop?.minimumOrderAmount) * 100) && (
                      <p>
                        {formatPrice(
                          (Math.round(Number(shop?.minimumOrderAmount) * 100) -
                            Math.round(group.subtotal * 100)) /
                            100,
                          currency,
                        )}{' '}
                        more required to place an order.
                      </p>
                    )}
                  </div>
                )}
                {isMultiShop && (
                  <>
                    <div className="checkout-total checkout-total--subtotal">
                      <span>Shop subtotal</span>
                      <strong>{formatPrice(group.subtotal, currency)}</strong>
                    </div>
                    <div className="checkout-total checkout-total--delivery">
                      <span>Delivery method</span>
                      <strong>
                        {methodFor(group.shopSlug) === 'pickup' ? 'Pickup' : 'Delivery'}
                      </strong>
                    </div>
                    <div className="checkout-total checkout-total--delivery">
                      <span>Delivery fee</span>
                      <strong>
                        {methodFor(group.shopSlug) === 'pickup' || group.deliveryFee === 0
                          ? 'Free'
                          : formatPrice(group.deliveryFee, currency)}
                      </strong>
                    </div>
                    <div className="checkout-total checkout-total--shop-total">
                      <span>Shop total</span>
                      <strong>{formatPrice(group.subtotal + group.deliveryFee, currency)}</strong>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          <div className="checkout-total checkout-total--subtotal">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <div className="checkout-total checkout-total--delivery">
            <span>Delivery fee</span>
            <strong>
              {estimatedDeliveryFee > 0 ? formatPrice(estimatedDeliveryFee, currency) : 'Free'}
            </strong>
          </div>
          <div className="checkout-total">
            <span>{isMultiShop ? 'Grand total' : 'Estimated total'}</span>
            <strong>{formatPrice(estimatedTotal, currency)}</strong>
          </div>
          <p className="checkout-total-note">Final delivery fee is confirmed by the seller.</p>
          <label className="terms-check">
            <input
              type="checkbox"
              checked={fields.termsAccepted}
              onChange={(event) => update('termsAccepted', event.target.checked)}
              required
            />
            <span>
              I have read and agree to the{' '}
              <a href={env.termsUrl} target="_blank" rel="noreferrer">
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a href={env.privacyUrl} target="_blank" rel="noreferrer">
                Privacy Policy
              </a>{' '}
              of GuideWisey Marketplace. <span aria-hidden="true">*</span>
            </span>
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {errorCode === 'ACCOUNT_ALREADY_EXISTS' && (
            <a className="button button--wide" href={env.loginUrlWithNext('/checkout')}>
              Log in to continue
            </a>
          )}
          <button
            className="button button--wide"
            type="submit"
            disabled={
              submitting ||
              Boolean(shopError) ||
              shopGroups.some((group) => !shopsBySlug[group.shopSlug])
            }
          >
            {submitting ? 'Sending order request…' : 'Submit order request'}
          </button>
          <Link className="checkout-back" to="/cart">
            ← Back to cart
          </Link>
          <Link className="checkout-back checkout-continue-shopping" to={continueShoppingLink}>
            ← Continue shopping
          </Link>
        </aside>
      </form>
    </main>
  )
}
