import type { CartItem, Product } from '../types/marketplace'
import { effectiveMinimumQuantity } from '../utils/productUnits'

export interface CartState {
  items: CartItem[]
}

export type CartAction =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; product: Product; quantity?: number; replaceShop?: boolean }
  | { type: 'update'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items.filter((item) => item.quantity > 0) }
    case 'add': {
      if (action.product.stock <= 0) return state
      const conflict = state.items.some(
        (item) =>
          item.product.shopSlug === action.product.shopSlug &&
          item.product.scheduledMenuId !== action.product.scheduledMenuId,
      )
      if (conflict && !action.replaceShop) return state
      if (conflict)
        state = {
          items: state.items.filter((item) => item.product.shopSlug !== action.product.shopSlug),
        }
      const minimum = effectiveMinimumQuantity(action.product)
      const quantity = Math.max(1, action.quantity ?? 1)
      const existing = state.items.find((item) => item.product.id === action.product.id)
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === action.product.id
              ? {
                  // Refresh the product so selling format/rule changes reach older carts.
                  product: action.product,
                  quantity: Math.min(
                    Math.max(item.quantity + quantity, minimum),
                    action.product.stock,
                  ),
                }
              : item,
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            product: action.product,
            quantity: Math.min(Math.max(quantity, minimum), action.product.stock),
          },
        ],
      }
    }
    case 'update':
      if (action.quantity <= 0) {
        return { items: state.items.filter((item) => item.product.id !== action.productId) }
      }
      return {
        items: state.items.map((item) =>
          item.product.id === action.productId
            ? {
                ...item,
                quantity: Math.min(
                  Math.max(action.quantity, effectiveMinimumQuantity(item.product)),
                  item.product.stock,
                ),
              }
            : item,
        ),
      }
    case 'remove':
      return { items: state.items.filter((item) => item.product.id !== action.productId) }
    case 'clear':
      return { items: [] }
  }
}
