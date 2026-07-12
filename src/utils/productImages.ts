import type { SyntheticEvent } from 'react'

export const DEFAULT_PRODUCT_IMAGE_URL = '/guidewisey-default-product.svg'

export function getProductImageUrl(imageUrl?: string | null) {
  return imageUrl && imageUrl.trim() ? imageUrl : DEFAULT_PRODUCT_IMAGE_URL
}

export function getFirstProductImageUrl(images?: string[] | null) {
  const first = images?.find((image) => image && image.trim())
  return getProductImageUrl(first)
}

export function handleProductImageError(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.dataset.fallbackApplied === 'true') return
  target.dataset.fallbackApplied = 'true'
  target.src = DEFAULT_PRODUCT_IMAGE_URL
}
