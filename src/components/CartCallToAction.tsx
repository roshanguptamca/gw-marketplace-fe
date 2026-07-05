import { Link } from 'react-router-dom'
import { useCart } from '../cart/CartContext'

/**
 * Persistent "go to cart" prompt shown while browsing products. Only renders
 * once the cart has at least one item; stays hidden for an empty cart so it
 * never dead-ends a shopper with nothing to check out.
 */
export function CartCallToAction() {
  const { itemCount } = useCart()

  if (itemCount === 0) return null

  return (
    <div className="cart-cta" role="status">
      <span>
        {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
      </span>
      <Link className="button" to="/cart">
        Go to cart →
      </Link>
    </div>
  )
}
