import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService, type ApiProduct } from '../services/marketplaceService'
import { renderPage } from '../test/renderPage'
import { SellerDashboardPage } from './SellerDashboardPage'
import { SellerLayout } from './SellerLayout'
import { SellerOrdersPage } from './SellerOrdersPage'
import { SellerProductsPage } from './SellerProductsPage'
import { SellerSettingsPage } from './SellerSettingsPage'
import { SellerPlaceholderPage } from './SellerPlaceholderPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getSellerDashboard: vi.fn(),
    getSellerProducts: vi.fn(),
    getSellerOrders: vi.fn(),
    getSellerShop: vi.fn(),
    updateSellerShop: vi.fn(),
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

describe('seller portal pages', () => {
  beforeEach(() => {
    service.getSellerDashboard.mockResolvedValue({
      total_products: 3,
      active_products: 2,
      pending_orders: 1,
      completed_orders: 4,
      today_sales: '10.00',
      month_sales: '50.00',
      low_stock_products: 1,
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
    service.getSellerShop.mockResolvedValue({
      id: 1,
      slug: 'seller',
      name: 'Seller Shop',
      description: 'Shop description',
      logo_url: '',
      banner_url: '',
      city: 'Amsterdam',
    })
    service.updateSellerShop.mockResolvedValue({
      id: 1,
      slug: 'seller',
      name: 'Updated',
      description: 'Shop description',
      logo_url: '',
      banner_url: '',
      city: 'Amsterdam',
    })
  })

  it('renders the seller navigation', () => {
    renderPage(<SellerLayout />)
    expect(screen.getByRole('navigation', { name: 'Seller navigation' })).toBeInTheDocument()
  })

  it('renders protected seller route placeholders', () => {
    renderPage(
      <SellerPlaceholderPage eyebrow="Storefront" title="Media" message="Manage seller media." />,
    )
    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument()
  })

  it('renders dashboard metrics and its error state', async () => {
    const first = renderPage(<SellerDashboardPage />)
    expect(await screen.findByText('€50.00')).toBeInTheDocument()
    first.unmount()
    service.getSellerDashboard.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerDashboardPage />)
    expect(await screen.findByText(/dashboard data is unavailable/i)).toBeInTheDocument()
  })

  it('renders products and product errors', async () => {
    const first = renderPage(<SellerProductsPage />)
    expect(await screen.findByText('Seller Product')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    first.unmount()
    service.getSellerProducts.mockRejectedValueOnce(new Error('offline'))
    renderPage(<SellerProductsPage />)
    expect(await screen.findByText(/products could not be loaded/i)).toBeInTheDocument()
  })

  it('renders orders and errors', async () => {
    const first = renderPage(<SellerOrdersPage />)
    expect(await screen.findByText('out for delivery')).toBeInTheDocument()
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
})
