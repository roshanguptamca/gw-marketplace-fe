import { useEffect } from 'react'
import type { Shop } from '../types/marketplace'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ShopDetailsModal({
  shop,
  open,
  onClose,
}: {
  shop: Shop
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="shop-details-modal" role="presentation" onClick={onClose}>
      <div
        className="shop-details-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shop-details-modal__header">
          <div>
            <p className="eyebrow">Shop details</p>
            <h2 id="shop-details-title">{shop.name}</h2>
            <p>{shop.shortDescription || shop.tagline}</p>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="shop-details-modal__grid">
          <section className="shop-details-modal__card">
            <h3>About</h3>
            <p>{shop.description}</p>
            <dl className="shop-details-modal__list">
              <div>
                <dt>Category</dt>
                <dd>{shop.shopType || 'General marketplace shop'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{[shop.location, shop.country].filter(Boolean).join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{shop.websiteUrl ? <a href={shop.websiteUrl}>{shop.websiteUrl}</a> : '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="shop-details-modal__card">
            <h3>Opening hours</h3>
            {shop.openingHours && shop.openingHours.length > 0 ? (
              <ul className="hours-list">
                {shop.openingHours.map((hour) => (
                  <li key={hour.dayOfWeek}>
                    <span>{WEEKDAY_LABELS[hour.dayOfWeek]}</span>
                    <strong>
                      {hour.isClosed
                        ? 'Closed'
                        : `${hour.openTime ?? '—'} - ${hour.closeTime ?? '—'}`}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No opening hours have been published yet.</p>
            )}
          </section>

          <section className="shop-details-modal__card">
            <h3>Service</h3>
            <p>{shop.pickupAvailable ? 'Pickup is available.' : 'Pickup is not available.'}</p>
            <p>{shop.deliveryAvailable ? 'Delivery is available.' : 'Delivery is not available.'}</p>
            <p>
              {shop.localDeliveryFee !== undefined
                ? `Netherlands delivery fee: €${shop.localDeliveryFee.toFixed(2)}`
                : 'Netherlands delivery fee: —'}
            </p>
            <p>
              {shop.internationalDeliveryFee !== undefined
                ? `International delivery fee: €${shop.internationalDeliveryFee.toFixed(2)}`
                : 'International delivery fee: —'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
