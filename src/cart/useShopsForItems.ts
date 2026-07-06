import { useEffect, useState } from 'react'
import { marketplaceService } from '../services/marketplaceService'
import type { CartItem, Shop } from '../types/marketplace'

/**
 * Loads Shop records (name, delivery settings, etc.) for every distinct shop
 * represented in a set of cart items. Shared by the cart and checkout pages
 * so both can show shop names and compute per-shop delivery fees without
 * duplicating the fetch/caching logic.
 */
export function useShopsForItems(items: CartItem[]): Record<string, Shop> {
  const [shopsBySlug, setShopsBySlug] = useState<Record<string, Shop>>({})

  useEffect(() => {
    const slugs = [...new Set(items.map((item) => item.product.shopSlug).filter(Boolean))]
    const missing = slugs.filter((slug) => !(slug in shopsBySlug))
    if (missing.length === 0) return
    let active = true
    void Promise.all(missing.map((slug) => marketplaceService.getShopBySlug(slug))).then(
      (shops) => {
        if (!active) return
        setShopsBySlug((current) => {
          const next = { ...current }
          missing.forEach((slug, index) => {
            const shop = shops[index]
            if (shop) next[slug] = shop
          })
          return next
        })
      },
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return shopsBySlug
}
