import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Shop } from '../types/marketplace'
import { ShopFulfilment } from './ShopFulfilment'
import { localizedText } from '../utils/localizedText'

// 1 January 2023 was a Sunday, matching dayOfWeek 0.
function weekdayLabel(dayOfWeek: number, language: string): string {
  return new Date(2023, 0, 1 + dayOfWeek).toLocaleDateString(
    language === 'nl' ? 'nl-NL' : 'en-GB',
    {
      weekday: 'short',
    },
  )
}

export function ShopDetailsModal({
  shop,
  open,
  onClose,
}: {
  shop: Shop
  open: boolean
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  const description = localizedText(
    shop.description,
    shop.translations,
    'description',
    i18n.language,
  )
  const shortDescription =
    localizedText(shop.shortDescription, shop.translations, 'short_description', i18n.language) ||
    description
  const shopType = localizedText(shop.shopType, shop.translations, 'shop_type', i18n.language)

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
            <p className="eyebrow">{t('shopDetails')}</p>
            <h2 id="shop-details-title">{shop.name}</h2>
            <p>{shortDescription}</p>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>

        <div className="shop-details-modal__grid">
          <section className="shop-details-modal__card">
            <h3>{t('about')}</h3>
            <p>{description}</p>
            <dl className="shop-details-modal__list">
              <div>
                <dt>{t('category')}</dt>
                <dd>{shopType || t('generalShop')}</dd>
              </div>
              <div>
                <dt>{t('location')}</dt>
                <dd>{[shop.location, shop.country].filter(Boolean).join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>{t('website')}</dt>
                <dd>{shop.websiteUrl ? <a href={shop.websiteUrl}>{shop.websiteUrl}</a> : '—'}</dd>
              </div>
              {shop.contactEmail && (
                <div>
                  <dt>{t('contactEmail')}</dt>
                  <dd>
                    <a href={`mailto:${shop.contactEmail}`}>{shop.contactEmail}</a>
                  </dd>
                </div>
              )}
              {shop.contactPhone && (
                <div>
                  <dt>{t('contactPhone')}</dt>
                  <dd>
                    <a href={`tel:${shop.contactPhone}`}>{shop.contactPhone}</a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="shop-details-modal__card">
            <h3>{t('openingHours')}</h3>
            {shop.openingHours && shop.openingHours.length > 0 ? (
              <ul className="hours-list">
                {shop.openingHours.map((hour) => (
                  <li key={hour.dayOfWeek}>
                    <span>{weekdayLabel(hour.dayOfWeek, i18n.language)}</span>
                    <strong>
                      {hour.isClosed
                        ? t('closed')
                        : `${hour.openTime ?? '—'} - ${hour.closeTime ?? '—'}`}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('noOpeningHours')}</p>
            )}
          </section>

          <section className="shop-details-modal__card">
            <h3>{t('service')}</h3>
            <ShopFulfilment shop={shop} />
            <p>
              {shop.localDeliveryFee !== undefined
                ? `${t('dutchDeliveryFee')} €${shop.localDeliveryFee.toFixed(2)}`
                : `${t('dutchDeliveryFee')} —`}
            </p>
            <p>
              {shop.internationalDeliveryFee !== undefined
                ? `${t('internationalDeliveryFee')} €${shop.internationalDeliveryFee.toFixed(2)}`
                : `${t('internationalDeliveryFee')} —`}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
