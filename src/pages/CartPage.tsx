import { Link } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { EmptyState } from '../components/EmptyState'
import { formatPrice } from '../utils/shopLinks'

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart()

  if (items.length === 0) {
    return (
      <main className="page-shell section">
        <EmptyState
          title="Your cart is empty"
          message="Explore independent shops and find something worth keeping."
          action={
            <Link className="button" to="/">
              Browse shops
            </Link>
          }
        />
      </main>
    )
  }

  const currency = items[0].product.currency

  return (
    <main className="page-shell section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your selection</p>
          <h1>Shopping cart</h1>
        </div>
        <p>{items.length} unique items</p>
      </div>
      <div className="cart-layout">
        <section className="cart-items" aria-label="Cart items">
          {items.map(({ product, quantity }) => (
            <article className="cart-item" key={product.id}>
              <img src={product.images[0]} alt={product.name} />
              <div className="cart-item__details">
                <p className="eyebrow">{product.shopSlug}</p>
                <h2>{product.name}</h2>
                <p>{formatPrice(product.price, product.currency)}</p>
                <button className="text-button" onClick={() => removeItem(product.id)}>
                  Remove
                </button>
              </div>
              <label className="quantity">
                <span>Quantity</span>
                <select
                  value={quantity}
                  onChange={(event) => updateQuantity(product.id, Number(event.target.value))}
                >
                  {Array.from({ length: Math.min(product.stock, 10) }, (_, index) => index + 1).map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
            </article>
          ))}
        </section>
        <aside className="order-summary">
          <h2>Order summary</h2>
          <div>
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <p>Taxes, shipping and seller-specific delivery options are confirmed next.</p>
          <Link className="button button--wide" to="/checkout">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </main>
  )
}
