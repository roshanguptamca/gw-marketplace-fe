import { env } from '../config/env'

type AnalyticsEvent =
  | 'view_shop'
  | 'view_item'
  | 'search'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'select_delivery_method'
  | 'join_whatsapp_group'

interface EventParams {
  shop_id?: string
  item_id?: string
  value?: number
  currency?: string
  quantity?: number
  items?: Array<{ item_id: string; quantity: number; price?: number }>
  transaction_id?: string
  method?: 'pickup' | 'delivery'
}
type Gtag = (command: string, ...args: unknown[]) => void
const safeId = (id: string) => (/^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : undefined)

declare global {
  interface Window {
    dataLayer?: unknown[][]
    gtag?: Gtag
  }
}

let initialized = false
let lastRoute: string | null = null

export function sanitizePagePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0]
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return '/'
  const [first, second, third] = parts
  if (first === 'shop' && second) {
    if (third === 'products' && parts.length === 4) return '/shop/:shop/products/:product'
    if (third === 'products' && parts.length === 3) return '/shop/:shop/products'
    if (parts.length === 2) return '/shop/:shop'
  }
  if (first === 'products' && parts.length === 2) return '/products/:product'
  if (first === 'account' && second === 'orders') {
    return parts.length === 3 ? '/account/orders/:order' : '/account/orders'
  }
  if (first === 'seller') {
    if (second === 'products' && parts.length === 3) return '/seller/products/:product'
    if (second === 'orders' && parts.length === 3) return '/seller/orders/:order'
    if (parts.length <= 2 && (!second || /^[a-z-]+$/.test(second))) return path
  }
  if (['/', '/cart', '/checkout', '/products'].includes(path)) return path
  return '/other'
}

export function initializeAnalytics(): boolean {
  if (!env.gaMeasurementId || !/^G-[A-Z0-9]+$/.test(env.gaMeasurementId)) return false
  if (initialized) return true
  initialized = true
  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', env.gaMeasurementId, {
    send_page_view: false,
    page_location: `${window.location.origin}/`,
    page_referrer: '',
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(env.gaMeasurementId)}`
  document.head.appendChild(script)
  return true
}

export const analytics = {
  pageView(pathname: string) {
    if (!initializeAnalytics()) return
    const pagePath = sanitizePagePath(pathname)
    if (lastRoute === pathname) return
    lastRoute = pathname
    window.gtag?.('event', 'page_view', {
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_referrer: '',
      page_title: `GuideWisey Marketplace ${pagePath}`,
      send_to: env.gaMeasurementId,
    })
    if (pagePath === '/cart') analytics.event('view_cart')
    if (pagePath === '/checkout') analytics.event('begin_checkout')
  },
  event(name: AnalyticsEvent, params: EventParams = {}) {
    if (!initializeAnalytics()) return
    const payload: EventParams = {}
    if (params.shop_id && safeId(params.shop_id)) payload.shop_id = params.shop_id
    if (params.item_id && safeId(params.item_id)) payload.item_id = params.item_id
    if (params.transaction_id && safeId(params.transaction_id))
      payload.transaction_id = params.transaction_id
    if (params.currency && /^[A-Z]{3}$/.test(params.currency)) payload.currency = params.currency
    if (params.method === 'pickup' || params.method === 'delivery') payload.method = params.method
    if (params.value !== undefined && Number.isFinite(params.value)) payload.value = params.value
    if (params.quantity !== undefined && Number.isFinite(params.quantity))
      payload.quantity = params.quantity
    if (params.items)
      payload.items = params.items
        .filter(({ item_id, quantity }) => Boolean(safeId(item_id)) && Number.isFinite(quantity))
        .map(({ item_id, quantity, price }) => ({
          item_id,
          quantity,
          ...(price !== undefined && Number.isFinite(price) ? { price } : {}),
        }))
    const pagePath = sanitizePagePath(window.location.pathname)
    window.gtag?.('event', name, {
      ...payload,
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_title: `GuideWisey Marketplace ${pagePath}`,
      page_referrer: '',
      send_to: env.gaMeasurementId,
    })
  },
}
