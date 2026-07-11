import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

interface NotificationSettings {
  notificationEmail: string
  newOrderEmailEnabled: boolean
  cancellationRequestEmailEnabled: boolean
  lowStockNotificationEnabled: boolean
}

export function SellerShopNotificationsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<NotificationSettings>({
    notificationEmail: '',
    newOrderEmailEnabled: true,
    cancellationRequestEmailEnabled: true,
    lowStockNotificationEnabled: false,
  })

  useEffect(() => {
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: finalValue }))
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

  if (loading) return <LoadingState label="Loading notifications" />

  return (
    <div>
      <div className="seller-page-header">
        <h2>Notifications</h2>
        <p className="muted">Configure how you receive alerts about orders and inventory</p>
      </div>

      {success && <div className="alert alert--success">✓ Notification settings saved</div>}

      <form onSubmit={handleSubmit} className="seller-form">
        <div className="form-section">
          <h3>Notification Email</h3>

          <div className="form-group">
            <label htmlFor="notificationEmail">Notification Email Address *</label>
            <input
              type="email"
              id="notificationEmail"
              name="notificationEmail"
              value={formData.notificationEmail}
              onChange={handleChange}
              required
              className="form-input"
            />
            <p className="form-hint">Email address where order and notification alerts will be sent</p>
          </div>
        </div>

        <div className="form-section">
          <h3>Email Alerts</h3>

          <div className="form-group form-group--checkbox">
            <label>
              <input
                type="checkbox"
                name="newOrderEmailEnabled"
                checked={formData.newOrderEmailEnabled}
                onChange={handleChange}
              />
              New Order Notifications
            </label>
            <p className="form-hint">Receive email when a new order is placed</p>
          </div>

          <div className="form-group form-group--checkbox">
            <label>
              <input
                type="checkbox"
                name="cancellationRequestEmailEnabled"
                checked={formData.cancellationRequestEmailEnabled}
                onChange={handleChange}
              />
              Cancellation Request Notifications
            </label>
            <p className="form-hint">Receive email when a customer requests to cancel an order</p>
          </div>

          <div className="form-group form-group--checkbox">
            <label>
              <input
                type="checkbox"
                name="lowStockNotificationEnabled"
                checked={formData.lowStockNotificationEnabled}
                onChange={handleChange}
              />
              Low Stock Notifications
            </label>
            <p className="form-hint">Receive email when a product stock is running low</p>
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

      <div className="info-box">
        <h4>📧 Email Alerts</h4>
        <p>
          You will receive professional email notifications from GuideWisey. Make sure your notification
          email is correct and check your spam folder if you don't receive messages.
        </p>
      </div>
    </div>
  )
}
