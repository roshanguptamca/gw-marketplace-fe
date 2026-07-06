export function shopBasePath(shopSlug: string, hostname = window.location.hostname): string {
  return hostname === `${shopSlug}.localhost` || hostname === `${shopSlug}.shop.guidewisey.com`
    ? ''
    : `/shop/${shopSlug}`
}

export function shopPath(shopSlug: string, suffix = '', hostname?: string): string {
  const base = shopBasePath(shopSlug, hostname)
  return `${base}${suffix || '/'}`
}

/**
 * Where "Continue shopping" should send the customer: back to the single
 * shop they're buying from, or to the marketplace home if their cart spans
 * multiple shops (there's no single "shop" to return to in that case).
 */
export function continueShoppingPath(shopSlugs: string[]): string {
  const unique = [...new Set(shopSlugs.filter(Boolean))]
  return unique.length === 1 ? shopPath(unique[0]) : '/'
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NL', {
    style: 'currency',
    currency,
  }).format(amount)
}
