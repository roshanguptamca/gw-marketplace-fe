import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCart } from '../cart/CartContext'

/**
 * Persistent "go to cart" prompt shown while browsing products. Only renders
 * once the cart has at least one item; stays hidden for an empty cart so it
 * never dead-ends a shopper with nothing to check out.
 */
export function CartCallToAction() {
  const { t } = useTranslation()
  const { itemCount } = useCart()

  if (itemCount === 0) return null

  return (
    <div className="cart-cta" role="status">
      <span>{t('cartCtaItems', { count: itemCount })}</span>
      <Link className="button" to="/cart">
        {t('goToCart')}
      </Link>
    </div>
  )
}
