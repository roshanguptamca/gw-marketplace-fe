import type { CartItem } from '../types/marketplace'

export interface ShopGroup {
  shopSlug: string
  items: CartItem[]
  subtotal: number
}

/**
 * Groups cart items by shop, preserving the order shops first appear in the
 * cart. Used to render a per-shop breakdown on the cart and checkout pages,
 * and to detect single- vs multi-shop carts for "Continue shopping" links.
 */
export function groupItemsByShop(items: CartItem[]): ShopGroup[] {
  const order: string[] = []
  const itemsBySlug = new Map<string, CartItem[]>()

  for (const item of items) {
    const slug = item.product.shopSlug
    if (!itemsBySlug.has(slug)) {
      itemsBySlug.set(slug, [])
      order.push(slug)
    }
    itemsBySlug.get(slug)!.push(item)
  }

  return order.map((shopSlug) => {
    const shopItems = itemsBySlug.get(shopSlug)!
    const subtotal = shopItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    )
    return { shopSlug, items: shopItems, subtotal }
  })
}
