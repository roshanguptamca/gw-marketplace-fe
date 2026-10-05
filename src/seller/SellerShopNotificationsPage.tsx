import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { ShopSettings } from '../types/marketplace'

const E164_PHONE_PATTERN = /^\+[1-9][0-9]{7,14}$/

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
    whatsappNotificationsEnabled: false,
    whatsappNotificationPhoneNumber: '',
    bankTransferInstructions: '',
    notificationEmail: '',
    newOrderEmailEnabled: true,
    cancellationRequestEmailEnabled: true,
    lowStockNotificationEnabled: false,
    supportedDeliveryCountries: [],
  }
}

function getPhoneValidationError(enabled: boolean, phoneNumber: string): string | null {
  if (!phoneNumber && enabled)
    return 'Enter a WhatsApp recipient phone number to enable notifications.'
  if (phoneNumber && !E164_PHONE_PATTERN.test(phoneNumber)) {
    return 'Enter a valid phone number in E.164 format.'
  }
  return null
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function SellerShopNotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ShopSettings>(defaultSettings())

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await marketplaceService.getSellerSettings()
        if (settings) setFormData(settings)
      } catch (loadError) {
        setError(errorMessage(loadError, 'Failed to load notification settings.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? e.target.checked : value
    setFormData((prev) => ({ ...prev, [name]: finalValue }) as ShopSettings)
    if (name === 'whatsappNotificationsEnabled' || name === 'whatsappNotificationPhoneNumber') {
      setPhoneError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = getPhoneValidationError(
      formData.whatsappNotificationsEnabled,
      formData.whatsappNotificationPhoneNumber,
    )
    if (validationError) {
      setPhoneError(validationError)
      setError(null)
      setSuccess(false)
      return
    }

    setSaving(true)
    setError(null)
    setPhoneError(null)
    setSuccess(false)

    try {
      const updated = await marketplaceService.updateSellerSettings({
        notificationEmail: formData.notificationEmail,
        newOrderEmailEnabled: formData.newOrderEmailEnabled,
        cancellationRequestEmailEnabled: formData.cancellationRequestEmailEnabled,
        lowStockNotificationEnabled: formData.lowStockNotificationEnabled,
        whatsappNotificationsEnabled: formData.whatsappNotificationsEnabled,
        whatsappNotificationPhoneNumber: formData.whatsappNotificationPhoneNumber,
      })
      setFormData((prev) => ({
        ...prev,
        notificationEmail: updated.notificationEmail,
        newOrderEmailEnabled: updated.newOrderEmailEnabled,
        cancellationRequestEmailEnabled: updated.cancellationRequestEmailEnabled,
        lowStockNotificationEnabled: updated.lowStockNotificationEnabled,
        whatsappNotificationsEnabled: updated.whatsappNotificationsEnabled,
        whatsappNotificationPhoneNumber: updated.whatsappNotificationPhoneNumber,
      }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (saveError) {
      setError(errorMessage(saveError, 'Failed to save notification settings.'))
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

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
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

        <div className="form-section">
          <h3>WhatsApp order notifications</h3>
          <label className="seller-toggle">
            <input
              type="checkbox"
              name="whatsappNotificationsEnabled"
              checked={formData.whatsappNotificationsEnabled}
              onChange={handleChange}
            />
            <span>Send new order notifications to WhatsApp</span>
          </label>
          <div className="form-group">
            <label htmlFor="whatsappNotificationPhoneNumber">
              WhatsApp notification recipient phone number
            </label>
            <input
              type="tel"
              id="whatsappNotificationPhoneNumber"
              name="whatsappNotificationPhoneNumber"
              value={formData.whatsappNotificationPhoneNumber}
              onChange={handleChange}
              className="form-input"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={phoneError !== null}
              aria-describedby="whatsapp-notification-phone-hint"
            />
            <p id="whatsapp-notification-phone-hint" className="form-hint">
              Use E.164 format: a + sign followed by 8–15 digits (starting with 1–9), with no
              spaces. The recipient must have opted in to receive WhatsApp order notifications.
            </p>
            {phoneError && (
              <p className="form-hint" role="alert">
                {phoneError}
              </p>
            )}
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
