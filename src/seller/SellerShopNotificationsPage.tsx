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

export function SellerShopNotificationsPage() {
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
        setError('Failed to load notification settings.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? e.target.checked : value
    setFormData((prev) => ({ ...prev, [name]: finalValue } as ShopSettings))
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
      setError('Failed to save notification settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading notifications" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Notifications</h2>
          <p className="muted">Configure who receives alerts about orders and stock.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Notification settings saved</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>Notification email</h3>
          <div className="form-group">
            <label htmlFor="notificationEmail">Notification email address</label>
            <input
              type="email"
              id="notificationEmail"
              name="notificationEmail"
              value={formData.notificationEmail}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Email alerts</h3>
          <label className="seller-toggle">
            <input
              type="checkbox"
              name="newOrderEmailEnabled"
              checked={formData.newOrderEmailEnabled}
              onChange={handleChange}
            />
            <span>New order email notifications</span>
          </label>
          <label className="seller-toggle">
            <input
              type="checkbox"
              name="cancellationRequestEmailEnabled"
              checked={formData.cancellationRequestEmailEnabled}
              onChange={handleChange}
            />
            <span>Cancellation request email notifications</span>
          </label>
          <label className="seller-toggle">
            <input
              type="checkbox"
              name="lowStockNotificationEnabled"
              checked={formData.lowStockNotificationEnabled}
              onChange={handleChange}
            />
            <span>Low-stock notifications</span>
          </label>
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
