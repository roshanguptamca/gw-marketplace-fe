import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { ShopSettings } from '../types/marketplace'

const deliveryCountries = [
  { code: 'NL', key: 'sellerNetherlands' },
  { code: 'BE', key: 'sellerBelgium' },
  { code: 'DE', key: 'sellerGermany' },
  { code: 'FR', key: 'sellerFrance' },
  { code: 'AT', key: 'sellerAustria' },
  { code: 'LU', key: 'sellerLuxembourg' },
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
    translations: {},
    whatsappGroupUrl: '',
    pickupAddressLine1: '',
    pickupAddressLine2: '',
    pickupPostalCode: '',
    pickupCity: '',
    pickupCountry: '',
    pickupInstructions: '',
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
  const { t } = useTranslation()
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
        setError(t('sellerLoadDeliveryFailed'))
      } finally {
        setLoading(false)
      }
    }

    void loadConfig()
  }, [t])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({ ...prev, [name]: finalValue }) as ShopSettings)
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(
      (prev) =>
        ({
          ...prev,
          [name]: name === 'freeDeliveryAbove' && value === '' ? null : value,
        }) as ShopSettings,
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
      setError(t('sellerSaveDeliveryFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label={t('sellerDeliveryPickup')} />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">{t('sellerShopConfiguration')}</p>
          <h2>{t('sellerDeliveryPickup')}</h2>
          <p className="muted">{t('sellerConfigureFulfilment')}</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && (
        <div className="alert alert--success">{t('sellerDeliverySettingsSaved')}</div>
      )}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>{t('sellerAvailability')}</h3>
          <div className="form-grid">
            <label className="seller-toggle">
              <input
                type="checkbox"
                name="pickupAvailable"
                checked={formData.pickupAvailable ?? true}
                onChange={handleChange}
              />
              <span>{t('sellerEnablePickup')}</span>
            </label>
            <label className="seller-toggle">
              <input
                type="checkbox"
                name="deliveryAvailable"
                checked={formData.deliveryAvailable ?? false}
                onChange={handleChange}
              />
              <span>{t('sellerEnableDelivery')}</span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerOrderingCommunity')}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="minOrderAmount">{t('sellerMinimumOrderEuro')}</label>
              <input
                id="minOrderAmount"
                name="minOrderAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.minOrderAmount}
                onChange={handleNumberChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="whatsappGroupUrl">{t('sellerWhatsAppUrlOptional')}</label>
              <input
                id="whatsappGroupUrl"
                name="whatsappGroupUrl"
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                pattern="https://chat\.whatsapp\.com/[A-Za-z0-9]+/?"
                value={formData.whatsappGroupUrl ?? ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerPickupAddress')}</h3>
          <div className="form-grid">
            {(
              [
                ['pickupAddressLine1', t('sellerAddressLine1')],
                ['pickupAddressLine2', t('sellerAddressLine2')],
                ['pickupPostalCode', t('sellerPostalCode')],
                ['pickupCity', t('sellerCity')],
                ['pickupCountry', t('sellerCountry')],
              ] as const
            ).map(([name, label]) => (
              <div className="form-group" key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  name={name}
                  value={formData[name] ?? ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="pickupInstructions">{t('sellerPickupInstructionsEnglish')}</label>
            <textarea
              id="pickupInstructions"
              name="pickupInstructions"
              rows={3}
              value={formData.pickupInstructions ?? ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pickupInstructionsNl">{t('sellerPickupInstructionsDutch')}</label>
            <textarea
              id="pickupInstructionsNl"
              rows={3}
              value={formData.translations?.pickup_instructions?.nl ?? ''}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  translations: {
                    ...current.translations,
                    pickup_instructions: {
                      ...current.translations?.pickup_instructions,
                      en: current.pickupInstructions ?? '',
                      nl: event.target.value,
                    },
                  },
                }))
              }
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerDeliveryFees')}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="localDeliveryFee">{t('sellerNetherlandsDeliveryFee')}</label>
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
              <label htmlFor="internationalDeliveryFee">{t('sellerInternationalDeliveryFee')}</label>
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
              <label htmlFor="freeDeliveryAbove">{t('sellerFreeDeliveryAbove')}</label>
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
          <h3>{t('sellerPickupDeliveryInstructions')}</h3>
          <div className="form-group">
            <label htmlFor="deliveryNotes">{t('sellerDeliveryNotesEnglish')}</label>
            <textarea
              id="deliveryNotes"
              name="deliveryNotes"
              value={formData.deliveryNotes}
              onChange={handleChange}
              rows={4}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="deliveryNotesNl">{t('sellerDeliveryNotesDutch')}</label>
            <textarea
              id="deliveryNotesNl"
              value={formData.translations?.delivery_notes?.nl ?? ''}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  translations: {
                    ...current.translations,
                    delivery_notes: {
                      ...current.translations?.delivery_notes,
                      en: current.deliveryNotes,
                      nl: event.target.value,
                    },
                  },
                }))
              }
              rows={4}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerSupportedCountries')}</h3>
          <div className="countries-grid">
            {deliveryCountries.map((country) => (
              <label key={country.code} className="country-checkbox">
                <input
                  type="checkbox"
                  checked={formData.supportedDeliveryCountries.includes(country.code)}
                  onChange={() => handleCountryToggle(country.code)}
                />
                {t(country.key)}
              </label>
            ))}
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
