import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

interface DeliveryConfig {
  pickupEnabled: boolean
  pickupInstructions?: string
  deliveryEnabled: boolean
  nlDeliveryFee?: number
  internationalDeliveryFee?: number
  freeDeliveryThreshold?: number
  deliveryNotes?: string
  supportedCountries?: string[]
}

export function SellerShopDeliveryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<DeliveryConfig>({
    pickupEnabled: true,
    pickupInstructions: '',
    deliveryEnabled: false,
    nlDeliveryFee: 5.0,
    internationalDeliveryFee: 10.0,
    freeDeliveryThreshold: 50.0,
    deliveryNotes: '',
    supportedCountries: ['NL', 'BE', 'DE'],
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        // TODO: Fetch delivery config from API
        // const response = await fetch('/api/seller/shop/delivery')
        // const data = await response.json()
        // setFormData(data)
      } catch (err) {
        setError('Failed to load delivery settings.')
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
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

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined,
    }))
  }

  const handleCountryToggle = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      supportedCountries: prev.supportedCountries?.includes(country)
        ? prev.supportedCountries.filter((c) => c !== country)
        : [...(prev.supportedCountries || []), country],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // TODO: Save delivery config to API
      // const response = await fetch('/api/seller/shop/delivery', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // })
      // if (!response.ok) throw new Error('Failed to save delivery settings')

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to save delivery settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading delivery settings" />

  const countries = [
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'AT', name: 'Austria' },
    { code: 'LU', name: 'Luxembourg' },
  ]

  return (
    <div>
      <div className="seller-page-header">
        <h2>Delivery & Pickup</h2>
        <p className="muted">Configure how customers receive their orders</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Delivery settings saved successfully</div>}

      <form onSubmit={handleSubmit} className="seller-form">
        {/* Pickup Section */}
        <div className="form-section">
          <h3>Pickup Configuration</h3>

          <div className="form-group form-group--checkbox">
            <label>
              <input
                type="checkbox"
                name="pickupEnabled"
                checked={formData.pickupEnabled}
                onChange={handleChange}
              />
              Enable customer pickup
            </label>
            <p className="form-hint">Allow customers to pick up their orders from your location</p>
          </div>

          {formData.pickupEnabled && (
            <div className="form-group">
              <label htmlFor="pickupInstructions">Pickup Instructions</label>
              <textarea
                id="pickupInstructions"
                name="pickupInstructions"
                value={formData.pickupInstructions}
                onChange={handleChange}
                placeholder="E.g., 'Available Tuesday to Saturday 9AM-5PM. Ring the bell at the back entrance.'"
                rows={4}
                className="form-input"
              />
              <p className="form-hint">
                Instructions shown to customers when they select pickup
              </p>
            </div>
          )}
        </div>

        {/* Delivery Section */}
        <div className="form-section">
          <h3>Delivery Configuration</h3>

          <div className="form-group form-group--checkbox">
            <label>
              <input
                type="checkbox"
                name="deliveryEnabled"
                checked={formData.deliveryEnabled}
                onChange={handleChange}
              />
              Enable delivery
            </label>
            <p className="form-hint">Allow customers to have orders delivered</p>
          </div>

          {formData.deliveryEnabled && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nlDeliveryFee">Netherlands Delivery Fee (€) *</label>
                  <input
                    type="number"
                    id="nlDeliveryFee"
                    name="nlDeliveryFee"
                    value={formData.nlDeliveryFee || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="internationalDeliveryFee">
                    International Delivery Fee (€) *
                  </label>
                  <input
                    type="number"
                    id="internationalDeliveryFee"
                    name="internationalDeliveryFee"
                    value={formData.internationalDeliveryFee || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="freeDeliveryThreshold">Free Delivery Threshold (€)</label>
                  <input
                    type="number"
                    id="freeDeliveryThreshold"
                    name="freeDeliveryThreshold"
                    value={formData.freeDeliveryThreshold || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="form-input"
                  />
                  <p className="form-hint">
                    Leave empty to disable. Customers get free delivery when order exceeds this amount.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="deliveryNotes">Delivery Notes</label>
                <textarea
                  id="deliveryNotes"
                  name="deliveryNotes"
                  value={formData.deliveryNotes}
                  onChange={handleChange}
                  placeholder="E.g., 'Delivery typically takes 2-3 business days. No weekend delivery.'"
                  rows={4}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Supported Delivery Countries</label>
                <div className="countries-grid">
                  {countries.map((country) => (
                    <label key={country.code} className="country-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.supportedCountries?.includes(country.code) || false}
                        onChange={() => handleCountryToggle(country.code)}
                      />
                      {country.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button--primary">
            {saving ? 'Saving...' : 'Save Settings'}
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

      <div className="delivery-info-box">
        <h4>💡 Pricing Tips</h4>
        <ul>
          <li>
            <strong>Netherlands Fee:</strong> Typically €3-5 for local delivery
          </li>
          <li>
            <strong>International Fee:</strong> Higher for neighboring countries due to distance
          </li>
          <li>
            <strong>Free Delivery:</strong> Encourage larger orders by offering free delivery over a
            threshold
          </li>
          <li>
            <strong>Flat Rate:</strong> Both fees are flat-rate; GuideWisey does not charge
            percentage-based fees
          </li>
        </ul>
      </div>
    </div>
  )
}
