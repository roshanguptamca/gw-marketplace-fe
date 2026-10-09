import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { analytics } from '../analytics/analytics'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { groupItemsByShop } from '../cart/groupByShop'
import { usePickupSchedules } from '../cart/usePickupSchedules'
import { useShopsForItems } from '../cart/useShopsForItems'
import { env } from '../config/env'
import { EmptyState } from '../components/EmptyState'
import { InclusiveVat } from '../components/InclusiveVat'
import { vatPreview } from '../utils/vatPreview'
import { ShopFulfilment } from '../components/ShopFulfilment'
import { ApiError } from '../services/apiClient'
import { marketplaceService } from '../services/marketplaceService'
import type { OrderConfirmation, OrderRequest, Shop } from '../types/marketplace'
import { continueShoppingPath, formatPrice } from '../utils/shopLinks'
import { languageCode } from '../utils/localizedText'
import { getFirstProductImageUrl, handleProductImageError } from '../utils/productImages'
import {
  describeOrderRuleError,
  describeProductRuleViolation,
} from '../utils/orderRuleErrors'
import {
  describeQuantity,
  formatLeadTime,
  hasSellingFormatDetails,
  productRuleViolations,
} from '../utils/productUnits'

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

function isValidPhoneNumber(value: string): boolean {
  const normalized = value.replace(/[\s().-]/g, '')
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  return /^\+?[0-9]+$/.test(normalized) && digits.length >= 7 && digits.length <= 15
}

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
  const { t, i18n } = useTranslation()
  const { items, subtotal, clearCart, removeItem } = useCart()
  const { user } = useAuth()
  const [fields, setFields] = useState(initialFields)
  const [fulfilmentSelections, setFulfilmentSelections] = useState<
    Record<string, 'pickup' | 'delivery'>
  >({})
  const [pickupSelections, setPickupSelections] = useState<
    Record<string, { date: string; start: string }>
  >({})
  const [scheduleReload, setScheduleReload] = useState(0)
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
  const pickupSchedules = usePickupSchedules(
    shopGroups.map((group) => ({
      shopSlug: group.shopSlug,
      productIds: group.items.map((item) => item.product.id),
    })),
    scheduleReload,
  )
  const scheduleFor = (slug: string) => pickupSchedules[slug]?.schedule ?? null
  const pickupSchedulingFor = (slug: string) =>
    methodFor(slug) === 'pickup' && Boolean(scheduleFor(slug)?.schedulingEnabled)
  const selectedSlotFor = (slug: string) => {
    const selection = pickupSelections[slug]
    const day = scheduleFor(slug)?.days.find((candidate) => candidate.date === selection?.date)
    const slot = day?.slots.find((candidate) => candidate.start === selection?.start)
    return day && slot ? { day, slot } : null
  }
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
  const phoneInvalid = Boolean(fields.phone.trim()) && !isValidPhoneNumber(fields.phone.trim())

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
    if (!isValidPhoneNumber(fields.phone.trim())) {
      setError(t('invalidPhone'))
      return
    }
    if (shopError || shopGroups.some((group) => !shopsBySlug[group.shopSlug])) {
      setError(t('shopSettingsLoading'))
      return
    }
    for (const group of shopGroups) {
      const shop = shopsBySlug[group.shopSlug]
      const minimum = Math.round(Number(shop.minimumOrderAmount ?? 0) * 100)
      const remaining = minimum - Math.round(group.subtotal * 100)
      if (remaining > 0) {
        setError(
          t('shopMinimumError', {
            shop: shop.name,
            amount: formatPrice(minimum / 100, currency),
            remaining: formatPrice(remaining / 100, currency),
          }),
        )
        shopRefs.current[group.shopSlug]?.scrollIntoView?.({ block: 'center' })
        shopRefs.current[group.shopSlug]?.focus()
        return
      }
      if (
        (methodFor(group.shopSlug) === 'pickup' && shop.pickupAvailable === false) ||
        (methodFor(group.shopSlug) === 'delivery' && shop.deliveryAvailable !== true)
      ) {
        setError(t('fulfilmentUnavailable', { shop: shop.name }))
        shopRefs.current[group.shopSlug]?.focus()
        return
      }
      const firstViolation = group.items
        .map(({ product, quantity }) => ({
          product,
          quantity,
          violation: productRuleViolations(product, quantity, (value) =>
            formatPrice(value, currency),
          )[0],
        }))
        .find((entry) => entry.violation)
      if (firstViolation?.violation) {
        setError(
          i18n.language === 'nl'
            ? describeProductRuleViolation(
                firstViolation.product,
                firstViolation.quantity,
                firstViolation.violation.code,
                currency,
                (key, values) => t(key, values),
                i18n.language,
              ) ?? firstViolation.violation.message
            : firstViolation.violation.message,
        )
        shopRefs.current[group.shopSlug]?.focus()
        return
      }
      if (pickupSchedulingFor(group.shopSlug) && !selectedSlotFor(group.shopSlug)) {
        setError(t('choosePickupTime', { shop: shop.name }))
        shopRefs.current[group.shopSlug]?.scrollIntoView?.({ block: 'center' })
        shopRefs.current[group.shopSlug]?.focus()
        return
      }
    }

    const requestingAccount = !user && fields.createAccount && !accountCreated
    if (requestingAccount) {
      if (!fields.password || !fields.passwordConfirm) {
        setError(t('accountPasswordRequired'))
        return
      }
      if (fields.password.length < MIN_PASSWORD_LENGTH) {
        setError(t('passwordMinimum', { count: MIN_PASSWORD_LENGTH }))
        return
      }
      if (fields.password !== fields.passwordConfirm) {
        setError(t('passwordsMismatch'))
        return
      }
    }

    const groups = new Map<string, typeof items>()
    for (const item of items) {
      if (!item.product.shopId || !Number.isFinite(Number(item.product.shopId))) {
        setError(t('productMissingShop'))
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
        const shopSlug = shopItems[0].product.shopSlug
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
          language: languageCode(i18n.language),
          terms_accepted: true,
          items: shopItems.map((item) => ({
            product_id: Number(item.product.id),
            quantity: item.quantity,
          })),
          ...(pickupSchedulingFor(shopSlug)
            ? { pickup_slot_start: selectedSlotFor(shopSlug)?.slot.start ?? null }
            : {}),
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
        ? `${t('partialOrderNotice', {
            count: created.length,
            orders: created.map((order) => order.order_number).join(', '),
          })} `
        : ''
      if (caught instanceof ApiError && caught.code === 'ACCOUNT_ALREADY_EXISTS') {
        setErrorCode('ACCOUNT_ALREADY_EXISTS')
        setError(
          partialMessage +
            t('existingAccountMessage'),
        )
      } else if (caught instanceof ApiError && caught.code === 'SHOP_MINIMUM_ORDER_NOT_MET') {
        const detail = caught.details
        const minimum = Number(detail?.minimum_order_amount)
        const remaining = Number(detail?.remaining_amount)
        const shopName = typeof detail?.shop_name === 'string' ? detail.shop_name : 'this shop'
        setError(
          partialMessage +
            (Number.isFinite(minimum) && Number.isFinite(remaining)
              ? t('shopMinimumError', {
                  shop: shopName,
                  amount: formatPrice(minimum, currency),
                  remaining: formatPrice(remaining, currency),
                })
              : t('orderRequestFailed')),
        )
        const group = shopGroups.find(
          (item) => shopsBySlug[item.shopSlug]?.id === String(detail?.shop_id),
        )
        if (group) {
          shopRefs.current[group.shopSlug]?.scrollIntoView?.({ block: 'center' })
          shopRefs.current[group.shopSlug]?.focus()
        }
      } else if (
        caught instanceof ApiError &&
        describeOrderRuleError(
          caught.code,
          caught.details,
          currency,
          (key, values) => t(key, values),
          i18n.language,
        )
      ) {
        setError(
          partialMessage +
            describeOrderRuleError(
              caught.code,
              caught.details,
              currency,
              (key, values) => t(key, values),
              i18n.language,
            ),
        )
        if (caught.code?.startsWith('PICKUP_')) {
          const group = shopGroups.find(
            (item) => shopsBySlug[item.shopSlug]?.id === String(caught.details?.shop_id),
          )
          if (group) {
            setPickupSelections((current) => {
              const next = { ...current }
              delete next[group.shopSlug]
              return next
            })
            shopRefs.current[group.shopSlug]?.focus()
          }
          setScheduleReload((value) => value + 1)
        }
      } else {
        setError(
          partialMessage +
            (i18n.language !== 'nl' && caught instanceof Error
              ? caught.message
              : t('orderRequestFailed')),
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
        <p className="eyebrow">{t('orderRequestReceived')}</p>
        <h1>{t('orderSent')}</h1>
        <p>{t('noPayment')}</p>
        <div className="confirmation-references">
          {confirmations.map((confirmation) => (
            <div key={confirmation.order_number}>
              <span>{t('sellerReference', { shop: confirmation.shop_name || 'Seller' })}</span>
              <strong>{confirmation.order_number}</strong>
            </div>
          ))}
        </div>
        {user ? (
          <Link className="button" to="/account/orders">
            {t('viewOrder')}
          </Link>
        ) : accountCreated ? (
          <p className="confirmation-verify-note">
            {t('verifyAccountBefore')} <strong>{fields.email}</strong>{' '}
            {t('verifyAccountAfter')}
          </p>
        ) : (
          <a
            className="button"
            href={`${env.mainFrontendUrl}/#signup?next=${encodeURIComponent(env.marketplaceUrl)}`}
          >
            {t('createAccountTrack')}
          </a>
        )}
        <Link className="button button--ghost" to="/">
          {t('continueShopping')}
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="page-shell section">
        <EmptyState
          title={t('yourCartEmpty')}
          message={t('addProductBeforeCheckout')}
          action={
            <Link className="button" to="/">
              {t('browse')}
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
          <p className="eyebrow">{t('orderRequest')}</p>
          <h1>{t('checkout')}</h1>
        </div>
        <p>{t('noPaymentCollected')}</p>
      </div>
      <form className="checkout-layout" onSubmit={(event) => void submit(event)}>
        <section className="checkout-form">
          {showAccountPrompt && (
            <div className="checkout-account-prompt" role="note">
              <div>
                <h2>{t('saveTrackOrders')}</h2>
                <p>
                  {t('accountBenefit')}
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
                <span>{t('createAccountTrackOrder')}</span>
              </label>
              {fields.createAccount ? (
                <div className="form-grid">
                  <label className="form-field">
                    {t('password')}
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={fields.password}
                      onChange={(event) => update('password', event.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    {t('confirmPassword')}
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
                    {t('continueGuest')}
                  </button>
                </div>
              )}
            </div>
          )}

          <h2>{t('contactDetails')}</h2>
          <div className="form-grid">
            <label className="form-field form-field--wide">
              {t('fullName')}
              <input
                autoComplete="name"
                value={fields.fullName}
                onChange={(event) => update('fullName', event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              {t('email')}
              <input
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={(event) => update('email', event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              {t('phone')}
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={fields.phone}
                onChange={(event) => update('phone', event.target.value)}
                aria-invalid={phoneInvalid}
                aria-describedby={phoneInvalid ? 'checkout-phone-error' : undefined}
                required
              />
              {phoneInvalid && (
                <span className="form-field__error" id="checkout-phone-error">
                  {t('invalidPhone')}
                </span>
              )}
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
                <legend>{shop?.name ?? group.shopSlug} — {t('deliveryMethod')}</legend>
                {!shop && <p>{t('loadingFulfilment')}</p>}
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
                      <strong>{t('pickup')}</strong>
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
                      <strong>{t('delivery')}</strong>
                    </span>
                  </label>
                )}
                {shop && <ShopFulfilment shop={shop} method={methodFor(group.shopSlug)} />}
                {shop && methodFor(group.shopSlug) === 'pickup' && (
                  <PickupSlotPicker
                    shopName={shop.name}
                    state={pickupSchedules[group.shopSlug]}
                    selection={pickupSelections[group.shopSlug]}
                    onChange={(selection) =>
                      setPickupSelections((current) => ({
                        ...current,
                        [group.shopSlug]: selection,
                      }))
                    }
                  />
                )}
                {shop && !shop.pickupAvailable && !shop.deliveryAvailable && (
                  <p role="alert">{t('noFulfilment')}</p>
                )}
              </fieldset>
            )
          })}

          {anyDelivery && (
            <div className="delivery-address">
              {env.addressLookupEnabled && (
                <div className="form-grid address-lookup">
                  <label className="form-field">
                    {t('postcode')}
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
                    {t('houseNumber')}
                    <input
                      value={fields.houseNumber}
                      onChange={(event) => {
                        setLookupState('idle')
                        update('houseNumber', event.target.value)
                      }}
                    />
                  </label>
                  <label className="form-field">
                    {t('addition')}
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
                      {lookupState === 'loading' ? t('lookingUpAddress') : t('findAddress')}
                    </button>
                  </div>
                  {lookupState === 'not-found' && (
                    <p className="inline-note form-field--wide">
                      {t('addressLookupFailed')}
                    </p>
                  )}
                </div>
              )}
              <div className="form-grid">
                <label className="form-field form-field--wide">
                  {t('streetAndHouseNumber')}
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
                      {t('houseNumber')}
                      <input
                        value={fields.houseNumber}
                        onChange={(event) => update('houseNumber', event.target.value)}
                        required
                      />
                    </label>
                    <label className="form-field">
                      {t('postcode')}
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
                  {t('city')}
                  <input
                    autoComplete="address-level2"
                    value={fields.city}
                    onChange={(event) => update('city', event.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  {t('country')}
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
            {t('notesToSeller')}
            <textarea
              rows={4}
              value={fields.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder={t('notesPlaceholder')}
            />
          </label>
        </section>

        <aside className="checkout-order">
          <h2>{t('orderSummary')}</h2>
          {isMultiShop && (
            <p className="inline-note checkout-multi-shop-note">
              {t('eachShopSeparate', { count: shopGroupsWithFees.length })}
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
                      {hasSellingFormatDetails(product)
                        ? describeQuantity(product, quantity)
                        : quantity}{' '}
                      × {formatPrice(product.price, product.currency)}
                    </span>
                    <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
                  </div>
                ))}
                {Number(shop?.minimumOrderAmount ?? 0) > 0 && (
                  <div className="shop-minimum">
                    <span>
                      {t('minimumOrder')} {formatPrice(Number(shop?.minimumOrderAmount), currency)}
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
                        {t('moreRequired')}
                      </p>
                    )}
                  </div>
                )}
                {methodFor(group.shopSlug) === 'pickup' && (
                  <PickupSummary
                    shop={shop}
                    leadTimeHours={scheduleFor(group.shopSlug)?.requiredLeadTimeHours ?? 0}
                    selected={selectedSlotFor(group.shopSlug)}
                  />
                )}
                {isMultiShop && (
                  <>
                    <div className="checkout-total checkout-total--subtotal">
                      <span>{t('shopSubtotal')}</span>
                      <strong>{formatPrice(group.subtotal, currency)}</strong>
                    </div>
                    <div className="checkout-total checkout-total--delivery">
                      <span>{t('deliveryMethod')}</span>
                      <strong>
                        {methodFor(group.shopSlug) === 'pickup' ? t('pickup') : t('delivery')}
                      </strong>
                    </div>
                    <div className="checkout-total checkout-total--delivery">
                      <span>{t('deliveryFee')}</span>
                      <strong>
                        {methodFor(group.shopSlug) === 'pickup' || group.deliveryFee === 0
                          ? t('free')
                          : formatPrice(group.deliveryFee, currency)}
                      </strong>
                    </div>
                    <div className="checkout-total checkout-total--shop-total">
                      <span>{t('shopTotal')}</span>
                      <strong>{formatPrice(group.subtotal + group.deliveryFee, currency)}</strong>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          <div className="checkout-total checkout-total--subtotal">
            <span>{t('subtotalInclVat')}</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <div className="checkout-total checkout-total--delivery">
            <span>{t('deliveryFee')}</span>
            <strong>
              {estimatedDeliveryFee > 0 ? formatPrice(estimatedDeliveryFee, currency) : t('free')}
            </strong>
          </div>
          <div className="checkout-total">
            <span>{isMultiShop ? t('grandTotal') : t('estimatedTotal')}</span>
            <strong>{formatPrice(estimatedTotal, currency)}</strong>
          </div>
          <InclusiveVat
            currency={currency}
            breakdown={vatPreview(
              items,
              shopsBySlug,
              shopGroupsWithFees.map((group) => ({
                shopSlug: group.shopSlug,
                amount: String(group.deliveryFee),
              })),
            )}
          />
          <p className="checkout-total-note">{t('finalDeliveryFee')}</p>
          <label className="terms-check">
            <input
              type="checkbox"
              checked={fields.termsAccepted}
              onChange={(event) => update('termsAccepted', event.target.checked)}
              required
            />
            <span>
              {t('termsAgree')}{' '}
              <a href={env.termsUrl} target="_blank" rel="noreferrer">
                {t('termsAndConditions')}
              </a>{' '}
              {t('and')}{' '}
              <a href={env.privacyUrl} target="_blank" rel="noreferrer">
                {t('privacyPolicy')}
              </a>{' '}
              {t('termsSuffix')} <span aria-hidden="true">*</span>
            </span>
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {errorCode === 'ACCOUNT_ALREADY_EXISTS' && (
            <a className="button button--wide" href={env.loginUrlWithNext('/checkout')}>
              {t('logInContinue')}
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
            {submitting ? t('sendingOrder') : t('submitOrder')}
          </button>
          <Link className="checkout-back" to="/cart">
            ← {t('backToCart')}
          </Link>
          <Link className="checkout-back checkout-continue-shopping" to={continueShoppingLink}>
            ← {t('continueShopping')}
          </Link>
        </aside>
      </form>
    </main>
  )
}

function PickupSlotPicker({
  shopName,
  state,
  selection,
  onChange,
}: {
  shopName: string
  state: ReturnType<typeof usePickupSchedules>[string] | undefined
  selection: { date: string; start: string } | undefined
  onChange: (selection: { date: string; start: string }) => void
}) {
  const { t, i18n } = useTranslation()
  if (!state) return null
  if (state.error) return <p className="inline-note">{t('orderRequestFailed')}</p>
  const schedule = state.schedule
  if (!schedule) return state.loading ? <p className="inline-note">{t('loadingPickupTimes')}</p> : null
  if (!schedule.schedulingEnabled) return null
  const lead = formatLeadTime(schedule.requiredLeadTimeHours)
  if (schedule.days.length === 0) {
    return (
      <p role="alert">
        {t('noPickupTimes', { shop: shopName })}
      </p>
    )
  }
  const day = schedule.days.find((candidate) => candidate.date === selection?.date)
  return (
    <div className="pickup-slot-picker">
      {lead && (
        <p className="inline-note" data-testid="required-preparation">
          {t('requiredPreparation')} {lead}
        </p>
      )}
      <div className="form-grid">
        <label className="form-field">
          {t('pickupDate')}
          <select
            value={selection?.date ?? ''}
            onChange={(event) => onChange({ date: event.target.value, start: '' })}
            required
          >
            <option value="" disabled>
              {t('chooseDate')}
            </option>
            {schedule.days.map((candidate) => (
              <option key={candidate.date} value={candidate.date}>
                {new Date(`${candidate.date}T00:00:00`).toLocaleDateString(
                  i18n.language === 'nl' ? 'nl-NL' : 'en-GB',
                  { weekday: 'long', day: 'numeric', month: 'long' },
                )}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          {t('pickupTime')}
          <select
            value={selection?.start ?? ''}
            onChange={(event) =>
              onChange({ date: selection?.date ?? '', start: event.target.value })
            }
            disabled={!day}
            required
          >
            <option value="" disabled>
              {t('chooseTime')}
            </option>
            {day?.slots.map((slot) => (
              <option key={slot.start} value={slot.start}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

function PickupSummary({
  shop,
  leadTimeHours,
  selected,
}: {
  shop: Shop | undefined
  leadTimeHours: number
  selected: { day: { label: string; date: string }; slot: { label: string } } | null
}) {
  const { t, i18n } = useTranslation()
  const selectedDateValue = selected ? new Date(`${selected.day.date}T00:00:00`) : null
  const dateLocale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB'
  const selectedDate = selectedDateValue
    ? `${selectedDateValue.toLocaleDateString(dateLocale, { weekday: 'long' })} ${selectedDateValue.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : ''
  const address = shop?.pickupAddress
    ? [
        shop.pickupAddress.addressLine1,
        shop.pickupAddress.addressLine2,
        [shop.pickupAddress.postalCode, shop.pickupAddress.city].filter(Boolean).join(' '),
        shop.pickupAddress.country,
      ]
        .filter(Boolean)
        .join(', ')
    : ''
  if (!selected && !address && leadTimeHours <= 0) return null
  return (
    <div className="checkout-pickup-summary" data-testid="checkout-pickup-summary">
      {selected && (
        <p>
          <strong>{t('pickup')}</strong> {selectedDate}, {selected.slot.label}
        </p>
      )}
      {address && (
        <p>
          <strong>{t('pickupLocation')}</strong> {address}
        </p>
      )}
      {leadTimeHours > 0 && (
        <p>
          <strong>{t('preparationRequirement')}</strong> {formatLeadTime(leadTimeHours)}
        </p>
      )}
    </div>
  )
}
