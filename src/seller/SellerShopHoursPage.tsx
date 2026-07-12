import { useEffect, useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { OpeningHour } from '../types/marketplace'

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function buildDefaultHours(): OpeningHour[] {
  return dayLabels.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: dayOfWeek === 0,
    openTime: dayOfWeek === 0 ? undefined : '10:00',
    closeTime: dayOfWeek === 0 ? undefined : '18:00',
  }))
}

export function SellerShopHoursPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState<OpeningHour[]>(buildDefaultHours())

  useEffect(() => {
    const load = async () => {
      try {
        const shop = await marketplaceService.getSellerShop()
        setHours(shop.openingHours && shop.openingHours.length > 0 ? shop.openingHours : buildDefaultHours())
      } catch {
        setError('Failed to load opening hours.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const updateHour = (index: number, field: keyof OpeningHour, value: string | boolean) => {
    setHours((current) =>
      current.map((hour, hourIndex) => (hourIndex === index ? { ...hour, [field]: value } : hour)),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await marketplaceService.updateSellerShop({
        opening_hours: hours.map((hour) => ({
          day_of_week: hour.dayOfWeek,
          is_closed: hour.isClosed,
          open_time: hour.openTime,
          close_time: hour.closeTime,
        })),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save opening hours.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading opening hours" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Shop Configuration</p>
          <h2>Opening Hours</h2>
          <p className="muted">Set your shop opening hours for each day of the week.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">✓ Opening hours saved successfully</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <div className="opening-hours-table">
            {hours.map((hour, index) => (
              <div key={hour.dayOfWeek} className="opening-hour-row">
                <div className="day-label">
                  <label>{dayLabels[hour.dayOfWeek]}</label>
                </div>
                <div className="time-inputs">
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={hour.isClosed}
                      onChange={(event) => updateHour(index, 'isClosed', event.target.checked)}
                    />
                    Closed
                  </label>
                  {!hour.isClosed && (
                    <>
                      <input
                        type="time"
                        value={hour.openTime || '10:00'}
                        onChange={(event) => updateHour(index, 'openTime', event.target.value)}
                        className="time-input"
                      />
                      <span className="time-separator">to</span>
                      <input
                        type="time"
                        value={hour.closeTime || '18:00'}
                        onChange={(event) => updateHour(index, 'closeTime', event.target.value)}
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
            {saving ? 'Saving...' : 'Save hours'}
          </button>
        </div>
      </form>

      <div className="info-box">
        <h4>Opening hours are shown on the public shop page.</h4>
        <p>Customers use this information to know when pickup or delivery support is available.</p>
      </div>
    </section>
  )
}
