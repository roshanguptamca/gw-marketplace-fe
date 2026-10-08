import { useTranslation } from 'react-i18next'
import type { Shop } from '../types/marketplace'
import { analytics } from '../analytics/analytics'
import { formatPrice } from '../utils/shopLinks'
import { localizedText } from '../utils/localizedText'

export function whatsappGroupUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'chat.whatsapp.com' ||
      !/^\/[a-zA-Z0-9]+\/?$/.test(url.pathname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null
    return url.href
  } catch {
    return null
  }
}

export function WhatsAppGroupLink({ url }: { url?: string | null }) {
  const { t } = useTranslation()
  const href = whatsappGroupUrl(url)
  if (!href) return null
  return (
    <a
      className="button button--ghost whatsapp-group-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.event('join_whatsapp_group')}
    >
      {t('joinWhatsApp')}
    </a>
  )
}

export function ShopFulfilment({ shop, method }: { shop: Shop; method?: 'pickup' | 'delivery' }) {
  const { t, i18n } = useTranslation()
  const pickup = shop.pickupAvailable !== false && method !== 'delivery'
  const delivery = shop.deliveryAvailable === true && method !== 'pickup'
  const address = shop.pickupAddress
  const minimum = Number(shop.minimumOrderAmount ?? 0)
  const pickupInstructions = localizedText(
    shop.pickupInstructions,
    shop.settingsTranslations,
    'pickup_instructions',
    i18n.language,
  )
  const deliveryInstructions = localizedText(
    shop.deliveryInstructions,
    shop.settingsTranslations,
    'delivery_notes',
    i18n.language,
  )
  const deliveryArea = localizedText(
    shop.deliveryArea,
    shop.translations,
    'delivery_area',
    i18n.language,
  )
  return (
    <div className="shop-fulfilment">
      {pickup && (
        <div>
          <h4>{t('pickup')}</h4>
          {address?.addressLine1 && (
            <address>
              {[address.addressLine1, address.addressLine2].filter(Boolean).join(', ')}
              <br />
              {[address.postalCode, address.city].filter(Boolean).join(' ')}
              {address.country && (
                <>
                  <br />
                  {address.country}
                </>
              )}
            </address>
          )}
          {pickupInstructions && <p>{pickupInstructions}</p>}
        </div>
      )}
      {delivery && (
        <div>
          <h4>{t('delivery')}</h4>
          {deliveryArea && <p>{deliveryArea}</p>}
          {deliveryInstructions && <p>{deliveryInstructions}</p>}
        </div>
      )}
      {!method && Number.isFinite(minimum) && minimum > 0 && (
        <p>{t('minimumOrder')} {formatPrice(minimum, 'EUR')}</p>
      )}
      <WhatsAppGroupLink url={shop.whatsappGroupUrl} />
    </div>
  )
}
