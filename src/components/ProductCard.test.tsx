import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CartProvider, useCart } from '../cart/CartContext'
import '../i18n'
import { packProductFixture, productFixture, weightProductFixture } from '../test/fixtures'
import { ProductCard } from './ProductCard'

function CartCount() {
  const { itemCount } = useCart()
  return <output aria-label="count">{itemCount}</output>
}

function renderCard(stock = productFixture.stock) {
  render(
    <MemoryRouter>
      <CartProvider>
        <ProductCard product={{ ...productFixture, stock }} />
        <CartCount />
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  it('renders product information and adds to cart', async () => {
    renderCard()
    expect(screen.getByRole('heading', { name: 'Test Product' })).toBeInTheDocument()
    expect(screen.getByText('Featured')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /add to cart: test product/i }))
    expect(screen.getByLabelText('count')).toHaveTextContent('1')
    expect(screen.getByText('Added to cart')).toBeInTheDocument()
  })

  it('disables adding unavailable products', () => {
    renderCard(0)
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled()
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
  })

  it('shows the selling format and starts rule-based products at their minimum', async () => {
    render(
      <MemoryRouter>
        <CartProvider>
          <ProductCard product={packProductFixture} />
          <ProductCard product={weightProductFixture} />
          <CartCount />
        </CartProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('2 pieces')).toBeInTheDocument()
    expect(screen.getByText('250 g')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /add to cart: samosa/i }))
    expect(screen.getByLabelText('count')).toHaveTextContent('5')
  })

  it('does not label plain single-piece products', () => {
    renderCard()
    expect(screen.queryByText('1 piece')).not.toBeInTheDocument()
  })
})
