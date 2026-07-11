import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

interface ShopDetails {
  name: string
  slug: string
  description: string
  shortDescription: string
  category?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  isActive: boolean
}

export function SellerShopDetailsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<ShopDetails>({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    category: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    isActive: true,
  })

  useEffect(() => {
    const loadShopDetails = async () => {
      try {
        setLoading(true)
        // TODO: Fetch shop details from API
        // const response = await fetch('/api/seller/shop/details')
        // const data = await response.json()
        // setFormData(data)
        
        // For now, set dummy data for development
        setFormData({
          name: 'Sourdough Bread NL',
          slug: 'sourdough-bread-nl',
          description: 'Pure Sourdough Bread home baked with passion.',
          shortDescription: 'Premium handmade sourdough',
          category: 'Food & Beverages',
          phone: '+31 6 12345678',
          email: 'hello@sourdoughnl.com',
          website: 'https://sourdoughnl.com',
          address: 'Bakery Street 42',
          city: 'Rosmalen',
          postalCode: '5242 AA',
          country: 'Netherlands',
          isActive: true,
        })
      } catch (err) {
        setError('Failed to load shop details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadShopDetails()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // TODO: Send shop details to API
      // const response = await fetch('/api/seller/shop/details', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // })
      // if (!response.ok) throw new Error('Failed to save shop details')

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to save shop details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading shop details" />

  return (
    <div>
      <div className="seller-page-header">
        <h2>Shop Details</h2>
        <p className="muted">Manage your shop information and location</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Shop details saved successfully</div>}

      <form onSubmit={handleSubmit} className="seller-form">
        <div className="form-section">
          <h3>Basic Information</h3>

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
            <label htmlFor="slug">Shop Slug (Read-only)</label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              disabled
              className="form-input form-input--disabled"
              title="Contact admin to change your shop slug"
            />
            <p className="form-hint">Contact admin to change your shop slug</p>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">Select a category</option>
              <option value="food">Food & Beverages</option>
              <option value="crafts">Crafts & Handmade</option>
              <option value="clothing">Clothing & Accessories</option>
              <option value="home">Home & Garden</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="shortDescription">Short Description</label>
            <input
              type="text"
              id="shortDescription"
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              placeholder="A brief tagline for your shop"
              maxLength={100}
              className="form-input"
            />
            <p className="form-hint">{formData.shortDescription.length}/100 characters</p>
          </div>

          <div className="form-group">
            <label htmlFor="description">Full Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell customers about your shop, your products, and your story"
              rows={5}
              className="form-input"
            />
            <p className="form-hint">{formData.description.length} characters</p>
          </div>
        </div>

        <div className="form-section">
          <h3>Contact Information</h3>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

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
            <label htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Location</h3>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
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
              <label htmlFor="country">Country *</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="">Select a country</option>
                <option value="Netherlands">Netherlands</option>
                <option value="Belgium">Belgium</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Status</h3>

          <div className="form-group form-group--checkbox">
            <label htmlFor="isActive">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              Shop is active and accepting orders
            </label>
            <p className="form-hint">
              Uncheck to pause your shop temporarily. Shop approval is managed by GuideWisey admin only.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button--primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller')}
            className="button button--secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
