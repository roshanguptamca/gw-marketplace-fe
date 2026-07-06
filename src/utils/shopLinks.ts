export function shopBasePath(shopSlug: string, hostname = window.location.hostname): string {
  return hostname === `${shopSlug}.localhost` || hostname === `${shopSlug}.shop.guidewisey.com`
    ? ''
    : `/shop/${shopSlug}`
}

export function shopPath(shopSlug: string, suffix = '', hostname?: string): string {
  const base = shopBasePath(shopSlug, hostname)
  return `${base}${suffix || '/'}`
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NL', {
    style: 'currency',
    currency,
  }).format(amount)
}
