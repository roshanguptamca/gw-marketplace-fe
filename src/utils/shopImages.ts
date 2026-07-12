export const DEFAULT_SHOP_LOGO_URL = '/guidewisey-default-shop-logo.svg'
export const DEFAULT_SHOP_BANNER_URL = '/guidewisey-default-shop-banner.svg'

export function getShopLogoUrl(url?: string) {
  return url && url.trim() ? url : DEFAULT_SHOP_LOGO_URL
}

export function getShopBannerUrl(url?: string) {
  return url && url.trim() ? url : DEFAULT_SHOP_BANNER_URL
}
