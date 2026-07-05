import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { Product } from '../types/marketplace'
import { cartReducer, type CartState } from './cartReducer'

const STORAGE_KEY = 'guidewisey-marketplace-cart'

interface CartContextValue extends CartState {
  itemCount: number
  subtotal: number
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return { items: [] }
    const parsed = JSON.parse(saved) as CartState
    return Array.isArray(parsed.items) ? parsed : { items: [] }
  } catch {
    return { items: [] }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const addItem = useCallback(
    (product: Product, quantity?: number) => dispatch({ type: 'add', product, quantity }),
    [],
  )
  const updateQuantity = useCallback(
    (productId: string, quantity: number) => dispatch({ type: 'update', productId, quantity }),
    [],
  )
  const removeItem = useCallback((productId: string) => dispatch({ type: 'remove', productId }), [])
  const clearCart = useCallback(() => dispatch({ type: 'clear' }), [])

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      itemCount: state.items.reduce((total, item) => total + item.quantity, 0),
      subtotal: state.items.reduce((total, item) => total + item.quantity * item.product.price, 0),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [state, addItem, updateQuantity, removeItem, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
