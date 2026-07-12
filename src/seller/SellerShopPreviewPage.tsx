import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { Shop } from '../types/marketplace'

export function SellerShopPreviewPage() {
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadShop = async () => {
      try {
        const data = await marketplaceService.getSellerShop()
        setShop(data)
      } catch {
        setError('Failed to load shop information.')
      } finally {
        setLoading(false)
      }
    }

    void loadShop()
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
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Public Shop Preview</h2>
          <p className="muted">View how your shop appears to customers.</p>
        </div>
      </div>

      <div className="seller-preview-card">
        <div>
          <p className="form-hint">Shop name: {shop.name}</p>
          <p className="form-hint">Public URL: {publicShopUrl}</p>
        </div>

        <div className="seller-preview-actions">
          <a
            href={publicShopUrl}
            className="button button--primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Public Shop
          </a>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}${publicShopUrl}`)}
          >
            Copy URL
          </button>
        </div>
      </div>

      <div className="info-box">
        <h4>Pre-launch checklist</h4>
        <ul>
          <li>Shop details are complete</li>
          <li>Logo and banner are uploaded</li>
          <li>Opening hours are published</li>
          <li>Delivery and pickup settings are saved</li>
        </ul>
      </div>
    </section>
  )
}
