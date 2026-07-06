import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CartProvider } from '../cart/CartContext'
import '../i18n'
import { productFixture } from '../test/fixtures'
import { CartPage } from './CartPage'

function renderCart(withItem: boolean) {
  if (withItem) {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
  }
  render(
    <MemoryRouter initialEntries={['/cart']}>
      <CartProvider>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<h1>Checkout destination</h1>} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('cart checkout navigation', () => {
  it('hides the checkout action when the cart is empty', () => {
    renderCart(false)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Proceed to checkout' })).not.toBeInTheDocument()
  })

  it('shows the action with items and opens checkout when clicked', async () => {
    renderCart(true)
    const next = screen.getByRole('link', { name: 'Proceed to checkout' })
    expect(next).toBeVisible()
    await userEvent.click(next)
    expect(screen.getByRole('heading', { name: 'Checkout destination' })).toBeInTheDocument()
  })
})
