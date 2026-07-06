import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/AuthContext'
import { CartProvider } from '../cart/CartContext'
import { env } from '../config/env'
import '../i18n'
import type { User } from '../types/marketplace'
import { productFixture } from '../test/fixtures'
import { Header } from './Header'
import { ProductCard } from './ProductCard'

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const seller: User = {
  id: 1,
  username: 'seller',
  email: 'seller@example.com',
  first_name: 'Sell',
  last_name: 'Er',
  avatar_url: '',
  is_seller: true,
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <Header />
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('Header authentication menu', () => {
  const logout = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    logout.mockClear()
    mockedUseAuth.mockReturnValue({ user: null, loading: false, logout })
  })

  it('shows the environment-aware login action when logged out', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', env.loginUrl)
    expect(screen.queryByRole('button', { name: 'User menu' })).not.toBeInTheDocument()
  })

  it('shows a Become a Seller CTA linking to main-site signup when logged out', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Become a Seller' })).toHaveAttribute(
      'href',
      env.sellerSignupUrl,
    )
  })

  it('opens the logged-in user menu with account, orders, seller and logout actions', async () => {
    mockedUseAuth.mockReturnValue({ user: seller, loading: false, logout })
    renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'User menu' }))

    expect(screen.getByRole('menuitem', { name: 'My Account' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'My Orders' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Seller Portal' })).toHaveAttribute(
      'href',
      '/seller',
    )
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument()
  })

  it('calls the shared logout action from the user menu', async () => {
    mockedUseAuth.mockReturnValue({ user: seller, loading: false, logout })
    renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'User menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Logout' }))
    expect(logout).toHaveBeenCalledOnce()
  })

  it('hides Become a Seller and Seller Portal from logged-in normal users', async () => {
    mockedUseAuth.mockReturnValue({
      user: { ...seller, is_seller: false },
      loading: false,
      logout,
    })
    renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'User menu' }))
    expect(screen.queryByRole('menuitem', { name: 'Become a Seller' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Seller Portal' })).not.toBeInTheDocument()
  })

  it('updates the cart badge immediately after a product is added', async () => {
    render(
      <MemoryRouter>
        <CartProvider>
          <Header />
          <ProductCard product={productFixture} />
        </CartProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /add to cart: test product/i }))
    expect(screen.getByRole('link', { name: /cart/i })).toHaveTextContent('1')
  })

  it('switches between dark and light themes and persists the choice', async () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: 'Switch to light mode' })
    await userEvent.click(toggle)
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(localStorage.getItem('guidewisey-marketplace-theme')).toBe('light')
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })
})
