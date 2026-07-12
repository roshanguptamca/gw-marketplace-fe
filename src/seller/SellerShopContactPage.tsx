import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'

interface ContactInfo {
  email: string
  phone: string
  websiteUrl: string
  whatsappNumber: string
  address: string
  city: string
}

export function SellerShopContactPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<ContactInfo>({
    email: '',
    phone: '',
    websiteUrl: '',
    whatsappNumber: '',
    address: '',
    city: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await marketplaceService.getSellerShop()
        setFormData({
          email: data.email || data.contactEmail || '',
          phone: data.phone || data.contactPhone || '',
          websiteUrl: data.websiteUrl || '',
          whatsappNumber: data.whatsapp || '',
          address: data.address || '',
          city: data.location || '',
        })
      } catch {
        setError('Failed to load contact information.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await marketplaceService.updateSellerShop({
        email: formData.email,
        phone: formData.phone,
        website_url: formData.websiteUrl,
        address: formData.address,
        city: formData.city,
      })
      await marketplaceService.updateSellerSettings({
        whatsappNumber: formData.whatsappNumber,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save contact information.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading contact information" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Contact Information</h2>
          <p className="muted">Manage how customers can reach you.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Contact information saved</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>Communication channels</h3>
          <div className="form-grid">
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
              <label htmlFor="whatsappNumber">WhatsApp number</label>
              <input
                type="tel"
                id="whatsappNumber"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="websiteUrl">Website / social link</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Address</h3>
          <div className="form-grid">
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
            <div className="form-group form-group--full">
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
          </div>
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
