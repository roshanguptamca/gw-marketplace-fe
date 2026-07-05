import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import { productFixture, shopFixture } from '../test/fixtures'
import { renderPage } from '../test/renderPage'
import { CartPage } from './CartPage'
import { CheckoutPage } from './CheckoutPage'
import { ErrorPage } from './ErrorPage'
import { MarketplaceHomePage } from './MarketplaceHomePage'
import { ProductDetailsPage } from './ProductDetailsPage'
import { ProductListingPage } from './ProductListingPage'
import { SellerNotFoundPage } from './SellerNotFoundPage'
import { ShopStorefrontPage } from './ShopStorefrontPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getShops: vi.fn(),
    getShopBySlug: vi.fn(),
    getShopProducts: vi.fn(),
    getProductDetails: vi.fn(),
    createOrderRequest: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)

describe('marketplace pages', () => {
  beforeEach(() => {
    service.getShops.mockResolvedValue([shopFixture])
    service.getShopBySlug.mockResolvedValue(shopFixture)
    service.getShopProducts.mockResolvedValue([productFixture])
    service.getProductDetails.mockResolvedValue(productFixture)
    service.createOrderRequest.mockResolvedValue({
      id: 101,
      order_number: 'GW-TEST-101',
      shop_name: 'Test Shop',
      total: '12.50',
      status: 'pending',
    })
  })

  it('renders marketplace shops', async () => {
    renderPage(<MarketplaceHomePage />)
    expect(screen.getByRole('heading', { name: /good things/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Test Shop' })).toBeInTheDocument()
  })

  it('renders empty and failed marketplace states', async () => {
    service.getShops.mockResolvedValueOnce([])
    const first = renderPage(<MarketplaceHomePage />)
    expect(await screen.findByText('No shops yet')).toBeInTheDocument()
    first.unmount()
    service.getShops.mockRejectedValueOnce(new Error('offline'))
    renderPage(<MarketplaceHomePage />)
    expect(await screen.findByText('Shops are unavailable')).toBeInTheDocument()
  })

  it('renders a shop storefront and product', async () => {
    renderPage(<ShopStorefrontPage resolvedSlug="test-shop" />)
    expect(await screen.findByRole('heading', { name: 'Test Shop' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Test Product' })).toBeInTheDocument()
  })

  it('renders seller not found when shop is absent or errors', async () => {
    service.getShopBySlug.mockResolvedValueOnce(null)
    const first = renderPage(<ShopStorefrontPage resolvedSlug="missing" />)
    expect(await screen.findByText(/couldn’t find this shop/i)).toBeInTheDocument()
    first.unmount()
    service.getShopBySlug.mockRejectedValueOnce(new Error('offline'))
    renderPage(<ShopStorefrontPage resolvedSlug="missing" />)
    expect(await screen.findByText(/couldn’t find this shop/i)).toBeInTheDocument()
  })

  it('filters the product listing by category', async () => {
    const other = { ...productFixture, id: 'other', name: 'Other Product', category: 'Other' }
    service.getShopProducts.mockResolvedValueOnce([productFixture, other])
    renderPage(<ProductListingPage resolvedSlug="test-shop" />)
    expect(await screen.findByText('Test Product')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.queryByText('Other Product')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Other Product')).toBeInTheDocument()
  })

  it('handles listing errors and missing sellers', async () => {
    service.getShopProducts.mockRejectedValueOnce(new Error('offline'))
    const first = renderPage(<ProductListingPage resolvedSlug="test-shop" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i)
    first.unmount()
    service.getShopBySlug.mockResolvedValueOnce(null)
    renderPage(<ProductListingPage resolvedSlug="missing" />)
    expect(await screen.findByText(/couldn’t find this shop/i)).toBeInTheDocument()
  })

  it('shows the product gallery and adds to cart', async () => {
    renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
    expect(await screen.findByRole('heading', { name: 'Test Product' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show image 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(screen.getByRole('button', { name: /added to cart/i })).toBeInTheDocument()
  })

  it('shows unavailable and missing product states', async () => {
    service.getProductDetails.mockResolvedValueOnce({ ...productFixture, stock: 0 })
    const first = renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled()
    first.unmount()
    service.getProductDetails.mockResolvedValueOnce(null)
    renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
    expect(await screen.findByText('Product not found')).toBeInTheDocument()
  })

  it('renders empty cart, seller-not-found and generic errors', () => {
    const cart = renderPage(<CartPage />)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    cart.unmount()
    const seller = renderPage(<SellerNotFoundPage />)
    expect(screen.getByText(/couldn’t find this shop/i)).toBeInTheDocument()
    seller.unmount()
    renderPage(<ErrorPage title="Custom error" message="Custom message" />)
    expect(screen.getByText('Custom error')).toBeInTheDocument()
  })

  it('renders and edits a populated cart then submits checkout', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 2 }] }),
    )
    const cart = renderPage(<CartPage />)
    expect(screen.getByRole('heading', { name: 'Shopping cart' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Quantity'), '1')
    expect(screen.getAllByText('€12.50')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Proceed to checkout' })).toHaveAttribute(
      'href',
      '/checkout',
    )
    cart.unmount()
    renderPage(<CheckoutPage />)
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Full name'), 'Test Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/delivery/i))
    await userEvent.type(screen.getByLabelText('Street and house number'), 'Main Street 1')
    await userEvent.type(screen.getByLabelText('Postal code'), '1000 AA')
    await userEvent.type(screen.getByLabelText('City'), 'Amsterdam')
    await userEvent.type(screen.getByLabelText('Notes to seller'), 'Please call me.')
    await userEvent.click(screen.getByLabelText(/i confirm these order details/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Your order request has been sent to the seller.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('GW-TEST-101')).toBeInTheDocument()
    expect(service.createOrderRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: 'Test Buyer',
        order_type: 'delivery',
        delivery_address: 'Main Street 1, 1000 AA, Amsterdam',
      }),
    )
  })

  it('removes a cart item', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CartPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.getByText('Your cart is empty')).toBeInTheDocument())
  })

  it('shows an empty checkout without an order action', () => {
    renderPage(<CheckoutPage />)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit order request' })).not.toBeInTheDocument()
  })

  it('offers a create-account CTA to guests after checkout', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
    await userEvent.type(screen.getByLabelText('Full name'), 'Guest Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i confirm these order details/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    expect(
      await screen.findByRole('link', { name: 'Create account to track your order' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View order' })).not.toBeInTheDocument()
  })

  it('offers a view-order CTA to logged-in buyers after checkout', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', {
      user: {
        id: 1,
        username: 'buyer',
        email: 'buyer@example.com',
        first_name: 'Buyer',
        last_name: 'One',
        avatar_url: '',
        is_seller: false,
      },
      loading: false,
      logout: async () => {},
    })
    await userEvent.type(screen.getByLabelText('Full name'), 'Logged Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i confirm these order details/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    expect(await screen.findByRole('link', { name: 'View order' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Create account to track your order' }),
    ).not.toBeInTheDocument()
  })
})
