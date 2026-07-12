import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { Shop } from '../types/marketplace'
import { getShopBannerUrl, getShopLogoUrl } from '../utils/shopImages'

type UploadTarget = 'logo' | 'banner'

export function SellerShopLogoBannerPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<UploadTarget | 'remove-logo' | 'remove-banner' | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadShop = async () => {
      try {
        setLoading(true)
        const data = await marketplaceService.getSellerShop()
        setShop(data)
      } catch {
        setError('Failed to load shop images.')
      } finally {
        setLoading(false)
      }
    }

    void loadShop()
  }, [])

  const uploadImage = async (file: File, type: UploadTarget) => {
    if (file.size > (type === 'logo' ? 2 : 5) * 1024 * 1024) {
      setError(`Image must be smaller than ${type === 'logo' ? '2MB' : '5MB'}.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }

    const formData = new FormData()
    formData.append(type === 'logo' ? 'logo' : 'banner_image', file)
    setSaving(type)
    setError(null)
    setSuccess(null)

    try {
      const updated = await marketplaceService.updateSellerShopForm(formData)
      setShop(updated)
      setSuccess(`${type === 'logo' ? 'Logo' : 'Banner'} updated successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError(`Failed to upload ${type}. Please try again.`)
    } finally {
      setSaving(null)
    }
  }

  const removeImage = async (type: UploadTarget) => {
    if (!window.confirm(`Are you sure you want to remove the ${type}?`)) return

    const formData = new FormData()
    formData.append(type === 'logo' ? 'remove_logo' : 'remove_banner', 'true')
    setSaving(type === 'logo' ? 'remove-logo' : 'remove-banner')
    setError(null)
    setSuccess(null)

    try {
      const updated = await marketplaceService.updateSellerShopForm(formData)
      setShop(updated)
      setSuccess(`${type === 'logo' ? 'Logo' : 'Banner'} removed`)
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError(`Failed to remove ${type}. Please try again.`)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <LoadingState label="Loading images" />

  if (!shop) {
    return <div className="alert alert--error">{error || 'Shop images could not be loaded.'}</div>
  }

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Logo & Banner</h2>
          <p className="muted">Upload and manage your shop logo and banner images.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ {success}</div>}

      <div className="seller-images-grid">
        <article className="seller-image-card">
          <h3>Shop Logo</h3>
          <p className="form-hint">Recommended size: 200x200px, PNG or JPEG.</p>
          <div className="image-upload-area">
            <div className="image-preview image-preview--square">
              <img
                src={getShopLogoUrl(shop.logoUrl)}
                alt={shop.name ? `${shop.name} logo` : 'Shop logo'}
              />
            </div>
            <label className="upload-button">
              <span>{saving === 'logo' ? 'Uploading...' : 'Choose image'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadImage(file, 'logo')
                }}
                disabled={saving !== null}
                style={{ display: 'none' }}
              />
            </label>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void removeImage('logo')}
                disabled={saving !== null || !shop.logoPublicId}
              >
                Remove
              </button>
          </div>
        </article>

        <article className="seller-image-card">
          <h3>Shop Banner</h3>
          <p className="form-hint">Recommended size: 1200x300px, PNG or JPEG.</p>
          <div className="image-upload-area">
            <div className="image-preview image-preview--wide">
              <img
                src={getShopBannerUrl(shop.bannerUrl)}
                alt={shop.name ? `${shop.name} banner` : 'Shop banner'}
              />
            </div>
            <label className="upload-button">
              <span>{saving === 'banner' ? 'Uploading...' : 'Choose image'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadImage(file, 'banner')
                }}
                disabled={saving !== null}
                style={{ display: 'none' }}
              />
            </label>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void removeImage('banner')}
                disabled={saving !== null || !shop.bannerPublicId}
              >
                Remove
              </button>
          </div>
        </article>
      </div>

      <div className="image-upload-info">
        <h4>Cloudinary upload rules</h4>
        <ul>
          <li>Images are uploaded through the existing Cloudinary backend service.</li>
          <li>Logo files are limited to 2MB.</li>
          <li>Banner files are limited to 5MB.</li>
          <li>PNG, JPEG, and WebP are accepted.</li>
        </ul>
      </div>
    </section>
  )
}
