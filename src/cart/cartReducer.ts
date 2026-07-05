import type { CartItem, Product } from '../types/marketplace'

export interface CartState {
  items: CartItem[]
}

export type CartAction =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; product: Product; quantity?: number }
  | { type: 'update'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items.filter((item) => item.quantity > 0) }
    case 'add': {
      if (action.product.stock <= 0) return state
      const quantity = Math.max(1, action.quantity ?? 1)
      const existing = state.items.find((item) => item.product.id === action.product.id)
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === action.product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + quantity, action.product.stock),
                }
              : item,
          ),
        }
      }
      return {
        items: [
          ...state.items,
          { product: action.product, quantity: Math.min(quantity, action.product.stock) },
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
            ? { ...item, quantity: Math.min(action.quantity, item.product.stock) }
            : item,
        ),
      }
    case 'remove':
      return { items: state.items.filter((item) => item.product.id !== action.productId) }
    case 'clear':
      return { items: [] }
  }
}
