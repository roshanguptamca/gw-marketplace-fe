import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'

interface ShopInfo {
  slug: string
  name: string
}

export function SellerShopPreviewPage() {
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadShop = async () => {
      try {
        setLoading(true)
        // TODO: Fetch shop info from API
        // const response = await fetch('/api/seller/shop')
        // const data = await response.json()
        // setShop(data)

        // For development, use dummy data
        setShop({
          slug: 'sourdough-bread-nl',
          name: 'Sourdough Bread NL',
        })
      } catch (err) {
        setError('Failed to load shop information.')
      } finally {
        setLoading(false)
      }
    }

    loadShop()
  }, [])

  if (loading) return <LoadingState label="Loading shop information" />

  if (error || !shop) {
    return (
      <div>
        <div className="seller-page-header">
          <h2>Public Shop Preview</h2>
        </div>
        <div className="alert alert--error">{error || 'Shop not found'}</div>
      </div>
    )
  }

  const publicShopUrl = `/shop/${shop.slug}`

  return (
    <div>
      <div className="seller-page-header">
        <h2>Public Shop Preview</h2>
        <p className="muted">View how your shop appears to customers</p>
      </div>

      <div className="form-section" style={{ marginBottom: '20px' }}>
        <div className="preview-info">
          <h3>Your Public Shop</h3>
          <p className="form-hint">Shop Name: {shop.name}</p>
          <p className="form-hint">URL: {publicShopUrl}</p>

          <div style={{ marginTop: '24px' }}>
            <a href={publicShopUrl} className="button button--primary" target="_blank" rel="noopener noreferrer">
              View Public Shop →
            </a>
            <p className="form-hint" style={{ marginTop: '12px' }}>
              Opens in a new tab
            </p>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Share Your Shop</h3>
        <p>
          Share your public shop URL with customers to start receiving orders on GuideWisey
          marketplace.
        </p>

        <div className="share-section">
          <div className="share-url">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}${publicShopUrl}`}
              className="form-input"
            />
            <button
              className="button button--secondary"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}${publicShopUrl}`,
                )
                alert('URL copied to clipboard!')
              }}
            >
              Copy URL
            </button>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h4>✨ Checklist</h4>
        <p>Before sharing your shop, make sure you have completed:</p>
        <ul>
          <li>✓ Shop Details (name, description, location)</li>
          <li>✓ Logo & Banner images</li>
          <li>✓ Contact Information</li>
          <li>✓ At least one product listed</li>
          <li>✓ Delivery or Pickup configuration</li>
          <li>✓ Opening Hours</li>
        </ul>
      </div>
    </div>
  )
}
