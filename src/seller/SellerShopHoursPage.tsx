import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

interface OpeningHour {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  isClosed: boolean
  openTime?: string
  closeTime?: string
}

export function SellerShopHoursPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hours, setHours] = useState<OpeningHour[]>([
    { dayOfWeek: 0, isClosed: false, openTime: '10:00', closeTime: '18:00' },
    { dayOfWeek: 1, isClosed: false, openTime: '10:00', closeTime: '18:00' },
    { dayOfWeek: 2, isClosed: false, openTime: '10:00', closeTime: '18:00' },
    { dayOfWeek: 3, isClosed: false, openTime: '10:00', closeTime: '18:00' },
    { dayOfWeek: 4, isClosed: false, openTime: '10:00', closeTime: '18:00' },
    { dayOfWeek: 5, isClosed: false, openTime: '10:00', closeTime: '18:00' },
    { dayOfWeek: 6, isClosed: true, openTime: '', closeTime: '' },
  ])

  useEffect(() => {
    setLoading(false)
    // TODO: Load hours from API
  }, [])

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const handleDayChange = (index: number, field: keyof OpeningHour, value: any) => {
    const updated = [...hours]
    updated[index] = { ...updated[index], [field]: value }
    setHours(updated)
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

  if (loading) return <LoadingState label="Loading opening hours" />

  return (
    <div>
      <div className="seller-page-header">
        <h2>Opening Hours</h2>
        <p className="muted">Set your shop opening hours for each day of the week</p>
      </div>

      {success && <div className="alert alert--success">✓ Opening hours saved successfully</div>}

      <form onSubmit={handleSubmit} className="seller-form">
        <div className="form-section">
          <div className="opening-hours-table">
            {hours.map((hour, index) => (
              <div key={index} className="opening-hour-row">
                <div className="day-label">
                  <label>{days[hour.dayOfWeek]}</label>
                </div>

                <div className="time-inputs">
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={hour.isClosed}
                      onChange={(e) => handleDayChange(index, 'isClosed', e.target.checked)}
                    />
                    Closed
                  </label>

                  {!hour.isClosed && (
                    <>
                      <input
                        type="time"
                        value={hour.openTime || '10:00'}
                        onChange={(e) => handleDayChange(index, 'openTime', e.target.value)}
                        className="time-input"
                      />
                      <span className="time-separator">to</span>
                      <input
                        type="time"
                        value={hour.closeTime || '18:00'}
                        onChange={(e) => handleDayChange(index, 'closeTime', e.target.value)}
                        className="time-input"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button--primary">
            {saving ? 'Saving...' : 'Save Hours'}
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
        <h4>💡 Tips</h4>
        <p>
          Opening hours are displayed to customers on your public shop page. They help customers
          know when pickup or delivery is available.
        </p>
      </div>
    </div>
  )
}
