import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

interface ContactInfo {
  email: string
  phone?: string
  website?: string
  whatsappNumber?: string
  bankTransferInstructions?: string
}

export function SellerShopContactPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<ContactInfo>({
    email: '',
    phone: '',
    website: '',
    whatsappNumber: '',
    bankTransferInstructions: '',
  })

  useEffect(() => {
    setLoading(false)
    // TODO: Load contact info from API
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: Save to API
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading contact information" />

  return (
    <div>
      <div className="seller-page-header">
        <h2>Contact Information</h2>
        <p className="muted">Manage how customers can reach you</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Contact information saved</div>}

      <form onSubmit={handleSubmit} className="seller-form">
        <div className="form-section">
          <h3>Communication Channels</h3>

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
            <p className="form-hint">Primary contact email for orders and inquiries</p>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+31 6 12345678"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="whatsappNumber">WhatsApp Number</label>
            <input
              type="tel"
              id="whatsappNumber"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
              placeholder="+31 6 12345678"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website/Social</label>
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
          <h3>Payment Instructions</h3>

          <div className="form-group">
            <label htmlFor="bankTransferInstructions">Bank Transfer Instructions</label>
            <textarea
              id="bankTransferInstructions"
              name="bankTransferInstructions"
              value={formData.bankTransferInstructions}
              onChange={handleChange}
              placeholder="E.g., 'IBAN: NL91 ABNA 0417 1643 00, Name: John Doe'"
              rows={4}
              className="form-input"
            />
            <p className="form-hint">Shown to customers selecting bank transfer as payment method</p>
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
