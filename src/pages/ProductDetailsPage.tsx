import { useEffect, useState } from 'react'
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

export function ProductDetailsPage({ resolvedSlug }: { resolvedSlug?: string }) {
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

  if (loading) return <LoadingState label="Loading product" />
  if (error || !product) {
    return (
      <ErrorPage title="Product not found" message="This product may no longer be available." />
    )
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
    product.ingredients
      ? { label: 'Ingredients', value: product.ingredients, testId: 'product-ingredients' }
      : null,
    product.allergens
      ? { label: 'Allergens', value: product.allergens, testId: 'product-allergens' }
      : null,
  ].filter(
    (section): section is { label: string; value: string; testId: string } => section !== null,
  )

  return (
    <main className="page-shell section">
      <MarketplaceBackNavigation
        items={[
          { label: 'Marketplace', path: '/' },
          { label: product.shopName ?? shopSlug, path: shopPath(shopSlug) },
          { label: product.name, path: '', current: true },
        ]}
        backLabel="Back to all products"
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
          <p className="product-info__description">{product.description}</p>
          <div className="product-info__stock">
            <span className={product.stock > 0 ? 'status-dot' : 'status-dot status-dot--empty'} />
            {product.stock > 0 ? `${product.stock} available` : 'Currently out of stock'}
          </div>
          {added ? (
            <div className="add-to-cart-success">
              <p className="success-message">✓ Added to cart</p>
              <div className="action-buttons">
                <button className="button button--secondary" onClick={() => setAdded(false)}>
                  Continue Shopping
                </button>
                <Link className="button button--primary" to="/cart">
                  View Cart
                </Link>
                <Link className="button button--primary" to="/checkout">
                  Checkout
                </Link>
              </div>
            </div>
          ) : (
            <>
              {product.stock > 0 && (
                <div className="quantity-stepper" aria-label="Quantity">
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
                {product.stock === 0 ? 'Out of stock' : 'Add to cart'}
              </button>
            </>
          )}
          <div className="product-notes">
            <p>
              <strong>Secure checkout</strong>
              Your payment details are protected.
            </p>
            <p>
              <strong>Independent seller</strong>
              Fulfilled directly by {product.shopSlug}.
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
