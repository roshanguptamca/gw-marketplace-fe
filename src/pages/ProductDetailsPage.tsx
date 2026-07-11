import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumb } from '../components/Breadcrumb'
import { CartCallToAction } from '../components/CartCallToAction'
import { useCart } from '../cart/CartContext'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { formatPrice, shopPath } from '../utils/shopLinks'
import { ErrorPage } from './ErrorPage'

export function ProductDetailsPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const params = useParams()
  const shopSlug = resolvedSlug ?? params.shopSlug ?? ''
  const productId = params.productId ?? ''
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()
  const {
    data: product,
    loading,
    error,
  } = useMarketplaceData(
    () => marketplaceService.getProductDetails(shopSlug, productId),
    [shopSlug, productId],
  )

  if (loading) return <LoadingState label="Loading product" />
  if (error || !product) {
    return (
      <ErrorPage title="Product not found" message="This product may no longer be available." />
    )
  }

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <main className="page-shell section">
      <Breadcrumb
        items={[
          { label: 'Marketplace', path: '/' },
          { label: 'All Shops', path: '/marketplace/shops' },
          { label: product.shopName || shopSlug, path: shopPath(shopSlug) },
          { label: product.name, current: true },
        ]}
      />
      <Link className="back-link" to={shopPath(shopSlug, '/products')}>
        ← Back to all products
      </Link>
      <CartCallToAction />
      <div className="product-detail">
        <div className="gallery">
          <div className="gallery__main">
            <img src={product.images[selectedImage]} alt={product.name} />
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
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="product-info__price">{formatPrice(product.price, product.currency)}</p>
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
            <button
              className="button button--wide"
              disabled={product.stock === 0}
              onClick={handleAdd}
            >
              {product.stock === 0 ? 'Out of stock' : 'Add to cart'}
            </button>
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
        </div>
      </div>
    </main>
  )
}
