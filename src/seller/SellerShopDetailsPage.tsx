import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { Shop } from '../types/marketplace'

interface ShopDetailsForm {
  name: string
  slug: string
  description: string
  shortDescription: string
  shopType: string
  phone: string
  email: string
  websiteUrl: string
  socialLinksText: string
  address: string
  city: string
  postalCode: string
  country: string
  active: boolean
  approved: boolean
}

function mapShopToForm(shop: Shop): ShopDetailsForm {
  return {
    name: shop.name,
    slug: shop.slug,
    description: shop.description,
    shortDescription: shop.shortDescription || '',
    shopType: shop.shopType || '',
    phone: shop.phone || '',
    email: shop.email || shop.contactEmail || '',
    websiteUrl: shop.websiteUrl || '',
    socialLinksText: (shop.socialLinks || []).join('\n'),
    address: shop.address || '',
    city: shop.location || '',
    postalCode: shop.postalCode || '',
    country: shop.country || '',
    active: shop.active !== false,
    approved: shop.approved === true,
  }
}

export function SellerShopDetailsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [formData, setFormData] = useState<ShopDetailsForm | null>(null)

  useEffect(() => {
    const loadShopDetails = async () => {
      try {
        setLoading(true)
        const data = await marketplaceService.getSellerShop()
        setShop(data)
        setFormData(mapShopToForm(data))
      } catch {
        setError('Failed to load shop details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    void loadShopDetails()
  }, [])

  const socialLinks = useMemo(
    () =>
      (formData?.socialLinksText || '')
        .split('\n')
        .map((link) => link.trim())
        .filter(Boolean),
    [formData?.socialLinksText],
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => (prev ? { ...prev, [name]: finalValue } : prev))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await marketplaceService.updateSellerShop({
        name: formData.name,
        description: formData.description,
        short_description: formData.shortDescription,
        shop_type: formData.shopType,
        phone: formData.phone,
        email: formData.email,
        website_url: formData.websiteUrl,
        social_links: socialLinks,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country,
        is_active: formData.active,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save shop details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading shop details" />

  if (!formData || !shop) {
    return <div className="alert alert--error">{error || 'Shop details could not be loaded.'}</div>
  }

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Shop Details</h2>
          <p className="muted">Manage your shop name, contact details, and public profile.</p>
        </div>
        <div className="seller-page-status">
          <span className={shop.active ? 'status-pill status-pill--success' : 'status-pill'}>
            {shop.active ? 'Active' : 'Paused'}
          </span>
          <span className="status-pill status-pill--muted">
            {shop.approved ? 'Approved by admin' : 'Awaiting admin approval'}
          </span>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Shop details saved successfully</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Shop Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="slug">Shop Slug</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                disabled
                className="form-input form-input--disabled"
              />
              <p className="form-hint">Slug changes are controlled by GuideWisey admin.</p>
            </div>

            <div className="form-group">
              <label htmlFor="shopType">Shop Category / Type</label>
              <input
                type="text"
                id="shopType"
                name="shopType"
                value={formData.shopType}
                onChange={handleChange}
                placeholder="Bakery, Coffee, Handmade, Services..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="shortDescription">Short Description</label>
              <input
                type="text"
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="One-line description customers see in cards"
                maxLength={240}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Full Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Contact and Location</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="websiteUrl">Website / Social URL</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="postalCode">Postal Code</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="socialLinksText">Social links</label>
            <textarea
              id="socialLinksText"
              name="socialLinksText"
              value={formData.socialLinksText}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder="One URL per line"
            />
            <p className="form-hint">Optional public links for Instagram, Facebook, WhatsApp, or your website.</p>
          </div>
        </div>

        <div className="form-section">
          <h3>Public Status</h3>
          <label className="seller-toggle">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
            />
            <span>Shop is active and visible to customers</span>
          </label>
          <p className="form-hint">
            Admin approval remains separate. Sellers can pause visibility, but cannot approve their own shop.
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button--primary">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  )
}
