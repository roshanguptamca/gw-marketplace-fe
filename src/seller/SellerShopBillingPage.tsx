import { useEffect, useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { ShopSettings } from '../types/marketplace'

type BillingField = Pick<
  ShopSettings,
  | 'legalBusinessName'
  | 'kvkNumber'
  | 'vatNumber'
  | 'billingAddressLine1'
  | 'billingAddressLine2'
  | 'billingPostcode'
  | 'billingCity'
  | 'billingCountry'
  | 'invoicePrefix'
  | 'defaultVatRate'
  | 'invoiceIban'
  | 'invoiceFooter'
>

const fields: Array<{
  name: keyof BillingField
  label: string
  required?: boolean
  maxLength: number
}> = [
  { name: 'legalBusinessName', label: 'Legal / business name', required: true, maxLength: 150 },
  { name: 'kvkNumber', label: 'KVK number (optional)', maxLength: 30 },
  { name: 'vatNumber', label: 'VAT / BTW number (optional)', maxLength: 40 },
  { name: 'billingAddressLine1', label: 'Billing address', required: true, maxLength: 255 },
  { name: 'billingAddressLine2', label: 'Address line 2 (optional)', maxLength: 255 },
  { name: 'billingPostcode', label: 'Postcode', required: true, maxLength: 20 },
  { name: 'billingCity', label: 'City', required: true, maxLength: 100 },
  { name: 'billingCountry', label: 'Country', required: true, maxLength: 80 },
  { name: 'invoicePrefix', label: 'Invoice prefix (optional)', maxLength: 20 },
  { name: 'defaultVatRate', label: 'Default VAT rate (%)', required: true, maxLength: 6 },
  { name: 'invoiceIban', label: 'IBAN / payment account (optional)', maxLength: 34 },
]

export function SellerShopBillingPage() {
  const [form, setForm] = useState<BillingField | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setError('')
    marketplaceService
      .getSellerSettings()
      .then((settings) => {
        if (!settings) throw new Error('Billing settings are unavailable.')
        if (active) {
          const billing: BillingField = {}
          for (const { name } of fields)
            billing[name] = settings[name] ?? (name === 'defaultVatRate' ? '0.00' : '')
          billing.invoiceFooter = settings.invoiceFooter ?? ''
          setForm(billing)
        }
      })
      .catch((caught: unknown) => {
        if (active)
          setError(caught instanceof Error ? caught.message : 'Could not load billing settings.')
      })
    return () => {
      active = false
    }
  }, [retry])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await marketplaceService.updateSellerSettings(form)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save billing settings.')
    } finally {
      setSaving(false)
    }
  }

  if (!form && !error) return <LoadingState label="Loading billing settings" />
  return (
    <section>
      <p className="eyebrow">Shop Configuration</p>
      <h2>Billing &amp; Invoice Details / Facturatiegegevens</h2>
      <p className="muted">
        Changes apply only to future orders. Prices include VAT; configure the appropriate rate
        yourself.
      </p>
      <p className="form-hint">
        Required fields are marked *. Invoice numbers include your prefix, shop ID, year and
        sequence.
      </p>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="alert alert--success" role="status">
          Billing settings saved
        </p>
      )}
      {!form ? (
        <button type="button" className="button" onClick={() => setRetry((value) => value + 1)}>
          Retry
        </button>
      ) : (
        <form className="seller-form seller-form--stacked" onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            {fields.map(({ name, label, required, maxLength }) => (
              <div className="form-group" key={name}>
                <label htmlFor={name}>
                  {label}
                  {required ? ' *' : ''}
                </label>
                <input
                  className="form-input"
                  id={name}
                  value={form[name] ?? ''}
                  required={required}
                  maxLength={maxLength}
                  type={name === 'defaultVatRate' ? 'number' : 'text'}
                  min={name === 'defaultVatRate' ? '0' : undefined}
                  max={name === 'defaultVatRate' ? '100' : undefined}
                  step={name === 'defaultVatRate' ? '0.01' : undefined}
                  pattern={name === 'invoicePrefix' ? '[A-Z0-9][A-Z0-9-]{0,19}' : undefined}
                  onChange={(event) => {
                    setSaved(false)
                    setForm({ ...form, [name]: event.target.value })
                  }}
                />
              </div>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="invoiceFooter">Invoice footer / payment details (optional)</label>
            <textarea
              className="form-input"
              id="invoiceFooter"
              maxLength={2000}
              value={form.invoiceFooter ?? ''}
              onChange={(event) => {
                setSaved(false)
                setForm({ ...form, invoiceFooter: event.target.value })
              }}
            />
          </div>
          <button className="button button--primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save billing details'}
          </button>
        </form>
      )}
    </section>
  )
}
