import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import i18n from '../i18n'
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

  it('follows the selected language and switches back without a reload', async () => {
    renderCta(true)
    await act(() => i18n.changeLanguage('nl'))
    expect(screen.getByText('2 artikelen in je winkelwagen')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /naar winkelwagen/i })).toHaveAttribute('href', '/cart')
    await act(() => i18n.changeLanguage('en'))
    expect(screen.getByText('2 items in your cart')).toBeInTheDocument()
  })
})
