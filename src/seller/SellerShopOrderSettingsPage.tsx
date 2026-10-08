import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        setError(t('sellerLoadOrderSettingsFailed'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [t])

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
      setError(t('sellerSaveOrderSettingsFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label={t('sellerOrderSettings')} />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">{t('sellerShopConfiguration')}</p>
          <h2>{t('sellerOrderSettings')}</h2>
          <p className="muted">{t('sellerConfigureOrders')}</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{t('sellerOrderSettingsSaved')}</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>{t('sellerAcceptanceMode')}</h3>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="orderAcceptanceMode"
                value="manual"
                checked={formData.orderAcceptanceMode === 'manual'}
                onChange={handleChange}
              />
              <span>{t('sellerManualAcceptance')}</span>
            </label>
            <p className="form-hint">{t('sellerManualAcceptanceHint')}</p>
            <label className="radio-label">
              <input
                type="radio"
                name="orderAcceptanceMode"
                value="auto"
                checked={formData.orderAcceptanceMode === 'auto'}
                onChange={handleChange}
              />
              <span>{t('sellerAutomaticAcceptance')}</span>
            </label>
            <p className="form-hint">{t('sellerAutomaticAcceptanceHint')}</p>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerOrderThresholds')}</h3>
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
              <label htmlFor="currency">{t('sellerCurrency')}</label>
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

        <div className="form-section">
          <h3>{t('sellerPickupScheduling')}</h3>
          <p className="form-hint">{t('sellerPickupSchedulingHint')}</p>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pickupSlotMinutes">{t('sellerPickupSlotLength')}</label>
              <input
                type="number"
                id="pickupSlotMinutes"
                name="pickupSlotMinutes"
                value={formData.pickupSlotMinutes ?? 30}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pickupSlotMinutes: Number(e.target.value) }))
                }
                step="5"
                min="5"
                max="1440"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pickupBookingWindowDays">{t('sellerBookableDaysAhead')}</label>
              <input
                type="number"
                id="pickupBookingWindowDays"
                name="pickupBookingWindowDays"
                value={formData.pickupBookingWindowDays ?? 14}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupBookingWindowDays: Number(e.target.value),
                  }))
                }
                step="1"
                min="1"
                max="90"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pickupTimezone">{t('sellerShopTimezone')}</label>
              <input
                type="text"
                id="pickupTimezone"
                name="pickupTimezone"
                value={formData.pickupTimezone ?? 'Europe/Amsterdam'}
                onChange={handleChange}
                placeholder="Europe/Amsterdam"
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button--primary">
            {saving ? t('sellerSavingChanges') : t('sellerSaveChanges')}
          </button>
        </div>
      </form>
    </section>
  )
}
