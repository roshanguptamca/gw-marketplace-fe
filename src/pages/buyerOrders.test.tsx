import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import { ApiError } from '../services/apiClient'
import { renderPage } from '../test/renderPage'
import type { BuyerOrder } from '../types/marketplace'
import { ProtectedBuyerRoute } from '../auth/ProtectedBuyerRoute'
import { env } from '../config/env'
import { BuyerOrderDetailPage } from './BuyerOrderDetailPage'
import { BuyerOrdersPage } from './BuyerOrdersPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getBuyerOrders: vi.fn(),
    getBuyerOrder: vi.fn(),
    cancelBuyerOrder: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)

const order: BuyerOrder = {
  id: 55,
  order_number: 'GW-55',
  shop_name: 'Test Shop',
  shop_slug: 'test-shop',
  customer_name: 'Buyer One',
  customer_email: 'buyer@example.com',
  customer_phone: '+31612345678',
  delivery_address: '',
  order_type: 'pickup',
  status: 'pending',
  payment_method: 'cash',
  payment_status: 'unpaid',
  subtotal: '12.50',
  discount_total: '0.00',
  delivery_fee: '0.00',
  total: '12.50',
  customer_note: '',
  seller_note: '',
  items: [
    { id: 1, product: 1, product_name: 'Test Product', unit_price: '12.50', quantity: 1, line_total: '12.50' },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const loggedInUser = {
  id: 1,
  username: 'buyer',
  email: 'buyer@example.com',
  first_name: 'Buyer',
  last_name: 'One',
  avatar_url: '',
  is_seller: false,
}

describe('buyer orders (My Orders inside marketplace)', () => {
  beforeEach(() => {
    service.getBuyerOrders.mockResolvedValue([order])
    service.getBuyerOrder.mockResolvedValue(order)
  })

  it('lists the buyer’s orders with a link to /account/orders/:id', async () => {
    renderPage(<BuyerOrdersPage />, '/account/orders', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    expect(await screen.findByText('GW-55')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View order' })).toHaveAttribute(
      'href',
      '/account/orders/55',
    )
  })

  it('shows order details including delivery fee and total', async () => {
    renderPage(<BuyerOrderDetailPage />, '/account/orders/55', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    expect(await screen.findByRole('heading', { name: 'Order GW-55' })).toBeInTheDocument()
    expect(screen.getByText(/Total: €12.50/)).toBeInTheDocument()
  })

  it('redirects unauthenticated shoppers to login with next back to /account/orders', () => {
    const assignMock = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    })
    renderPage(
      <ProtectedBuyerRoute nextPath="/account/orders">
        <BuyerOrdersPage />
      </ProtectedBuyerRoute>,
      '/account/orders',
      { user: null, loading: false, logout: async () => {} },
    )
    expect(assignMock).toHaveBeenCalledWith(env.loginUrlWithNext('/account/orders'))
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('does not redirect while auth is still loading', () => {
    const assignMock = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    })
    renderPage(
      <ProtectedBuyerRoute nextPath="/account/orders">
        <BuyerOrdersPage />
      </ProtectedBuyerRoute>,
      '/account/orders',
      { user: null, loading: true, logout: async () => {} },
    )
    expect(assignMock).not.toHaveBeenCalled()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('allows an authenticated buyer through without redirecting', async () => {
    const assignMock = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    })
    renderPage(
      <ProtectedBuyerRoute nextPath="/account/orders">
        <BuyerOrdersPage />
      </ProtectedBuyerRoute>,
      '/account/orders',
      { user: loggedInUser, loading: false, logout: async () => {} },
    )
    await waitFor(() => expect(screen.getByText('My Orders')).toBeInTheDocument())
    expect(assignMock).not.toHaveBeenCalled()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('routes /account/orders/:orderId through App-style nested routing', async () => {
    renderPage(
      <Routes>
        <Route path="/account/orders/:orderId" element={<BuyerOrderDetailPage />} />
      </Routes>,
      '/account/orders/55',
      { user: loggedInUser, loading: false, logout: async () => {} },
    )
    expect(await screen.findByRole('heading', { name: 'Order GW-55' })).toBeInTheDocument()
  })

  it('shows a Cancel order button for a pending order and cancels it on confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    service.cancelBuyerOrder.mockResolvedValue({ ...order, status: 'cancelled' })
    renderPage(<BuyerOrderDetailPage />, '/account/orders/55', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    const cancelButton = await screen.findByRole('button', { name: 'Cancel order' })
    await userEvent.click(cancelButton)
    await waitFor(() => expect(service.cancelBuyerOrder).toHaveBeenCalledWith(55))
    expect(await screen.findByText(/cancelled/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('does not cancel when the confirmation dialog is dismissed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage(<BuyerOrderDetailPage />, '/account/orders/55', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    const cancelButton = await screen.findByRole('button', { name: 'Cancel order' })
    await userEvent.click(cancelButton)
    expect(service.cancelBuyerOrder).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows an error message if cancelling fails', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    service.cancelBuyerOrder.mockRejectedValue(
      new ApiError('This order can no longer be cancelled directly.', 400),
    )
    renderPage(<BuyerOrderDetailPage />, '/account/orders/55', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    const cancelButton = await screen.findByRole('button', { name: 'Cancel order' })
    await userEvent.click(cancelButton)
    expect(await screen.findByText('This order can no longer be cancelled directly.')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('does not show a Cancel order button for an already-accepted order', async () => {
    service.getBuyerOrder.mockResolvedValue({ ...order, status: 'accepted' })
    renderPage(<BuyerOrderDetailPage />, '/account/orders/55', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    await screen.findByRole('heading', { name: 'Order GW-55' })
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
  })

  it('shows a Cancel link on the orders list for pending orders and cancels on click', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    service.cancelBuyerOrder.mockResolvedValue({ ...order, status: 'cancelled' })
    renderPage(<BuyerOrdersPage />, '/account/orders', {
      user: loggedInUser,
      loading: false,
      logout: async () => {},
    })
    const cancelButton = await screen.findByRole('button', { name: 'Cancel' })
    await userEvent.click(cancelButton)
    await waitFor(() => expect(service.cancelBuyerOrder).toHaveBeenCalledWith(55))
    expect(await screen.findByText('cancelled')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
