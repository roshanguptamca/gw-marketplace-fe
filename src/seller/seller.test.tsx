import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService, type ApiProduct } from '../services/marketplaceService'
import { renderPage } from '../test/renderPage'
import type { Campaign, Coupon, SellerCategory, SellerProduct } from '../types/marketplace'
import { SellerCampaignsPage } from './SellerCampaignsPage'
import { SellerCategoriesPage } from './SellerCategoriesPage'
import { SellerCouponsPage } from './SellerCouponsPage'
import { SellerDashboardPage } from './SellerDashboardPage'
import { SellerLayout } from './SellerLayout'
import { SellerOrdersPage } from './SellerOrdersPage'
import { SellerProductFormPage } from './SellerProductFormPage'
import { SellerProductsPage } from './SellerProductsPage'
import { SellerSettingsPage } from './SellerSettingsPage'
import { SellerPlaceholderPage } from './SellerPlaceholderPage'
import { SellerShopContactPage } from './SellerShopContactPage'
import { SellerShopDeliveryPage } from './SellerShopDeliveryPage'
import { SellerShopDetailsPage } from './SellerShopDetailsPage'
import { SellerShopHoursPage } from './SellerShopHoursPage'
import { SellerShopLogoBannerPage } from './SellerShopLogoBannerPage'
import { SellerShopNotificationsPage } from './SellerShopNotificationsPage'
import { SellerShopPreviewPage } from './SellerShopPreviewPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getSellerDashboard: vi.fn(),
    getSellerProducts: vi.fn(),
    getSellerOrders: vi.fn(),
    updateSellerOrderStatus: vi.fn(),
    getSellerShop: vi.fn(),
    updateSellerShop: vi.fn(),
    updateSellerShopForm: vi.fn(),
    getSellerSettings: vi.fn(),
    updateSellerSettings: vi.fn(),
    updateSellerProduct: vi.fn(),
    deleteSellerProduct: vi.fn(),
    getSellerCategories: vi.fn(),
    createSellerCategory: vi.fn(),
    updateSellerCategory: vi.fn(),
    deleteSellerCategory: vi.fn(),
    getSellerProduct: vi.fn(),
    createSellerProductForm: vi.fn(),
    updateSellerProductForm: vi.fn(),
    addSellerProductImage: vi.fn(),
    deleteSellerProductImage: vi.fn(),
    getSellerCoupons: vi.fn(),
    createSellerCoupon: vi.fn(),
    updateSellerCoupon: vi.fn(),
    deleteSellerCoupon: vi.fn(),
    getSellerCampaigns: vi.fn(),
    createSellerCampaign: vi.fn(),
    updateSellerCampaign: vi.fn(),
    deleteSellerCampaign: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)

const product: ApiProduct = {
  id: 1,
  shop: 1,
  name: 'Seller Product',
  slug: 'seller-product',
  description: 'Description',
  price: '14.00',
  stock_quantity: 4,
  image_url: '',
  external_image_url: '',
  images: [],
  is_featured: false,
  is_active: true,
  is_approved: true,
  sku: 'SKU-1',
}

const sellerProduct: SellerProduct = {
  id: 1,
  shop: 1,
  category: null,
  category_detail: null,
  name: 'Seller Product',
  slug: 'seller-product',
  description: 'Description',
  ingredients: '',
  allergens: '',
  price: '14.00',
  compare_at_price: null,
  stock_quantity: 4,
  sku: 'SKU-1',
  image_public_id: '',
  image_url: '',
  external_image_url: '',
  images: [
    {
      id: 10,
      product: 1,
      image_public_id: '',
      image_url: '/gallery.jpg',
      alt_text: '',
      sort_order: 0,
    },
  ],
  is_active: true,
  is_approved: true,
  is_featured: false,
}

const category: SellerCategory = {
  id: 5,
  shop: 1,
  name: 'Bakery',
  slug: 'bakery',
  is_global: false,
  is_active: true,
}

const coupon: Coupon = {
  id: 1,
  code: 'SAVE10',
  discount_type: 'percentage',
  discount_value: '10',
  min_order_amount: '0',
  usage_limit: null,
  used_count: 2,
  active: true,
  starts_at: null,
  ends_at: null,
}

const campaign: Campaign = {
  id: 1,
  title: 'Summer Sale',
  description: 'Big discounts',
  banner_image: null,
  starts_at: '2026-01-01T00:00',
  ends_at: '2026-01-31T00:00',
  active: true,
  featured_product: null,
}

describe('seller portal pages', () => {
  beforeEach(() => {
    service.getSellerDashboard.mockResolvedValue({
      total_products: 3,
      active_products: 2,
      total_orders: 6,
      pending_orders: 1,
      completed_orders: 4,
      today_sales: '10.00',
      month_sales: '50.00',
      low_stock_products: 1,
      pending_cancellations: 0,
      recent_orders: [
        {
          id: 9,
          order_number: 'GW-9',
          customer_name: 'Recent Customer',
          status: 'pending',
          total: '20.00',
          created_at: '2026-01-02',
        },
      ],
    })
    service.getSellerProducts.mockResolvedValue([product])
    service.getSellerOrders.mockResolvedValue([
      {
        id: 1,
        order_number: 'GW-1',
        customer_name: 'Customer',
        status: 'out_for_delivery',
        total: '14.00',
        created_at: '2026-01-01',
      },
    ])
    service.updateSellerOrderStatus.mockResolvedValue({
      id: 1,
      order_number: 'GW-1',
      customer_name: 'Customer',
      status: 'completed',
      total: '14.00',
      created_at: '2026-01-01',
    })
    service.getSellerShop.mockResolvedValue({
      id: '1',
      slug: 'seller',
      name: 'Seller Shop',
      tagline: 'Seller tagline',
      description: 'Shop description',
      shortDescription: 'Shop description',
      shopType: 'Bakery',
      phone: '+31 6 12345678',
      email: 'hello@example.com',
      websiteUrl: 'https://seller.example',
      socialLinks: [],
      address: 'Seller Street 1',
      logoUrl: '',
      bannerUrl: '',
      postalCode: '1000 AA',
      country: 'Netherlands',
      categories: [],
      location: 'Amsterdam',
      contactEmail: 'hello@example.com',
      contactPhone: '+31 6 12345678',
      whatsapp: '',
      pickupAvailable: true,
      deliveryAvailable: false,
      localDeliveryFee: 5,
      internationalDeliveryFee: 10,
      freeDeliveryAbove: 50,
      openingHours: [],
      active: true,
      approved: false,
    })
    service.updateSellerShop.mockResolvedValue({
      id: '1',
      slug: 'seller',
      name: 'Updated',
      tagline: 'Seller tagline',
      description: 'Shop description',
      shortDescription: 'Shop description',
      shopType: 'Bakery',
      phone: '+31 6 12345678',
      email: 'hello@example.com',
      websiteUrl: 'https://seller.example',
      socialLinks: [],
      address: 'Seller Street 1',
      logoUrl: '',
      bannerUrl: '',
      postalCode: '1000 AA',
      country: 'Netherlands',
      categories: [],
      location: 'Amsterdam',
      contactEmail: 'hello@example.com',
      contactPhone: '+31 6 12345678',
      whatsapp: '',
      pickupAvailable: true,
      deliveryAvailable: false,
      localDeliveryFee: 5,
      internationalDeliveryFee: 10,
      freeDeliveryAbove: 50,
      openingHours: [],
      active: true,
      approved: false,
    })
    service.updateSellerShopForm.mockResolvedValue({
      id: '1',
      slug: 'seller',
      name: 'Updated',
      tagline: 'Seller tagline',
      description: 'Shop description',
      shortDescription: 'Shop description',
      shopType: 'Bakery',
      phone: '+31 6 12345678',
      email: 'hello@example.com',
      websiteUrl: 'https://seller.example',
      socialLinks: [],
      address: 'Seller Street 1',
      logoUrl: '',
      bannerUrl: '',
      location: 'Amsterdam',
      postalCode: '1000 AA',
      country: 'Netherlands',
      categories: [],
      contactEmail: 'hello@example.com',
      contactPhone: '+31 6 12345678',
      whatsapp: '',
      pickupAvailable: true,
      deliveryAvailable: false,
      localDeliveryFee: 5,
      internationalDeliveryFee: 10,
      freeDeliveryAbove: 50,
      openingHours: [],
      active: true,
      approved: false,
    })
    service.getSellerSettings.mockResolvedValue({
      currency: 'EUR',
      minOrderAmount: '0.00',
      deliveryFee: '0.00',
      localDeliveryFee: '5.00',
      internationalDeliveryFee: '10.00',
      freeDeliveryAbove: null,
      deliveryNotes: '',
      orderAcceptanceMode: 'manual',
      whatsappNumber: '',
      bankTransferInstructions: '',
      notificationEmail: 'hello@example.com',
      newOrderEmailEnabled: true,
      cancellationRequestEmailEnabled: true,
      lowStockNotificationEnabled: false,
      supportedDeliveryCountries: ['NL'],
      pickupAvailable: true,
      deliveryAvailable: false,
    })
    service.updateSellerSettings.mockResolvedValue({
      currency: 'EUR',
      minOrderAmount: '0.00',
      deliveryFee: '0.00',
      localDeliveryFee: '5.00',
      internationalDeliveryFee: '10.00',
      freeDeliveryAbove: null,
      deliveryNotes: '',
      orderAcceptanceMode: 'manual',
      whatsappNumber: '',
      bankTransferInstructions: '',
      notificationEmail: 'hello@example.com',
      newOrderEmailEnabled: true,
      cancellationRequestEmailEnabled: true,
      lowStockNotificationEnabled: false,
      supportedDeliveryCountries: ['NL'],
      pickupAvailable: true,
      deliveryAvailable: false,
    })
    service.deleteSellerProduct.mockResolvedValue(undefined)
    service.getSellerCategories.mockResolvedValue([category])
    service.createSellerCategory.mockResolvedValue(category)
    service.updateSellerCategory.mockResolvedValue(category)
    service.deleteSellerCategory.mockResolvedValue(undefined)
    service.getSellerProduct.mockResolvedValue(sellerProduct)
    service.createSellerProductForm.mockResolvedValue(sellerProduct)
    service.updateSellerProductForm.mockResolvedValue(sellerProduct)
    service.addSellerProductImage.mockResolvedValue(sellerProduct.images[0])
    service.deleteSellerProductImage.mockResolvedValue(undefined)
    service.getSellerCoupons.mockResolvedValue([coupon])
    service.createSellerCoupon.mockResolvedValue(coupon)
    service.deleteSellerCoupon.mockResolvedValue(undefined)
    service.getSellerCampaigns.mockResolvedValue([campaign])
    service.createSellerCampaign.mockResolvedValue(campaign)
    service.deleteSellerCampaign.mockResolvedValue(undefined)
  })

  it('renders the seller navigation', () => {
    renderPage(<SellerLayout />)
    expect(screen.getByRole('navigation', { name: 'Seller navigation' })).toBeInTheDocument()
    expect(screen.getByText('Coupons')).toBeInTheDocument()
    expect(screen.getByText('Campaigns')).toBeInTheDocument()
  })

  it('renders protected seller route placeholders', () => {
    renderPage(
      <SellerPlaceholderPage eyebrow="Storefront" title="Media" message="Manage seller media." />,
    )
    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument()
  })

  it('renders dashboard metrics, recent orders and its error state', async () => {
    const first = renderPage(<SellerDashboardPage />)
    expect(await screen.findByText('€50.00')).toBeInTheDocument()
    expect(screen.getByText('GW-9')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pending orders/i })).toHaveAttribute(
      'href',
      '/seller/orders?status=pending',
    )
    expect(screen.getByRole('link', { name: /total orders/i })).toHaveAttribute(
      'href',
      '/seller/orders',
    )
    first.unmount()
    service.getSellerDashboard.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerDashboardPage />)
    expect(await screen.findByText(/dashboard data is unavailable/i)).toBeInTheDocument()
  })

  it('renders products, add product link and product errors', async () => {
    const first = renderPage(<SellerProductsPage />)
    expect(await screen.findByText('Seller Product')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add product' })).toHaveAttribute(
      'href',
      '/seller/products/new',
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/seller/products/1/edit',
    )
    first.unmount()
    service.getSellerProducts.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerProductsPage />)
    expect(await screen.findByText(/products could not be loaded/i)).toBeInTheDocument()
  })

  it('deletes a product from the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage(<SellerProductsPage />)
    await screen.findByText('Seller Product')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(service.deleteSellerProduct).toHaveBeenCalledWith(1))
  })

  it('renders orders, allows status update, and errors', async () => {
    const first = renderPage(<SellerOrdersPage />)
    expect(await screen.findByText('out for delivery')).toBeInTheDocument()
    const select = screen.getByLabelText(/update status for order gw-1/i)
    await userEvent.selectOptions(select, 'completed')
    await waitFor(() =>
      expect(service.updateSellerOrderStatus).toHaveBeenCalledWith(1, 'completed'),
    )
    first.unmount()
    service.getSellerOrders.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerOrdersPage />)
    expect(await screen.findByText(/orders could not be loaded/i)).toBeInTheDocument()
  })

  it('updates settings and handles save failures', async () => {
    const first = renderPage(<SellerSettingsPage />)
    const name = await screen.findByLabelText('Shop name')
    await waitFor(() => expect(name).toHaveValue('Seller Shop'))
    await userEvent.clear(name)
    await userEvent.type(name, 'Updated')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(service.updateSellerShop).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated' }),
    )
    first.unmount()

    service.updateSellerShop.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerSettingsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/could not save/i)).toBeInTheDocument()
  })

  it('renders settings load errors', async () => {
    service.getSellerShop.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerSettingsPage />)
    expect(await screen.findByText(/settings could not be loaded/i)).toBeInTheDocument()
  })

  it('renders and saves the shop details form', async () => {
    renderPage(<SellerShopDetailsPage />)
    await screen.findByRole('heading', { name: 'Shop Details' })
    await userEvent.clear(screen.getByLabelText('Shop Name *'))
    await userEvent.type(screen.getByLabelText('Shop Name *'), 'Updated Seller Shop')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(service.updateSellerShop).toHaveBeenCalled())
  })

  it('renders the delivery, hours, notification and preview sections', async () => {
    renderPage(
      <>
        <SellerShopDeliveryPage />
        <SellerShopHoursPage />
        <SellerShopNotificationsPage />
        <SellerShopLogoBannerPage />
        <SellerShopContactPage />
        <SellerShopPreviewPage />
      </>,
    )
    expect(await screen.findByRole('heading', { name: 'Delivery & Pickup' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Opening Hours' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Logo & Banner' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contact Information' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Public Shop Preview' })).toBeInTheDocument()
  })

  it('renders and manages categories', async () => {
    renderPage(<SellerCategoriesPage />)
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name'), 'Desserts')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(service.createSellerCategory).toHaveBeenCalledWith({
      name: 'Desserts',
      is_active: true,
    }))
  })

  it('loads filtered orders from the query string', async () => {
    renderPage(<SellerOrdersPage />, '/seller/orders?status=pending&q=GW')
    await screen.findByRole('heading', { name: 'Orders' })
    await waitFor(() =>
      expect(service.getSellerOrders).toHaveBeenCalledWith({ q: 'GW', status: 'pending' }),
    )
  })

  it('loads filtered products from the query string', async () => {
    renderPage(<SellerProductsPage />, '/seller/products?status=active&q=Seller')
    await screen.findByRole('heading', { name: 'Products' })
    await waitFor(() =>
      expect(service.getSellerProducts).toHaveBeenCalledWith({ q: 'Seller', status: 'active' }),
    )
  })

  it('creates a new product via the form', async () => {
    renderPage(
      <Routes>
        <Route path="/seller/products/new" element={<SellerProductFormPage />} />
      </Routes>,
      '/seller/products/new',
    )
    await screen.findByRole('heading', { name: 'Add product' })
    await userEvent.type(screen.getByLabelText('Name'), 'New Product')
    await userEvent.type(screen.getByLabelText('Price'), '9.99')
    await userEvent.click(screen.getByRole('button', { name: 'Save product' }))
    await waitFor(() => expect(service.createSellerProductForm).toHaveBeenCalled())
  })

  it('loads an existing product, edits, deletes and manages gallery', async () => {
    renderPage(
      <Routes>
        <Route path="/seller/products/:id/edit" element={<SellerProductFormPage />} />
      </Routes>,
      '/seller/products/1/edit',
    )
    await screen.findByRole('heading', { name: 'Edit product' })
    expect(await screen.findByDisplayValue('Seller Product')).toBeInTheDocument()
    expect(screen.getByText('Gallery images')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save product' }))
    await waitFor(() =>
      expect(service.updateSellerProductForm).toHaveBeenCalledWith(1, expect.any(FormData)),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(service.deleteSellerProductImage).toHaveBeenCalledWith(10))

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(service.deleteSellerProduct).toHaveBeenCalledWith(1))
  })

  it('renders coupons list, creates and deletes coupons', async () => {
    renderPage(<SellerCouponsPage />)
    expect(await screen.findByText('SAVE10')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Code'), 'NEW10')
    await userEvent.type(screen.getByLabelText('Value'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(service.createSellerCoupon).toHaveBeenCalled())

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(service.deleteSellerCoupon).toHaveBeenCalledWith(1))
  })

  it('renders campaigns list, creates and deletes campaigns', async () => {
    renderPage(<SellerCampaignsPage />)
    expect(await screen.findByText('Summer Sale')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Title'), 'Winter Sale')
    await userEvent.type(screen.getByLabelText('Starts'), '2026-02-01T00:00')
    await userEvent.type(screen.getByLabelText('Ends'), '2026-02-15T00:00')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(service.createSellerCampaign).toHaveBeenCalled())

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(service.deleteSellerCampaign).toHaveBeenCalledWith(1))
  })
})
