import type { SyntheticEvent } from 'react'

export const DEFAULT_SHOP_LOGO_URL = '/guidewisey-default-shop-logo.svg'
export const DEFAULT_SHOP_BANNER_URL = '/guidewisey-default-shop-banner.svg'

export function getShopLogoUrl(url?: string) {
  return url && url.trim() ? url : DEFAULT_SHOP_LOGO_URL
}

export function getShopBannerUrl(url?: string) {
  return url && url.trim() ? url : DEFAULT_SHOP_BANNER_URL
}

export function handleShopLogoError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.dataset.fallbackApplied === 'true') return
  target.dataset.fallbackApplied = 'true'
  target.src = DEFAULT_SHOP_LOGO_URL
}

export function handleShopBannerError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.dataset.fallbackApplied === 'true') return
  target.dataset.fallbackApplied = 'true'
  target.src = DEFAULT_SHOP_BANNER_URL
}
