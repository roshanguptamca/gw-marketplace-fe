import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { env } from '../config/env'
import { EmptyState } from '../components/EmptyState'
import { ApiError } from '../services/apiClient'
import { marketplaceService } from '../services/marketplaceService'
import type { OrderConfirmation, OrderRequest, Shop } from '../types/marketplace'
import { formatPrice } from '../utils/shopLinks'

interface CheckoutFields {
  fullName: string
  email: string
  phone: string
  deliveryMethod: 'pickup' | 'delivery'
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
  deliveryMethod: 'pickup',
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
// Fallback delivery fee used only if a shop hasn't configured its own fee —
// mirrors the legacy gw-frontend marketplace defaults.
const DEFAULT_LOCAL_DELIVERY_FEE = 5

// Mirrors computeDeliveryFee() from the legacy gw-frontend marketplace:
// pickup is always free; delivery is free above the shop's threshold,
// otherwise the shop's local delivery fee (falling back to a sane default).
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
  return shop?.localDeliveryFee ?? DEFAULT_LOCAL_DELIVERY_FEE
}

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const [fields, setFields] = useState(initialFields)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [confirmations, setConfirmations] = useState<OrderConfirmation[]>([])
  const [accountCreated, setAccountCreated] = useState(false)
  const [continuingAsGuest, setContinuingAsGuest] = useState(false)
  const [shopsBySlug, setShopsBySlug] = useState<Record<string, Shop>>({})
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle')
  const currency = items[0]?.product.currency ?? 'EUR'
  const showAccountPrompt = !user && !continuingAsGuest

  // Load shop settings (delivery fees, free-delivery threshold) for every
  // shop represented in the cart so we can preview an accurate delivery fee
  // before the order is submitted. The backend recomputes this fee
  // authoritatively on submission — this is a preview only.
  useEffect(() => {
    const slugs = [...new Set(items.map((item) => item.product.shopSlug).filter(Boolean))]
    const missing = slugs.filter((slug) => !(slug in shopsBySlug))
    if (missing.length === 0) return
    let active = true
    void Promise.all(missing.map((slug) => marketplaceService.getShopBySlug(slug))).then((shops) => {
      if (!active) return
      setShopsBySlug((current) => {
        const next = { ...current }
        missing.forEach((slug, index) => {
          const shop = shops[index]
          if (shop) next[slug] = shop
        })
        return next
      })
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const shopSubtotals = new Map<string, number>()
  for (const item of items) {
    const key = item.product.shopSlug
    shopSubtotals.set(key, (shopSubtotals.get(key) ?? 0) + item.product.price * item.quantity)
  }
  const estimatedDeliveryFee = [...shopSubtotals.entries()].reduce((total, [slug, shopSubtotal]) => {
    return total + computeShopDeliveryFee(shopsBySlug[slug], fields.deliveryMethod, shopSubtotal)
  }, 0)
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

    const requestingAccount = !user && fields.createAccount
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

    setSubmitting(true)
    try {
      const deliveryAddress =
        fields.deliveryMethod === 'delivery'
          ? [
              [fields.street, fields.houseNumber].filter(Boolean).join(' ') +
                (fields.houseNumberAddition ? ` ${fields.houseNumberAddition}` : ''),
              fields.postalCode,
              fields.city,
              fields.country,
            ]
              .filter(Boolean)
              .join(', ')
          : ''
      // Submit one shop's order at a time (not Promise.all): SQLite only
      // allows a single writer, so firing all shop orders in parallel from a
      // multi-shop cart raced against each other and intermittently raised
      // "database is locked". Sequential awaits also let the account-creation
      // request (always first) fully commit before any other order write.
      const created: OrderConfirmation[] = []
      for (const [index, [shopId, shopItems]] of [...groups.entries()].entries()) {
        const order: OrderRequest = {
          shop_id: Number(shopId),
          customer_name: fields.fullName,
          customer_email: fields.email,
          customer_phone: fields.phone,
          delivery_address: deliveryAddress,
          order_type: fields.deliveryMethod,
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
      }
      setConfirmations(created)
      setAccountCreated(requestingAccount)
      clearCart()
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'ACCOUNT_ALREADY_EXISTS') {
        setErrorCode('ACCOUNT_ALREADY_EXISTS')
        setError(
          'An account already exists with this email. Please log in to continue and track your order.',
        )
      } else {
        setError(caught instanceof Error ? caught.message : 'The order request could not be sent.')
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

          <fieldset className="delivery-options">
            <legend>Delivery method</legend>
            <label>
              <input
                type="radio"
                name="deliveryMethod"
                checked={fields.deliveryMethod === 'pickup'}
                onChange={() => update('deliveryMethod', 'pickup')}
              />
              <span>
                <strong>Pickup</strong>
                Arrange collection with the seller.
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="deliveryMethod"
                checked={fields.deliveryMethod === 'delivery'}
                onChange={() => update('deliveryMethod', 'delivery')}
              />
              <span>
                <strong>Delivery</strong>
                The seller will confirm availability and fees.
              </span>
            </label>
          </fieldset>

          {fields.deliveryMethod === 'delivery' && (
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
                      disabled={lookupState === 'loading' || !fields.postalCode || !fields.houseNumber}
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
          {items.map(({ product, quantity }) => (
            <div className="checkout-line" key={product.id}>
              <img src={product.images[0]} alt="" />
              <span>
                <strong>{product.name}</strong>
                {quantity} × {formatPrice(product.price, product.currency)}
              </span>
              <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
            </div>
          ))}
          <div className="checkout-total checkout-total--subtotal">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <div className="checkout-total checkout-total--delivery">
            <span>Delivery method</span>
            <strong>{fields.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}</strong>
          </div>
          <div className="checkout-total checkout-total--delivery">
            <span>Delivery fee</span>
            <strong>
              {fields.deliveryMethod === 'pickup'
                ? 'Free'
                : estimatedDeliveryFee > 0
                  ? formatPrice(estimatedDeliveryFee, currency)
                  : 'Free'}
            </strong>
          </div>
          <div className="checkout-total">
            <span>Estimated total</span>
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
          <button className="button button--wide" type="submit" disabled={submitting}>
            {submitting ? 'Sending order request…' : 'Submit order request'}
          </button>
          <Link className="checkout-back" to="/cart">
            ← Return to cart
          </Link>
        </aside>
      </form>
    </main>
  )
}
