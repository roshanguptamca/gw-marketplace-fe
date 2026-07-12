import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCart } from '../cart/CartContext'
import type { Product } from '../types/marketplace'
import { formatPrice, shopPath } from '../utils/shopLinks'

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation()
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const location = useLocation()
  const href = shopPath(product.shopSlug, `/products/${product.id}`)
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  return (
    <article className="product-card">
      <Link
        to={href}
        state={{ returnTo }}
        className="product-card__image-link"
        aria-label={`View ${product.name}`}
      >
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        {product.featured && <span className="product-card__badge">Featured</span>}
      </Link>
      <div className="product-card__body">
        <p className="product-card__category">{product.category}</p>
        <h3>
          <Link to={href} state={{ returnTo }}>
            {product.name}
          </Link>
        </h3>
        <div className="product-card__footer">
          <strong>{formatPrice(product.price, product.currency)}</strong>
          <button
            className="icon-button"
            disabled={product.stock === 0}
            onClick={handleAdd}
            aria-label={
              product.stock === 0
                ? `${product.name} is out of stock`
                : `${t('addToCart')}: ${product.name}`
            }
          >
            {product.stock === 0 ? '—' : added ? '✓' : '+'}
          </button>
        </div>
        <span className="product-card__feedback" aria-live="polite">
          {added ? 'Added to cart' : ''}
        </span>
        <p className={product.stock > 0 ? 'stock stock--available' : 'stock stock--unavailable'}>
          {product.stock > 0 ? `${product.stock} in stock` : t('outOfStock')}
        </p>
      </div>
    </article>
  )
}
