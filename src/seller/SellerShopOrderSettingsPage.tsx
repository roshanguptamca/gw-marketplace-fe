import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { ShopSettings } from '../types/marketplace'

function defaultSettings(): ShopSettings {
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
    supportedDeliveryCountries: [],
  }
}

export function SellerShopOrderSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ShopSettings>(defaultSettings())

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await marketplaceService.getSellerSettings()
        if (settings) setFormData(settings)
      } catch {
        setError('Failed to load order settings.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value } as ShopSettings))
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
      setError('Failed to save order settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading order settings" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Order Settings</h2>
          <p className="muted">Configure how orders are processed.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Order settings saved</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>Acceptance mode</h3>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="orderAcceptanceMode"
                value="manual"
                checked={formData.orderAcceptanceMode === 'manual'}
                onChange={handleChange}
              />
              <span>Manual acceptance</span>
            </label>
            <p className="form-hint">You must manually accept or reject each order.</p>
            <label className="radio-label">
              <input
                type="radio"
                name="orderAcceptanceMode"
                value="auto"
                checked={formData.orderAcceptanceMode === 'auto'}
                onChange={handleChange}
              />
              <span>Automatic acceptance</span>
            </label>
            <p className="form-hint">Orders are accepted automatically once payment is valid.</p>
          </div>
        </div>

        <div className="form-section">
          <h3>Order thresholds</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="minOrderAmount">Minimum order amount</label>
              <input
                type="number"
                id="minOrderAmount"
                name="minOrderAmount"
                value={formData.minOrderAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <input
                type="text"
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
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
