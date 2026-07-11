import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

interface OrderSettings {
  orderAcceptanceMode: 'manual' | 'auto'
  minOrderAmount?: number
  currency: string
}

export function SellerShopOrderSettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<OrderSettings>({
    orderAcceptanceMode: 'manual',
    minOrderAmount: 0,
    currency: 'EUR',
  })

  useEffect(() => {
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  if (loading) return <LoadingState label="Loading order settings" />

  return (
    <div>
      <div className="seller-page-header">
        <h2>Order Settings</h2>
        <p className="muted">Configure how orders are processed</p>
      </div>

      {success && <div className="alert alert--success">✓ Order settings saved</div>}

      <form onSubmit={handleSubmit} className="seller-form">
        <div className="form-section">
          <h3>Order Acceptance</h3>

          <div className="form-group">
            <label>Order Acceptance Mode</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="orderAcceptanceMode"
                  value="manual"
                  checked={formData.orderAcceptanceMode === 'manual'}
                  onChange={handleChange}
                />
                <span>Manual Acceptance</span>
              </label>
              <p className="form-hint">You must manually accept or reject each order</p>

              <label className="radio-label">
                <input
                  type="radio"
                  name="orderAcceptanceMode"
                  value="auto"
                  checked={formData.orderAcceptanceMode === 'auto'}
                  onChange={handleChange}
                />
                <span>Automatic Acceptance</span>
              </label>
              <p className="form-hint">Orders are automatically accepted (still require payment confirmation)</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="minOrderAmount">Minimum Order Amount ({formData.currency})</label>
            <input
              type="number"
              id="minOrderAmount"
              name="minOrderAmount"
              value={formData.minOrderAmount || 0}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, minOrderAmount: parseFloat(e.target.value) }))
              }
              step="0.01"
              min="0"
              className="form-input"
            />
            <p className="form-hint">Customers cannot checkout with an order below this amount</p>
          </div>
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
    </div>
  )
}
