import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketplaceService } from '../services/marketplaceService'
import type { GoogleShopRating, Shop } from '../types/marketplace'

function secureUrl(value?: string | null) {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function ShopGoogleRating({ shop }: { shop: Shop }) {
  const { t, i18n } = useTranslation()
  const [result, setResult] = useState<{ key: string; data: GoogleShopRating } | null>(null)
  const key = `${shop.slug}:${shop.googlePlaceId || ''}`
  useEffect(() => {
    let active = true
    if (shop.googlePlaceId) {
      void marketplaceService
        .getShopGoogleRating(shop.slug)
        .then((data) => {
          if (active) setResult({ key, data })
        })
        .catch(() => {
          /* Optional content must not interrupt shopping. */
        })
    }
    return () => {
      active = false
    }
  }, [shop.slug, shop.googlePlaceId, key])

  const data = result?.key === key ? result.data : null
  const rating = data?.rating
  const count = data?.review_count
  const hasRating =
    typeof rating === 'number' &&
    Number.isFinite(rating) &&
    rating >= 1 &&
    rating <= 5 &&
    typeof count === 'number' &&
    Number.isInteger(count) &&
    count > 0
  const placeUrl = shop.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name)}&query_place_id=${encodeURIComponent(shop.googlePlaceId)}`
    : null
  const readUrl = secureUrl(data?.reviews_url) || placeUrl
  const href = readUrl || secureUrl(shop.googleReviewUrl)
  if (!href) return null
  const formatted = hasRating
    ? new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(rating)
    : ''

  return (
    <div className="shop-google-rating">
      {hasRating && (
        <>
          <div
            role="img"
            className="shop-google-rating__score"
            aria-label={t('googleRatingLabel', { rating: formatted, count })}
          >
            <span className="shop-google-rating__stars" aria-hidden="true">
              <span>★★★★★</span>
              <span
                className="shop-google-rating__fill"
                style={{ width: `${(rating / 5) * 100}%` }}
              >
                ★★★★★
              </span>
            </span>
            <strong aria-hidden="true">{formatted}/5</strong>
            <span aria-hidden="true">{t('googleReviewCount', { count })}</span>
          </div>
          <span className="shop-google-rating__attribution">Google Maps</span>
        </>
      )}
      <a className="shop-google-rating__link" href={href} target="_blank" rel="noopener noreferrer">
        {t(readUrl ? 'readGoogleReviews' : 'leaveGoogleReview')} <span aria-hidden="true">↗</span>
      </a>
      {hasRating && (
        <a
          className="shop-google-rating__policy"
          href="https://support.google.com/maps/answer/6230175"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('googleReviewPolicy')}
        </a>
      )}
    </div>
  )
}
