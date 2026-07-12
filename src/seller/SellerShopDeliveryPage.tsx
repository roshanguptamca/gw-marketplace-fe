import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { ShopSettings } from '../types/marketplace'

const deliveryCountries = [
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AT', name: 'Austria' },
  { code: 'LU', name: 'Luxembourg' },
]

function emptySettings(): ShopSettings {
  return {
    currency: 'EUR',
    minOrderAmount: '0.00',
    deliveryFee: '0.00',
    localDeliveryFee: '5.00',
    internationalDeliveryFee: '10.00',
    freeDeliveryAbove: null,
    deliveryNotes: '',
    orderAcceptanceMode: 'manual',
    whatsappNumber: '',
    bankTransferInstructions: '',
    notificationEmail: '',
    newOrderEmailEnabled: true,
    cancellationRequestEmailEnabled: true,
    lowStockNotificationEnabled: false,
    supportedDeliveryCountries: ['NL', 'BE', 'DE'],
    pickupAvailable: true,
    deliveryAvailable: false,
  }
}

export function SellerShopDeliveryPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<ShopSettings>(emptySettings())

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        const data = await marketplaceService.getSellerSettings()
        if (data) setFormData(data)
      } catch {
        setError('Failed to load delivery settings.')
      } finally {
        setLoading(false)
      }
    }

    void loadConfig()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({ ...prev, [name]: finalValue } as ShopSettings))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) =>
      ({ ...prev, [name]: name === 'freeDeliveryAbove' && value === '' ? null : value } as ShopSettings),
    )
  }

  const handleCountryToggle = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      supportedDeliveryCountries: prev.supportedDeliveryCountries.includes(country)
        ? prev.supportedDeliveryCountries.filter((item) => item !== country)
        : [...prev.supportedDeliveryCountries, country],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updated = await marketplaceService.updateSellerSettings(formData)
      setFormData(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save delivery settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading delivery settings" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Delivery & Pickup</h2>
          <p className="muted">Configure how customers receive their orders.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Delivery settings saved successfully</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>Availability</h3>
          <div className="form-grid">
            <label className="seller-toggle">
              <input
                type="checkbox"
                name="pickupAvailable"
                checked={formData.pickupAvailable ?? true}
                onChange={handleChange}
              />
              <span>Enable customer pickup</span>
            </label>
            <label className="seller-toggle">
              <input
                type="checkbox"
                name="deliveryAvailable"
                checked={formData.deliveryAvailable ?? false}
                onChange={handleChange}
              />
              <span>Enable delivery</span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Delivery fees</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="localDeliveryFee">Netherlands delivery fee (€)</label>
              <input
                type="number"
                id="localDeliveryFee"
                name="localDeliveryFee"
                value={formData.localDeliveryFee}
                onChange={handleNumberChange}
                step="0.01"
                min="0"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="internationalDeliveryFee">International delivery fee (€)</label>
              <input
                type="number"
                id="internationalDeliveryFee"
                name="internationalDeliveryFee"
                value={formData.internationalDeliveryFee}
                onChange={handleNumberChange}
                step="0.01"
                min="0"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="freeDeliveryAbove">Free delivery above (€)</label>
              <input
                type="number"
                id="freeDeliveryAbove"
                name="freeDeliveryAbove"
                value={formData.freeDeliveryAbove ?? ''}
                onChange={handleNumberChange}
                step="0.01"
                min="0"
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Pickup and delivery instructions</h3>
          <div className="form-group">
            <label htmlFor="deliveryNotes">Delivery notes</label>
            <textarea
              id="deliveryNotes"
              name="deliveryNotes"
              value={formData.deliveryNotes}
              onChange={handleChange}
              rows={4}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Supported countries</h3>
          <div className="countries-grid">
            {deliveryCountries.map((country) => (
              <label key={country.code} className="country-checkbox">
                <input
                  type="checkbox"
                  checked={formData.supportedDeliveryCountries.includes(country.code)}
                  onChange={() => handleCountryToggle(country.code)}
                />
                {country.name}
              </label>
            ))}
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
