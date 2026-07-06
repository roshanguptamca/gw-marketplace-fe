const RESERVED_SUBDOMAINS = new Set(['www', 'market', 'shop'])
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function validSlug(value: string | undefined): string | null {
  if (!value) return null
  const slug = value.trim().toLowerCase()
  return SLUG_PATTERN.test(slug) ? slug : null
}

export function getShopSlugFromHostname(hostname: string): string | null {
  const normalized = hostname.toLowerCase().split(':')[0].replace(/\.$/, '')
  const parts = normalized.split('.')

  if (parts.length === 2 && parts[1] === 'localhost') {
    return RESERVED_SUBDOMAINS.has(parts[0]) ? null : validSlug(parts[0])
  }

  if (
    parts.length === 4 &&
    parts[1] === 'shop' &&
    parts[2] === 'guidewisey' &&
    parts[3] === 'com'
  ) {
    return RESERVED_SUBDOMAINS.has(parts[0]) ? null : validSlug(parts[0])
  }

  return null
}

export function getShopSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/shop\/([^/?#]+)(?:\/|$)/i)
  if (!match) return null

  try {
    return validSlug(decodeURIComponent(match[1]))
  } catch {
    return null
  }
}

export function resolveShopSlug(hostname: string, pathname: string): string | null {
  return getShopSlugFromHostname(hostname) ?? getShopSlugFromPath(pathname)
}

export function isShopHostname(hostname: string): boolean {
  return getShopSlugFromHostname(hostname) !== null
}
