import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../config/env'
import { marketplaceService } from '../services/marketplaceService'
import {
  packProductFixture,
  productFixture,
  secondProductFixture,
  secondShopFixture,
  shopFixture,
  weightProductFixture,
} from '../test/fixtures'
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
    getShopCategories: vi.fn(),
    getShopProducts: vi.fn(),
    getProductDetails: vi.fn(),
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    search: vi.fn(),
    createOrderRequest: vi.fn(),
    lookupAddress: vi.fn(),
    getBuyerOrders: vi.fn(),
    getBuyerOrder: vi.fn(),
    getPickupSchedule: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)

describe('marketplace pages', () => {
  beforeEach(() => {
    service.getShops.mockResolvedValue([shopFixture])
    service.getShopBySlug.mockResolvedValue(shopFixture)
    service.getShopCategories.mockResolvedValue([{ slug: 'home', name: 'Home', productCount: 1 }])
    service.getShopProducts.mockResolvedValue([productFixture])
    service.getProductDetails.mockResolvedValue(productFixture)
    service.getProducts.mockResolvedValue([productFixture])
    service.getCategories.mockResolvedValue([{ slug: 'spices', name: 'Spices', productCount: 3 }])
    service.search.mockResolvedValue({
      shops: [],
      products: [],
      totalShops: 0,
      totalProducts: 0,
    })
    service.createOrderRequest.mockResolvedValue({
      id: 101,
      order_number: 'GW-TEST-101',
      shop_name: 'Test Shop',
      total: '12.50',
      status: 'pending',
    })
    service.lookupAddress.mockResolvedValue(null)
    service.getBuyerOrders.mockResolvedValue([])
    service.getPickupSchedule.mockResolvedValue({
      schedulingEnabled: false,
      timezone: 'Europe/Amsterdam',
      slotMinutes: 30,
      requiredLeadTimeHours: 0,
      earliestAvailablePickup: null,
      days: [],
    })
  })

  it('renders marketplace shops', async () => {
    renderPage(<MarketplaceHomePage />)
    expect(screen.getByRole('heading', { name: 'GuideWisey Marketplace' })).toBeInTheDocument()
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

  it('shows shop details in a popup from the banner instead of a full summary block', async () => {
    const { container } = renderPage(<ShopStorefrontPage resolvedSlug="test-shop" />)
    const shopHero = await screen.findByRole('heading', { name: 'Test Shop' })
    expect(shopHero).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /back to all shops/i })).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'More details about shop' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Shop details')).not.toBeInTheDocument()
    expect(container.querySelector('.shop-hero')).not.toHaveTextContent(shopFixture.country ?? '')
    expect(container.querySelector('.shop-hero')).not.toHaveTextContent(shopFixture.description)
    await userEvent.click(screen.getByRole('button', { name: 'More details about shop' }))
    expect(await screen.findByRole('dialog', { name: 'Test Shop' })).toBeInTheDocument()
    expect(await screen.findByText(/test city, netherlands/i)).toBeInTheDocument()
    expect(screen.getAllByText(shopFixture.description)).toHaveLength(1)
    expect(await screen.findByText('Opening hours')).toBeInTheDocument()
  })

  it('shows configured WhatsApp and pickup details without rendering absent links', async () => {
    service.getShopBySlug.mockResolvedValueOnce({
      ...shopFixture,
      whatsappGroupUrl: 'https://chat.whatsapp.com/TestGroup123',
      pickupAddress: {
        addressLine1: 'Market Lane 7',
        addressLine2: '',
        postalCode: '1234 AB',
        city: 'Test City',
        country: 'NL',
      },
      pickupInstructions: 'Call before collection.',
      minimumOrderAmount: '25.00',
    })
    renderPage(<ShopStorefrontPage resolvedSlug="test-shop" />)
    expect(
      (await screen.findByRole('link', { name: 'Join WhatsApp Group' })).getAttribute('href'),
    ).toBe('https://chat.whatsapp.com/TestGroup123')
    await userEvent.click(screen.getByRole('button', { name: 'More details about shop' }))
    expect(screen.getAllByRole('link', { name: 'Join WhatsApp Group' })).toHaveLength(2)
    expect(screen.getByText('Market Lane 7', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Call before collection.')).toBeInTheDocument()
    expect(screen.getByText('Minimum order: €25.00')).toBeInTheDocument()
  })

  it('hides disabled pickup and unsafe or missing WhatsApp links', async () => {
    service.getShopBySlug.mockResolvedValueOnce({
      ...shopFixture,
      pickupAvailable: false,
      whatsappGroupUrl: 'javascript:alert(1)',
      pickupAddress: {
        addressLine1: 'Hidden Road',
        addressLine2: '',
        postalCode: '',
        city: '',
        country: '',
      },
    })
    renderPage(<ShopStorefrontPage resolvedSlug="test-shop" />)
    await screen.findByRole('heading', { name: 'Test Shop' })
    await userEvent.click(screen.getByRole('button', { name: 'More details about shop' }))
    expect(screen.queryByRole('link', { name: 'Join WhatsApp Group' })).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden Road', { exact: false })).not.toBeInTheDocument()
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
    service.getShopCategories.mockResolvedValueOnce([
      { slug: 'home', name: 'Home', productCount: 1 },
      { slug: 'other', name: 'Other', productCount: 1 },
    ])
    service.getShopProducts.mockImplementation((_slug, filters) =>
      Promise.resolve(filters?.category === 'other' ? [other] : [productFixture, other]),
    )
    renderPage(<ProductListingPage resolvedSlug="test-shop" />)
    expect(await screen.findByText('Test Product')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /go to cart/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(await screen.findByText('Other Product')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Other' }))
    await waitFor(() => expect(screen.queryByText('Test Product')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(await screen.findByText('Test Product')).toBeInTheDocument()
  })

  it('uses URL filters for shop product search and category selection', async () => {
    service.getShopCategories.mockResolvedValueOnce([
      { slug: 'home', name: 'Home', productCount: 1 },
      { slug: 'other', name: 'Other', productCount: 1 },
    ])
    renderPage(
      <ProductListingPage resolvedSlug="test-shop" />,
      '/shop/test-shop/products?search=test&category=home',
    )

    expect(await screen.findByText('Test Product')).toBeInTheDocument()
    expect(screen.getByLabelText('Search products in this shop')).toHaveValue('test')
    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('active')
    expect(service.getShopProducts).toHaveBeenCalledWith('test-shop', {
      search: 'test',
      category: 'home',
    })
  })

  it('debounces search and clears or resets shop product filters', async () => {
    service.getShopCategories.mockResolvedValueOnce([
      { slug: 'home', name: 'Home', productCount: 1 },
      { slug: 'other', name: 'Other', productCount: 1 },
    ])
    renderPage(<ProductListingPage resolvedSlug="test-shop" />)
    const search = await screen.findByLabelText('Search products in this shop')

    await userEvent.type(search, 'test')
    await waitFor(() =>
      expect(service.getShopProducts).toHaveBeenLastCalledWith('test-shop', {
        search: 'test',
        category: '',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Other' }))
    expect(service.getShopProducts).toHaveBeenLastCalledWith('test-shop', {
      search: 'test',
      category: 'other',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveValue('')
    await waitFor(() =>
      expect(service.getShopProducts).toHaveBeenLastCalledWith('test-shop', {
        search: '',
        category: 'other',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    await waitFor(() =>
      expect(service.getShopProducts).toHaveBeenLastCalledWith('test-shop', {
        search: '',
        category: '',
      }),
    )
  })

  it('shows a filtered empty state with a reset action', async () => {
    service.getShopProducts.mockResolvedValueOnce([])
    renderPage(
      <ProductListingPage resolvedSlug="test-shop" />,
      '/shop/test-shop/products?search=missing',
    )

    expect(await screen.findByRole('heading', { name: 'No products found' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
  })

  it('shows a back-to-shop link on the products listing page', async () => {
    renderPage(<ProductListingPage resolvedSlug="test-shop" />)
    const backLink = await screen.findByRole('link', { name: /back to shop/i })
    expect(backLink).toHaveAttribute('href', '/shop/test-shop/')
  })

  it('shows a go-to-cart CTA on the listing page once an item is added', async () => {
    renderPage(<ProductListingPage resolvedSlug="test-shop" />)
    await screen.findByText('Test Product')
    await userEvent.click(screen.getByRole('button', { name: /add to cart: test product/i }))
    expect(screen.getByRole('link', { name: /go to cart/i })).toHaveAttribute('href', '/cart')
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
    expect(screen.getByText('Ingredients')).toBeInTheDocument()
    expect(screen.getByTestId('product-ingredients')).toHaveTextContent('Flour, water, salt')
    expect(screen.getByText('Allergens')).toBeInTheDocument()
    expect(screen.getByTestId('product-allergens')).toHaveTextContent('Gluten')
    expect(screen.queryByRole('link', { name: /go to cart/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show image 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(await screen.findByText('✓ Added to cart')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue Shopping' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Cart' })).toHaveAttribute('href', '/cart')
    expect(screen.getByRole('link', { name: 'Checkout' })).toHaveAttribute('href', '/checkout')
  })

  it('shows unavailable and missing product states', async () => {
    service.getProductDetails.mockResolvedValueOnce({ ...productFixture, stock: 0 })
    const first = renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled()
    first.unmount()
    service.getProductDetails.mockResolvedValueOnce({
      ...productFixture,
      ingredients: '',
      allergens: '',
    })
    const second = renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
    expect(await screen.findByRole('heading', { name: 'Test Product' })).toBeInTheDocument()
    expect(screen.queryByText('Ingredients')).not.toBeInTheDocument()
    expect(screen.queryByText('Allergens')).not.toBeInTheDocument()
    second.unmount()
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
    await userEvent.type(screen.getByLabelText('Street and house number'), 'Main Street')
    await userEvent.type(screen.getByLabelText('House number'), '1')
    await userEvent.type(screen.getByLabelText('Postcode'), '1000 AA')
    await userEvent.type(screen.getByLabelText('City'), 'Amsterdam')
    await userEvent.type(screen.getByLabelText('Notes to seller'), 'Please call me.')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
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
        delivery_address: 'Main Street 1, 1000 AA, Amsterdam, Netherlands',
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
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
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
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    expect(await screen.findByRole('link', { name: 'View order' })).toHaveAttribute(
      'href',
      '/account/orders',
    )
    expect(
      screen.queryByRole('link', { name: 'Create account to track your order' }),
    ).not.toBeInTheDocument()
  })

  it('shows a delivery fee for delivery based on shop settings, and none for pickup', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    // Pickup is the default delivery method — no delivery fee should be charged.
    expect((await screen.findAllByText('Pickup')).length).toBeGreaterThan(0)
    const deliveryFeeRow = screen.getByText('Delivery fee').closest('.checkout-total')
    expect(deliveryFeeRow).toHaveTextContent('Free')

    await userEvent.click(await screen.findByRole('radio', { name: 'Delivery' }))
    await waitFor(() => {
      expect(screen.getByText('Delivery fee').closest('.checkout-total')).toHaveTextContent('€5.00')
    })
  })

  it('shows the estimated total including the delivery fee', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
    await userEvent.click(await screen.findByRole('radio', { name: 'Delivery' }))
    await waitFor(() => {
      expect(screen.getByText('Estimated total').closest('.checkout-total')).toHaveTextContent(
        '€17.50',
      )
    })
  })

  it('enforces each shop minimum independently and shows the remaining amount', async () => {
    service.getShopBySlug.mockImplementation((slug) =>
      Promise.resolve(
        slug === 'other-shop'
          ? { ...secondShopFixture, minimumOrderAmount: '15.00' }
          : { ...shopFixture, minimumOrderAmount: '10.00' },
      ),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 2 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CheckoutPage />)
    await screen.findByText('Minimum order: €15.00')
    expect(screen.getByText('€7.00 more required to place an order.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Full name'), 'Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Minimum order for Other Shop is €15.00. Please add €7.00 more',
    )
    expect(service.createOrderRequest).not.toHaveBeenCalled()
  })

  it('submits separate configured fulfilment methods for each shop', async () => {
    service.getShopBySlug.mockImplementation((slug) =>
      Promise.resolve(
        slug === 'other-shop'
          ? { ...secondShopFixture, pickupAvailable: false, deliveryAvailable: true }
          : { ...shopFixture, pickupAvailable: true, deliveryAvailable: false },
      ),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 1 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CheckoutPage />)
    await screen.findByRole('radio', { name: 'Delivery' })
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    await userEvent.type(screen.getByLabelText('Full name'), 'Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.type(screen.getByLabelText('Street and house number'), 'Lane')
    await userEvent.type(screen.getByLabelText('House number'), '1')
    await userEvent.type(screen.getByLabelText(/Postcode|Postal code/), '1234 AB')
    await userEvent.type(screen.getByLabelText('City'), 'Town')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
    await waitFor(() => expect(service.createOrderRequest).toHaveBeenCalledTimes(2))
    expect(service.createOrderRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        shop_id: 1,
        order_type: 'pickup',
        delivery_address: '',
      }),
    )
    expect(service.createOrderRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        shop_id: 2,
        order_type: 'delivery',
        delivery_address: expect.stringContaining('Lane'),
      }),
    )
  })

  it('explains the current server-side minimum if prices changed since cart loading', async () => {
    const { ApiError } = await import('../services/apiClient')
    service.createOrderRequest.mockRejectedValueOnce(
      new ApiError('Shop minimum order not met.', 400, 'SHOP_MINIMUM_ORDER_NOT_MET', {
        code: 'SHOP_MINIMUM_ORDER_NOT_MET',
        shop_id: 1,
        shop_name: 'Test Shop',
        minimum_order_amount: '20.00',
        current_subtotal: '12.50',
        remaining_amount: '7.50',
      }),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [{ product: productFixture, quantity: 1 }],
      }),
    )
    renderPage(<CheckoutPage />)
    await screen.findByRole('radio', { name: 'Pickup' })
    await userEvent.type(screen.getByLabelText('Full name'), 'Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Minimum order for Test Shop is €20.00. Please add €7.50 more',
    )
  })

  it('preserves unsubmitted shops when a later shop request fails', async () => {
    service.getShopBySlug.mockImplementation((slug) =>
      Promise.resolve(slug === 'other-shop' ? secondShopFixture : shopFixture),
    )
    service.createOrderRequest
      .mockResolvedValueOnce({
        id: 101,
        order_number: 'GW-TEST-101',
        shop_name: 'Test Shop',
        total: '12.50',
        status: 'pending',
      })
      .mockRejectedValueOnce(new Error('Seller temporarily unavailable'))
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 1 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CheckoutPage />)
    await screen.findAllByRole('radio', { name: 'Pickup' })
    await userEvent.type(screen.getByLabelText('Full name'), 'Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('GW-TEST-101')
    expect(screen.getByRole('alert')).toHaveTextContent('Seller temporarily unavailable')
    expect(screen.queryByText('Test Product')).not.toBeInTheDocument()
    expect(screen.getByText('Other Product')).toBeInTheDocument()
  })

  it('shows a friendly message and login CTA when the account already exists', async () => {
    const { ApiError } = await import('../services/apiClient')
    service.createOrderRequest.mockRejectedValueOnce(
      new ApiError('duplicate', 400, 'ACCOUNT_ALREADY_EXISTS'),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
    await userEvent.type(screen.getByLabelText('Full name'), 'Guest Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'existing@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    expect(
      await screen.findByText(/an account already exists with this email/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in to continue' })).toHaveAttribute(
      'href',
      env.loginUrlWithNext('/checkout'),
    )
  })

  it('finds an address via postcode lookup when enabled, with manual fallback on failure', async () => {
    const original = env.addressLookupEnabled
    env.addressLookupEnabled = true
    try {
      localStorage.setItem(
        'guidewisey-marketplace-cart',
        JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
      )
      renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
      await userEvent.click(await screen.findByRole('radio', { name: 'Delivery' }))

      service.lookupAddress.mockResolvedValueOnce({
        street: 'Main Street',
        city: 'Amsterdam',
        country: 'Netherlands',
      })
      await userEvent.type(screen.getByLabelText('Postcode'), '1000AA')
      await userEvent.type(screen.getByLabelText('House number'), '1')
      await userEvent.click(screen.getByRole('button', { name: 'Find address' }))

      await waitFor(() => {
        expect(screen.getByLabelText('Street and house number')).toHaveValue('Main Street')
      })
      expect(screen.getByLabelText('City')).toHaveValue('Amsterdam')

      service.lookupAddress.mockResolvedValueOnce(null)
      await userEvent.click(screen.getByRole('button', { name: 'Find address' }))
      expect(
        await screen.findByText(/we could not find the address automatically/i),
      ).toBeInTheDocument()
      // Manual entry must still be possible.
      await userEvent.clear(screen.getByLabelText('Street and house number'))
      await userEvent.type(screen.getByLabelText('Street and house number'), 'Manual Street 5')
      expect(screen.getByLabelText('Street and house number')).toHaveValue('Manual Street 5')
    } finally {
      env.addressLookupEnabled = original
    }
  })

  it('prompts guests at checkout to create an account or continue as guest', () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    expect(
      screen.getByRole('heading', { name: 'Save your orders & track deliveries' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Create a free account to view order history, request cancellations, and get faster checkout next time.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Create an account to track my order')).not.toBeChecked()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeInTheDocument()
  })

  it('shows password fields once a guest opts to create an account', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    await userEvent.click(screen.getByLabelText('Create an account to track my order'))

    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue as guest' })).not.toBeInTheDocument()
  })

  it('blocks submit when the create-account passwords do not match', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    await userEvent.type(screen.getByLabelText('Full name'), 'Guest Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByLabelText('Create an account to track my order'))
    await userEvent.type(screen.getByLabelText('Password'), 'StrongPass123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Different123!')
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(service.createOrderRequest).not.toHaveBeenCalled()
  })

  it('sends the create_account payload with password fields when requested', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    service.createOrderRequest.mockResolvedValue({
      id: 1,
      order_number: 'GW-TEST-102',
      shop_name: 'Test Shop',
      total: '12.50',
      status: 'pending',
    })
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    await userEvent.type(screen.getByLabelText('Full name'), 'Guest Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByLabelText('Create an account to track my order'))
    await userEvent.type(screen.getByLabelText('Password'), 'StrongPass123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'StrongPass123!')
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    await screen.findByRole('heading', { name: 'Your order request has been sent to the seller.' })
    expect(service.createOrderRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        create_account: true,
        password: 'StrongPass123!',
        password_confirm: 'StrongPass123!',
      }),
    )
    expect(screen.getByText(/We've created your account\. Check/)).toBeInTheDocument()
    expect(screen.getByText('guest@example.com')).toBeInTheDocument()
  })

  it('does not require a password for guest checkout without account creation', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    await userEvent.type(screen.getByLabelText('Full name'), 'Guest Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    await screen.findByRole('heading', { name: 'Your order request has been sent to the seller.' })
    expect(service.createOrderRequest).toHaveBeenCalledWith(
      expect.not.objectContaining({ create_account: true }),
    )
    expect(
      await screen.findByRole('link', { name: 'Create account to track your order' }),
    ).toBeInTheDocument()
  })

  it('hides the create-account option for already logged-in buyers', () => {
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
    expect(screen.queryByLabelText('Create an account to track my order')).not.toBeInTheDocument()
  })

  it('dismisses the account prompt when a guest chooses to continue without an account', async () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    expect(
      screen.getByRole('heading', { name: 'Save your orders & track deliveries' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continue as guest' }))
    expect(
      screen.queryByRole('heading', { name: 'Save your orders & track deliveries' }),
    ).not.toBeInTheDocument()
  })

  it('does not show the account prompt to already logged-in buyers', () => {
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
    expect(
      screen.queryByRole('heading', { name: 'Save your orders & track deliveries' }),
    ).not.toBeInTheDocument()
  })

  it('links the terms checkbox copy to the Terms & Conditions and Privacy Policy pages', () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    expect(screen.getByLabelText(/i have read and agree/i)).toBeRequired()
    expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute(
      'href',
      env.termsUrl,
    )
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      env.privacyUrl,
    )
  })

  it('links "Continue shopping" back to the single shop when the cart has one shop', () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute(
      'href',
      '/shop/test-shop/',
    )
    expect(screen.getByRole('link', { name: /back to cart/i })).toHaveAttribute('href', '/cart')
  })

  it('links "Continue shopping" to the marketplace home when the cart has multiple shops', () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 1 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute('href', '/')
  })

  it('groups the checkout order summary by shop for a multi-shop cart', async () => {
    service.getShopBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === secondShopFixture.slug ? secondShopFixture : shopFixture),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 1 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })

    expect(await screen.findByText('Test Shop')).toBeInTheDocument()
    expect(await screen.findByText('Other Shop')).toBeInTheDocument()
    expect(screen.getAllByText('Shop subtotal').length).toBe(2)
    expect(screen.getByText('Grand total')).toBeInTheDocument()
    expect(screen.queryByText('Estimated total')).not.toBeInTheDocument()
  })

  it('submits one order per shop when the cart has multiple shops', async () => {
    service.getShopBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === secondShopFixture.slug ? secondShopFixture : shopFixture),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 1 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CheckoutPage />, '/', { user: null, loading: false, logout: async () => {} })
    await userEvent.type(screen.getByLabelText('Full name'), 'Multi Shop Buyer')
    await userEvent.type(screen.getByLabelText('Email'), 'multishop@example.com')
    await userEvent.type(screen.getByLabelText('Phone'), '+31612345678')
    await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))

    await screen.findByRole('heading', {
      name: 'Your order request has been sent to the seller.',
    })
    expect(service.createOrderRequest).toHaveBeenCalledTimes(2)
    expect(service.createOrderRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ shop_id: Number(productFixture.shopId) }),
    )
    expect(service.createOrderRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ shop_id: Number(secondProductFixture.shopId) }),
    )
  })

  it('groups the cart page items by shop and shows per-shop subtotals for a multi-shop cart', async () => {
    service.getShopBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === secondShopFixture.slug ? secondShopFixture : shopFixture),
    )
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({
        items: [
          { product: productFixture, quantity: 1 },
          { product: secondProductFixture, quantity: 1 },
        ],
      }),
    )
    renderPage(<CartPage />)

    expect((await screen.findAllByText('Test Shop')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Other Shop').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute('href', '/')
  })

  it('links "Continue shopping" back to the single shop on the cart page', () => {
    localStorage.setItem(
      'guidewisey-marketplace-cart',
      JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
    )
    renderPage(<CartPage />)
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute(
      'href',
      '/shop/test-shop/',
    )
  })
  describe('product selling formats and pickup scheduling', () => {
    const schedule = {
      schedulingEnabled: true,
      timezone: 'Europe/Amsterdam',
      slotMinutes: 30,
      requiredLeadTimeHours: 48,
      earliestAvailablePickup: '2026-10-03T14:00:00+02:00',
      days: [
        {
          date: '2026-10-03',
          label: 'Saturday 3 October 2026',
          slots: [
            {
              start: '2026-10-03T14:00:00+02:00',
              end: '2026-10-03T14:30:00+02:00',
              date: '2026-10-03',
              label: '14:00–14:30',
            },
            {
              start: '2026-10-03T14:30:00+02:00',
              end: '2026-10-03T15:00:00+02:00',
              date: '2026-10-03',
              label: '14:30–15:00',
            },
          ],
        },
      ],
    }

    const fillContact = async () => {
      await userEvent.type(screen.getByLabelText('Full name'), 'Buyer')
      await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
      await userEvent.type(screen.getByLabelText('Phone'), '0612345678')
      await userEvent.click(screen.getByLabelText(/i have read and agree/i))
    }

    it('shows pack details, configured rules and a rule-aware quantity selector', async () => {
      service.getProductDetails.mockResolvedValueOnce(packProductFixture)
      renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
      expect(await screen.findByTestId('product-selling-format')).toHaveTextContent(
        '2 pieces per pack',
      )
      expect(screen.getByText('€5.00 per pack')).toBeInTheDocument()
      const rules = screen.getByTestId('product-ordering-rules')
      expect(rules).toHaveTextContent('Minimum order: 10 pieces')
      expect(rules).toHaveTextContent('Minimum amount: €20.00')
      expect(rules).toHaveTextContent('Order at least 48 hours in advance')
      expect(screen.getByTestId('product-quantity')).toHaveTextContent('5')
      expect(screen.getByTestId('product-physical-total')).toHaveTextContent('10 pieces')
      expect(screen.getByTestId('product-line-total')).toHaveTextContent('€25.00')
      expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
      expect(screen.getByTestId('product-physical-total')).toHaveTextContent('12 pieces')
      await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
      const stored = JSON.parse(localStorage.getItem('guidewisey-marketplace-cart') ?? '{}')
      expect(stored.items[0].quantity).toBe(6)
    })

    it('shows weight totals for weight-based products', async () => {
      service.getProductDetails.mockResolvedValueOnce(weightProductFixture)
      renderPage(<ProductDetailsPage resolvedSlug="test-shop" />)
      expect(await screen.findByTestId('product-selling-format')).toHaveTextContent('250 g')
      expect(screen.getByTestId('product-ordering-rules')).toHaveTextContent(
        'Minimum: 2 packs / 500 g',
      )
      expect(screen.getByTestId('product-physical-total')).toHaveTextContent('500 g')
      expect(screen.getByTestId('product-line-total')).toHaveTextContent('€10.00')
    })

    it('explains unit calculations and rule problems in the cart', async () => {
      localStorage.setItem(
        'guidewisey-marketplace-cart',
        JSON.stringify({
          items: [
            { product: packProductFixture, quantity: 3 },
            { product: weightProductFixture, quantity: 2 },
          ],
        }),
      )
      renderPage(<CartPage />)
      const units = screen.getAllByTestId('cart-item-units')
      expect(units[0]).toHaveTextContent('3 packs × 2 pieces (6 pieces)')
      expect(units[1]).toHaveTextContent('2 × 250 g (500 g)')
      expect(screen.getByText(/Samosa: order at least 10 pieces/)).toBeInTheDocument()
      const select = screen.getAllByLabelText('Quantity')[0]
      expect(select.querySelector('option')?.textContent).toBe('5')
    })

    it('requires and submits a backend pickup slot per shop', async () => {
      service.getPickupSchedule.mockResolvedValue(schedule)
      localStorage.setItem(
        'guidewisey-marketplace-cart',
        JSON.stringify({ items: [{ product: packProductFixture, quantity: 5 }] }),
      )
      renderPage(<CheckoutPage />)
      expect(await screen.findByTestId('required-preparation')).toHaveTextContent(
        'Required preparation: 48 hours',
      )
      expect(service.getPickupSchedule).toHaveBeenCalledWith('test-shop', ['product-pack'])
      expect(screen.getByText(/5 packs × 2 pieces \(10 pieces\)/)).toBeInTheDocument()
      await fillContact()
      expect(screen.getByLabelText('Pickup date')).toBeRequired()
      expect(screen.getByLabelText('Pickup time')).toBeRequired()
      await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
      expect(service.createOrderRequest).not.toHaveBeenCalled()

      await userEvent.selectOptions(screen.getByLabelText('Pickup date'), '2026-10-03')
      await userEvent.selectOptions(
        screen.getByLabelText('Pickup time'),
        '2026-10-03T14:30:00+02:00',
      )
      expect(screen.getByTestId('checkout-pickup-summary')).toHaveTextContent(
        'Saturday 3 October 2026, 14:30–15:00',
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
      await waitFor(() =>
        expect(service.createOrderRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            order_type: 'pickup',
            pickup_slot_start: '2026-10-03T14:30:00+02:00',
            items: [{ product_id: Number.NaN, quantity: 5 }],
          }),
        ),
      )
    })

    it('blocks checkout when a product minimum is not met', async () => {
      localStorage.setItem(
        'guidewisey-marketplace-cart',
        JSON.stringify({ items: [{ product: packProductFixture, quantity: 3 }] }),
      )
      renderPage(<CheckoutPage />)
      await screen.findByRole('radio', { name: 'Pickup' })
      await fillContact()
      await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Samosa: order at least 10 pieces')
      expect(service.createOrderRequest).not.toHaveBeenCalled()
    })

    it('validates phone numbers inline and prevents invalid checkout submissions', async () => {
      localStorage.setItem(
        'guidewisey-marketplace-cart',
        JSON.stringify({ items: [{ product: productFixture, quantity: 1 }] }),
      )
      renderPage(<CheckoutPage />)
      await screen.findByRole('radio', { name: 'Pickup' })
      await userEvent.type(screen.getByLabelText('Full name'), 'Buyer')
      await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com')
      await userEvent.type(screen.getByRole('textbox', { name: /Phone/ }), '123456')
      await userEvent.click(screen.getByLabelText(/i have read and agree/i))

      expect(screen.getByText('Enter a valid phone number with 7 to 15 digits.')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /Phone/ })).toHaveAttribute('aria-invalid', 'true')
      await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Enter a valid phone number with 7 to 15 digits.',
      )
      expect(service.createOrderRequest).not.toHaveBeenCalled()
    })

    it('explains a too-early pickup from the backend and reloads the slots', async () => {
      const { ApiError } = await import('../services/apiClient')
      service.getPickupSchedule.mockResolvedValue(schedule)
      service.createOrderRequest.mockRejectedValueOnce(
        new ApiError('too early', 400, 'PICKUP_TIME_TOO_EARLY', {
          code: 'PICKUP_TIME_TOO_EARLY',
          shop_id: 'shop-1',
          shop_name: 'Test Shop',
          required_lead_time_hours: 48,
          earliest_available_pickup: '2026-10-03T14:30:00+02:00',
        }),
      )
      localStorage.setItem(
        'guidewisey-marketplace-cart',
        JSON.stringify({ items: [{ product: packProductFixture, quantity: 5 }] }),
      )
      renderPage(<CheckoutPage />)
      await screen.findByLabelText('Pickup date')
      await fillContact()
      await userEvent.selectOptions(screen.getByLabelText('Pickup date'), '2026-10-03')
      await userEvent.selectOptions(
        screen.getByLabelText('Pickup time'),
        '2026-10-03T14:00:00+02:00',
      )
      const callsBefore = service.getPickupSchedule.mock.calls.length
      await userEvent.click(screen.getByRole('button', { name: 'Submit order request' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The selected pickup time for Test Shop is too early: the order needs 48 hours of preparation. Earliest available pickup: Saturday 3 October 14:30.',
      )
      await waitFor(() =>
        expect(service.getPickupSchedule.mock.calls.length).toBeGreaterThan(callsBefore),
      )
      expect(screen.getByLabelText('Pickup time')).toHaveValue('')
    })
  })
})
