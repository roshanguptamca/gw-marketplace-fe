import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CartProvider } from '../cart/CartContext'
import { productFixture } from '../test/fixtures'
import { CartCallToAction } from './CartCallToAction'

function renderCta(withItem: boolean) {
  if (withItem) {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 2 }] }),
    )
  }
  return render(
    <MemoryRouter>
      <CartProvider>
        <CartCallToAction />
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('CartCallToAction', () => {
  it('renders nothing when the cart is empty', () => {
    renderCta(false)
    expect(screen.queryByRole('link', { name: /go to cart/i })).not.toBeInTheDocument()
  })

  it('shows an item count and a link to the cart when items are present', () => {
    renderCta(true)
    expect(screen.getByText('2 items in your cart')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to cart/i })).toHaveAttribute('href', '/cart')
  })
})
