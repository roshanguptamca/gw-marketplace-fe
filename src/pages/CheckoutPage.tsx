import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { env } from '../config/env'
import { EmptyState } from '../components/EmptyState'
import { marketplaceService } from '../services/marketplaceService'
import type { OrderConfirmation, OrderRequest } from '../types/marketplace'
import { formatPrice } from '../utils/shopLinks'

interface CheckoutFields {
  fullName: string
  email: string
  phone: string
  deliveryMethod: 'pickup' | 'delivery'
  street: string
  postalCode: string
  city: string
  notes: string
  termsAccepted: boolean
}

const initialFields: CheckoutFields = {
  fullName: '',
  email: '',
  phone: '',
  deliveryMethod: 'pickup',
  street: '',
  postalCode: '',
  city: '',
  notes: '',
  termsAccepted: false,
}

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const [fields, setFields] = useState(initialFields)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmations, setConfirmations] = useState<OrderConfirmation[]>([])
  const currency = items[0]?.product.currency ?? 'EUR'

  const update = <Key extends keyof CheckoutFields>(key: Key, value: CheckoutFields[Key]) => {
    setFields((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
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
          ? [fields.street, fields.postalCode, fields.city].filter(Boolean).join(', ')
          : ''
      const requests = [...groups.entries()].map(([shopId, shopItems]) => {
        const order: OrderRequest = {
          shop_id: Number(shopId),
          customer_name: fields.fullName,
          customer_email: fields.email,
          customer_phone: fields.phone,
          delivery_address: deliveryAddress,
          order_type: fields.deliveryMethod,
          customer_note: fields.notes,
          payment_method: 'cash',
          terms_accepted: true,
          items: shopItems.map((item) => ({
            product_id: Number(item.product.id),
            quantity: item.quantity,
          })),
        }
        return marketplaceService.createOrderRequest(order)
      })
      const created = await Promise.all(requests)
      setConfirmations(created)
      clearCart()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The order request could not be sent.')
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
          <a className="button" href={`${env.mainFrontendUrl}/#buyer-dashboard`}>
            View order
          </a>
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
            <div className="form-grid delivery-address">
              <label className="form-field form-field--wide">
                Street and house number
                <input
                  autoComplete="street-address"
                  value={fields.street}
                  onChange={(event) => update('street', event.target.value)}
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
              <label className="form-field">
                City
                <input
                  autoComplete="address-level2"
                  value={fields.city}
                  onChange={(event) => update('city', event.target.value)}
                  required
                />
              </label>
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
          <div className="checkout-total">
            <span>Total before seller-confirmed fees</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <label className="terms-check">
            <input
              type="checkbox"
              checked={fields.termsAccepted}
              onChange={(event) => update('termsAccepted', event.target.checked)}
              required
            />
            I confirm these order details and understand no payment is collected now.
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
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
