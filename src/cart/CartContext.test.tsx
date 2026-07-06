import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { productFixture } from '../test/fixtures'
import { CartProvider, useCart } from './CartContext'

function Consumer() {
  const { items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart } = useCart()
  return (
    <>
      <output>{`${items.length}:${itemCount}:${subtotal}`}</output>
      <button onClick={() => addItem(productFixture, 2)}>add</button>
      <button onClick={() => updateQuantity(productFixture.id, 1)}>update</button>
      <button onClick={() => removeItem(productFixture.id)}>remove</button>
      <button onClick={clearCart}>clear</button>
    </>
  )
}

describe('CartProvider', () => {
  it('provides cart totals and actions', async () => {
    render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'add' }))
    expect(screen.getByText('1:2:25')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'update' }))
    expect(screen.getByText('1:1:12.5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'remove' }))
    expect(screen.getByText('0:0:0')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'add' }))
    await userEvent.click(screen.getByRole('button', { name: 'clear' }))
    expect(screen.getByText('0:0:0')).toBeInTheDocument()
  })

  it('loads persisted cart and tolerates invalid storage', () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 2 }] }),
    )
    const { unmount } = render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    expect(screen.getByText('1:2:25')).toBeInTheDocument()
    unmount()
    localStorage.setItem('guidewisey-marketplace-cart', '{bad')
    render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    expect(screen.getByText('0:0:0')).toBeInTheDocument()
  })

  it('rejects use outside a provider', () => {
    expect(() => render(<Consumer />)).toThrow('useCart must be used within CartProvider')
  })
})
