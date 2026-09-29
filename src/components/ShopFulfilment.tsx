import type { Shop } from '../types/marketplace'
import { analytics } from '../analytics/analytics'
import { formatPrice } from '../utils/shopLinks'

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
      Join WhatsApp Group
    </a>
  )
}

export function ShopFulfilment({ shop, method }: { shop: Shop; method?: 'pickup' | 'delivery' }) {
  const pickup = shop.pickupAvailable !== false && method !== 'delivery'
  const delivery = shop.deliveryAvailable === true && method !== 'pickup'
  const address = shop.pickupAddress
  const minimum = Number(shop.minimumOrderAmount ?? 0)
  return (
    <div className="shop-fulfilment">
      {pickup && (
        <div>
          <h4>Pickup</h4>
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
          {shop.pickupInstructions && <p>{shop.pickupInstructions}</p>}
        </div>
      )}
      {delivery && (
        <div>
          <h4>Delivery</h4>
          {shop.deliveryInstructions && <p>{shop.deliveryInstructions}</p>}
        </div>
      )}
      {!method && Number.isFinite(minimum) && minimum > 0 && (
        <p>Minimum order: {formatPrice(minimum, 'EUR')}</p>
      )}
      <WhatsAppGroupLink url={shop.whatsappGroupUrl} />
    </div>
  )
}
