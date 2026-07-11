import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'

interface ShopImages {
  logoUrl?: string
  logoPublicId?: string
  bannerUrl?: string
  bannerPublicId?: string
}

export function SellerShopLogoBannerPage() {
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState<ShopImages>({})
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true)
        // TODO: Fetch shop images from API
        // const response = await fetch('/api/seller/shop/images')
        // const data = await response.json()
        // setImages(data)
        
        // For now, set dummy data
        setImages({
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1/sourdough-bread-nl/logo.png',
          bannerUrl:
            'https://res.cloudinary.com/demo/image/upload/v1/sourdough-bread-nl/banner.png',
        })
      } catch (err) {
        setError('Failed to load shop images.')
      } finally {
        setLoading(false)
      }
    }

    loadImages()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file')
      return
    }

    setUploading(type)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      // TODO: Upload to backend endpoint
      // const response = await fetch('/api/seller/shop/upload-image', {
      //   method: 'POST',
      //   body: formData,
      // })
      // const data = await response.json()
      // setImages(prev => ({
      //   ...prev,
      //   [`${type}Url`]: data.url,
      //   [`${type}PublicId`]: data.publicId,
      // }))

      // Simulate successful upload
      const reader = new FileReader()
      reader.onload = (event) => {
        setImages((prev) => ({
          ...prev,
          [`${type}Url`]: event.target?.result as string,
        }))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(`Failed to upload ${type}. Please try again.`)
    } finally {
      setUploading(null)
    }
  }

  const handleRemoveImage = async (type: 'logo' | 'banner') => {
    if (!confirm(`Are you sure you want to remove the ${type}?`)) return

    try {
      // TODO: Call API to remove image
      // const response = await fetch(`/api/seller/shop/remove-${type}`, {
      //   method: 'DELETE',
      // })

      setImages((prev) => ({
        ...prev,
        [`${type}Url`]: undefined,
        [`${type}PublicId`]: undefined,
      }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(`Failed to remove ${type}. Please try again.`)
    }
  }

  if (loading) return <LoadingState label="Loading images" />

  return (
    <div>
      <div className="seller-page-header">
        <h2>Logo & Banner</h2>
        <p className="muted">Upload and manage your shop logo and banner images</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Image updated successfully</div>}

      <div className="seller-images-grid">
        {/* Logo Section */}
        <div className="image-upload-section">
          <h3>Shop Logo</h3>
          <p className="form-hint">Recommended size: 200x200px, PNG or JPEG</p>

          <div className="image-upload-area">
            {images.logoUrl ? (
              <div className="image-preview">
                <img src={images.logoUrl} alt="Shop Logo" />
                <p>Current Logo</p>
              </div>
            ) : (
              <div className="image-placeholder">
                <p>No logo uploaded</p>
              </div>
            )}

            <label className="upload-button">
              <span>{uploading === 'logo' ? 'Uploading...' : 'Choose Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'logo')}
                disabled={uploading !== null}
                style={{ display: 'none' }}
              />
            </label>

            {images.logoUrl && (
              <button
                className="button button--danger button--small"
                onClick={() => handleRemoveImage('logo')}
                disabled={uploading !== null}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Banner Section */}
        <div className="image-upload-section">
          <h3>Shop Banner</h3>
          <p className="form-hint">Recommended size: 1200x300px, PNG or JPEG</p>

          <div className="image-upload-area">
            {images.bannerUrl ? (
              <div className="image-preview image-preview--wide">
                <img src={images.bannerUrl} alt="Shop Banner" />
                <p>Current Banner</p>
              </div>
            ) : (
              <div className="image-placeholder">
                <p>No banner uploaded</p>
              </div>
            )}

            <label className="upload-button">
              <span>{uploading === 'banner' ? 'Uploading...' : 'Choose Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'banner')}
                disabled={uploading !== null}
                style={{ display: 'none' }}
              />
            </label>

            {images.bannerUrl && (
              <button
                className="button button--danger button--small"
                onClick={() => handleRemoveImage('banner')}
                disabled={uploading !== null}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="image-upload-info">
        <h4>Image Upload Requirements</h4>
        <ul>
          <li>Maximum file size: 5MB</li>
          <li>Supported formats: PNG, JPEG, WebP</li>
          <li>Logo: Square (200x200px recommended)</li>
          <li>Banner: Wide format (1200x300px recommended)</li>
          <li>Images are hosted on Cloudinary CDN</li>
        </ul>
      </div>
    </div>
  )
}
