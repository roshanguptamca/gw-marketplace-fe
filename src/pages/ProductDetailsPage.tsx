import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { analytics } from '../analytics/analytics'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CartCallToAction } from '../components/CartCallToAction'
import { MarketplaceBackNavigation } from '../components/MarketplaceBackNavigation'
import { useCart } from '../cart/CartContext'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { formatPrice, shopPath } from '../utils/shopLinks'
import { getProductImageUrl, handleProductImageError } from '../utils/productImages'
import {
  effectiveMinimumQuantity,
  hasSellingFormatDetails,
  orderingRuleLines,
  physicalTotalLabel,
  sellingFormatLabel,
  sellingUnitOf,
} from '../utils/productUnits'
import { ErrorPage } from './ErrorPage'
import { localizedText } from '../utils/localizedText'

export function ProductDetailsPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const { t, i18n } = useTranslation()
  const params = useParams()
  const location = useLocation()
  const shopSlug = resolvedSlug ?? params.shopSlug ?? ''
  const productId = params.productId ?? ''
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null)
  const { addItem } = useCart()
  const {
    data: product,
    loading,
    error,
  } = useMarketplaceData(
    () => marketplaceService.getProductDetails(shopSlug, productId),
    [shopSlug, productId],
  )
  useEffect(() => {
    if (product)
      analytics.event('view_item', {
        item_id: product.id,
        value: product.price,
        currency: product.currency,
        items: [{ item_id: product.id, quantity: 1, price: product.price }],
      })
  }, [product])

  if (loading) return <LoadingState label={t('loadingProduct')} />
  if (error || !product) {
    return <ErrorPage title={t('productNotFound')} message={t('productUnavailable')} />
  }
  const backTo = (location.state as { returnTo?: string } | undefined)?.returnTo
  const minimumQuantity = effectiveMinimumQuantity(product)
  const maximumQuantity = Math.max(minimumQuantity, product.stock)
  const quantity = Math.min(
    Math.max(selectedQuantity ?? minimumQuantity, minimumQuantity),
    maximumQuantity,
  )
  const formatLabel = hasSellingFormatDetails(product) ? sellingFormatLabel(product) : ''
  const physicalTotal = physicalTotalLabel(product, quantity)
  const ruleLines = orderingRuleLines(product, (value) => formatPrice(value, product.currency))
  const unitWord = sellingUnitOf(product) === 'PACK' ? 'pack' : ''
  const description = localizedText(product.description, product.translations, 'description', i18n.language)
  const ingredients = localizedText(product.ingredients, product.translations, 'ingredients', i18n.language)
  const allergens = localizedText(product.allergens, product.translations, 'allergens', i18n.language)

  const handleAdd = () => {
    addItem(product, quantity)
    analytics.event('add_to_cart', {
      item_id: product.id,
      value: product.price * quantity,
      currency: product.currency,
      items: [{ item_id: product.id, quantity, price: product.price }],
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  const detailSections = [
    ingredients
      ? { label: t('ingredients'), value: ingredients, testId: 'product-ingredients' }
      : null,
    allergens
      ? { label: t('allergens'), value: allergens, testId: 'product-allergens' }
      : null,
  ].filter(
    (section): section is { label: string; value: string; testId: string } => section !== null,
  )

  return (
    <main className="page-shell section">
      <MarketplaceBackNavigation
        items={[
          { label: t('marketplace'), path: '/' },
          { label: product.shopName ?? shopSlug, path: shopPath(shopSlug) },
          { label: product.name, path: '', current: true },
        ]}
        backLabel={t('backToProducts')}
        backTo={backTo ?? shopPath(shopSlug, '/products')}
      />
      <CartCallToAction />
      <div className="product-detail">
        <div className="gallery">
          <div className="gallery__main">
            <img
              src={getProductImageUrl(product.images[selectedImage])}
              alt={product.name}
              onError={handleProductImageError}
            />
          </div>
          {product.images.length > 1 && (
            <div className="gallery__thumbs" aria-label="Product images">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  className={selectedImage === index ? 'active' : ''}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Show image ${index + 1}`}
                >
                  <img src={image} alt="" onError={handleProductImageError} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          {formatLabel && (
            <p className="product-info__format" data-testid="product-selling-format">
              {unitWord ? `${formatLabel} per ${unitWord}` : formatLabel}
            </p>
          )}
          <p className="product-info__price">
            {formatPrice(product.price, product.currency)}
            {unitWord ? ` per ${unitWord}` : ''}
          </p>
          {ruleLines.length > 0 && (
            <ul className="product-rules" data-testid="product-ordering-rules">
              {ruleLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <p className="product-info__description">{description}</p>
          <div className="product-info__stock">
            <span className={product.stock > 0 ? 'status-dot' : 'status-dot status-dot--empty'} />
            {product.stock > 0
              ? t('available', { count: product.stock })
              : t('currentlyOutOfStock')}
          </div>
          {added ? (
            <div className="add-to-cart-success">
              <p className="success-message">✓ {t('addedToCart')}</p>
              <div className="action-buttons">
                <button className="button button--secondary" onClick={() => setAdded(false)}>
                  {t('continueShopping')}
                </button>
                <Link className="button button--primary" to="/cart">
                  {t('viewCart')}
                </Link>
                <Link className="button button--primary" to="/checkout">
                  {t('checkout')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              {product.stock > 0 && (
                <div className="quantity-stepper"                 aria-label={t('quantity')}>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= minimumQuantity}
                    onClick={() => setSelectedQuantity(quantity - 1)}
                  >
                    −
                  </button>
                  <output aria-live="polite" data-testid="product-quantity">
                    {quantity}
                  </output>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Increase quantity"
                    disabled={quantity >= maximumQuantity}
                    onClick={() => setSelectedQuantity(quantity + 1)}
                  >
                    +
                  </button>
                  <div className="quantity-stepper__summary">
                    {physicalTotal && (
                      <span data-testid="product-physical-total">{physicalTotal}</span>
                    )}
                    <strong data-testid="product-line-total">
                      {formatPrice(product.price * quantity, product.currency)}
                    </strong>
                  </div>
                </div>
              )}
              {product.stock > 0 && product.stock < minimumQuantity && (
                <p className="inline-note" role="alert">
                  Not enough stock to meet this product&apos;s minimum order.
                </p>
              )}
              <button
                className="button button--wide"
                disabled={product.stock === 0 || product.stock < minimumQuantity}
                onClick={handleAdd}
              >
                {product.stock === 0 ? t('outOfStock') : t('addToCartLabel')}
              </button>
            </>
          )}
          <div className="product-notes">
            <p>
              <strong>{t('secureCheckout')}</strong>
              {t('paymentProtected')}
            </p>
            <p>
              <strong>{t('independentSeller')}</strong>
              {t('fulfilledBy', { shop: product.shopName ?? product.shopSlug })}
            </p>
          </div>
          {detailSections.length > 0 && (
            <div className="product-details-panels">
              {detailSections.map((section) => (
                <article key={section.label} className="product-details-panel">
                  <p className="eyebrow">{section.label}</p>
                  <p data-testid={section.testId}>{section.value}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
