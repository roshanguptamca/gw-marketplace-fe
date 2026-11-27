import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShopPageNavigation } from '../components/ShopPageNavigation'
import { shopPageService } from '../services/shopPageService'
import { marketplaceService } from '../services/marketplaceService'
import { ApiError } from '../services/apiClient'
import { renderPage } from '../test/renderPage'
import { mockProducts, mockShops } from '../data/mockData'
import { ShopCustomPage } from './ShopCustomPage'
import type { ShopPage } from '../types/marketplace'
import '../i18n'

vi.mock('../services/shopPageService', () => ({
  shopPageService: { listPublic: vi.fn(), getPublic: vi.fn(), enquire: vi.fn() },
}))
vi.mock('../services/marketplaceService', () => ({
  marketplaceService: { getShopBySlug: vi.fn(), getShopProducts: vi.fn() },
}))
vi.mock('../components/ShopHero', () => ({ ShopHero: () => <div>Shop banner</div> }))
vi.mock('../components/ShopDetailsModal', () => ({ ShopDetailsModal: () => null }))
const products = mockProducts
  .filter((p) => p.shopSlug === 'rishikitchen')
  .map((p, index) => ({ ...p, id: String(index + 1) }))
const page: ShopPage = {
  id: 1,
  title: 'Friday Menu',
  slug: 'friday-menu',
  kind: 'menu',
  description: 'Our weekly dishes',
  fulfilment_notes: 'Pickup after 17:00',
  cover_url: '',
  is_published: true,
  is_featured: true,
  position: 0,
  order_deadline: null,
  ordering_open: true,
  product_ids: [Number(products[0].id)],
}
const service = vi.mocked(shopPageService)
const market = vi.mocked(marketplaceService)
function renderCustom() {
  return renderPage(
    <Routes>
      <Route path="/shop/:shopSlug/pages/:pageSlug" element={<ShopCustomPage />} />
    </Routes>,
    '/shop/rishikitchen/pages/friday-menu',
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  window.localStorage.clear()
  service.listPublic.mockResolvedValue([page])
  service.getPublic.mockResolvedValue(page)
  market.getShopBySlug.mockResolvedValue(mockShops[0])
  market.getShopProducts.mockResolvedValue(products)
})
describe('configured shop pages', () => {
  it('renders no navigation or promotion without published configuration', async () => {
    service.listPublic.mockResolvedValue([{ ...page, is_published: false }])
    const view = renderPage(<ShopPageNavigation shopSlug="rishikitchen" featured />)
    await waitFor(() => expect(service.listPublic).toHaveBeenCalled())
    expect(view.container).toBeEmptyDOMElement()
  })
  it('uses configured labels, order and active page; expired features are hidden', async () => {
    service.listPublic.mockResolvedValue([
      {
        ...page,
        id: 2,
        title: 'Winter catering',
        slug: 'winter',
        position: 2,
        ordering_open: false,
      },
      { ...page, title: 'Custom weekly offer', position: 1 },
    ])
    renderPage(<ShopPageNavigation shopSlug="rishikitchen" activeSlug="friday-menu" featured />)
    expect(await screen.findByRole('link', { name: 'Custom weekly offer' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getAllByRole('link').map((el) => el.textContent)).toEqual([
      'All products',
      'Custom weekly offer',
      'Winter catering',
      expect.stringContaining('Custom weekly offer'),
    ])
    expect(screen.getAllByText('Winter catering')).toHaveLength(1)
  })
  it('loads configured products and uses basket minimum quantity', async () => {
    renderCustom()
    const product = products[0]
    const increase = await screen.findByRole('button', { name: `Increase ${product.name}` })
    await userEvent.click(increase)
    expect(screen.getByRole('link', { name: /View basket/ })).toHaveAttribute('href', '/cart')
    expect(
      JSON.parse(localStorage.getItem('guidewisey-marketplace-cart')!).items[0].product.id,
    ).toBe(product.id)
    expect(
      screen.queryByRole('button', { name: `Increase ${products[1].name}` }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: `Decrease ${product.name}` }))
    expect(screen.queryByRole('link', { name: /View basket/ })).not.toBeInTheDocument()
  })
  it('closes menu after its deadline without reloading', async () => {
    service.getPublic.mockResolvedValue({
      ...page,
      order_deadline: new Date(Date.now() + 2000).toISOString(),
    })
    renderCustom()
    await screen.findByRole('button', { name: `Increase ${products[0].name}` })
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000)
    await waitFor(
      () => expect(screen.queryByRole('button', { name: /^Increase/ })).not.toBeInTheDocument(),
      { timeout: 2000 },
    )
  })
  it('shows unpublished/missing pages as unavailable and server errors with retry', async () => {
    service.getPublic.mockRejectedValue(new ApiError('Not found', 404))
    renderCustom()
    expect(await screen.findByRole('heading', { name: 'Page unavailable' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
  it('retries a temporary page failure', async () => {
    service.getPublic.mockRejectedValueOnce(new ApiError('Offline', 500)).mockResolvedValue(page)
    renderCustom()
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Friday Menu' })).toBeVisible()
  })
  it('sends a quote request, keeps form after failure and prevents further submit after success', async () => {
    service.getPublic.mockResolvedValue({ ...page, kind: 'enquiry' })
    service.enquire
      .mockRejectedValueOnce(new ApiError('Please try later', 429))
      .mockResolvedValue({ id: 7 })
    renderCustom()
    await screen.findByText('Request a quote')
    await userEvent.type(screen.getByLabelText('Your name'), 'Roshan')
    await userEvent.type(screen.getByLabelText('Email'), 'roshan@example.com')
    fireEvent.change(screen.getByLabelText('Event date'), { target: { value: '2099-12-10' } })
    await userEvent.click(screen.getByLabelText(/I agree to share/))
    await userEvent.click(screen.getByRole('button', { name: 'Send quote request' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try later')
    expect(screen.getByLabelText('Your name')).toHaveValue('Roshan')
    await userEvent.click(screen.getByRole('button', { name: 'Send quote request' }))
    expect(await screen.findByText('Your request has been sent')).toBeVisible()
    expect(service.enquire).toHaveBeenLastCalledWith(
      'rishikitchen',
      'friday-menu',
      expect.objectContaining({
        customer_name: 'Roshan',
        email: 'roshan@example.com',
        privacy_accepted: true,
      }),
    )
    expect(screen.queryByRole('button', { name: 'Send quote request' })).not.toBeInTheDocument()
  })
})
