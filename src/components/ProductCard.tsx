import { useState } from 'react'
import { analytics } from '../analytics/analytics'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCart } from '../cart/CartContext'
import type { Product } from '../types/marketplace'
import { formatPrice, shopPath } from '../utils/shopLinks'
import { getFirstProductImageUrl, handleProductImageError } from '../utils/productImages'
import {
  effectiveMinimumQuantity,
  hasSellingFormatDetails,
  sellingFormatLabel,
} from '../utils/productUnits'

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation()
  const { addItem, items } = useCart()
  const [added, setAdded] = useState(false)
  const location = useLocation()
  const href = shopPath(product.shopSlug, `/products/${product.id}`)
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  const formatLabel = hasSellingFormatDetails(product) ? sellingFormatLabel(product) : ''
  const minimumQuantity = effectiveMinimumQuantity(product)
  const handleAdd = () => {
    const addedQuantity = items.some((item) => item.product.id === product.id) ? 1 : minimumQuantity
    addItem(product)
    analytics.event('add_to_cart', {
      item_id: product.id,
      value: product.price,
      currency: product.currency,
      items: [{ item_id: product.id, quantity: addedQuantity, price: product.price }],
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  return (
    <article className="product-card">
      <Link
        to={href}
        state={{ returnTo }}
        className="product-card__image-link"
        aria-label={t('viewProductAria', { name: product.name })}
      >
        <img
          src={getFirstProductImageUrl(product.images)}
          alt={product.name}
          loading="lazy"
          onError={handleProductImageError}
        />
        {product.featured && <span className="product-card__badge">{t('featured')}</span>}
      </Link>
      <div className="product-card__body">
        <p className="product-card__category">{product.category}</p>
        <h3>
          <Link to={href} state={{ returnTo }}>
            {product.name}
          </Link>
        </h3>
        {formatLabel && <p className="product-card__format">{formatLabel}</p>}
        <div className="product-card__footer">
          <strong>{formatPrice(product.price, product.currency)}</strong>
          <button
            className="icon-button"
            disabled={product.stock === 0}
            onClick={handleAdd}
            aria-label={
              product.stock === 0
                ? t('productOutOfStockAria', { name: product.name })
                : `${t('addToCart')}: ${product.name}`
            }
          >
            {product.stock === 0 ? '—' : added ? '✓' : '+'}
          </button>
        </div>
        <span className="product-card__feedback" aria-live="polite">
          {added ? t('addedToCart') : ''}
        </span>
        <p className={product.stock > 0 ? 'stock stock--available' : 'stock stock--unavailable'}>
          {product.stock > 0 ? t('inStock', { count: product.stock }) : t('outOfStock')}
        </p>
      </div>
    </article>
  )
}
