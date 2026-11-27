import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { renderPage } from '../test/renderPage'
import { shopPageService } from '../services/shopPageService'
import { marketplaceService } from '../services/marketplaceService'
import { mockShops } from '../data/mockData'
import { ApiError } from '../services/apiClient'
import { SellerPagesPage } from './SellerPagesPage'
import type { ShopPage } from '../types/marketplace'

vi.mock('../services/shopPageService', () => ({
  shopPageService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    enquiries: vi.fn(),
  },
}))
vi.mock('../services/marketplaceService', () => ({
  marketplaceService: { getSellerShop: vi.fn(), getSellerProducts: vi.fn() },
}))
const service = vi.mocked(shopPageService)
const page: ShopPage = {
  id: 1,
  title: 'Friday Menu',
  slug: 'friday-menu',
  kind: 'menu',
  description: '',
  fulfilment_notes: '',
  cover_url: '',
  is_published: false,
  is_featured: false,
  position: 0,
  order_deadline: null,
  ordering_open: true,
  product_ids: [],
}
beforeEach(() => {
  vi.resetAllMocks()
  service.list.mockResolvedValue([])
  service.enquiries.mockResolvedValue([])
  vi.mocked(marketplaceService).getSellerShop.mockResolvedValue(mockShops[0])
  vi.mocked(marketplaceService).getSellerProducts.mockResolvedValue([])
})
it('creates private information pages and saves published configuration', async () => {
  renderPage(<SellerPagesPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Create page' }))
  await userEvent.type(screen.getByLabelText('Page title'), 'Our catering')
  await userEvent.type(screen.getByLabelText('Page URL name'), 'our-catering')
  await userEvent.selectOptions(screen.getByLabelText('Page type'), 'information')
  await userEvent.click(screen.getByRole('button', { name: 'Save page' }))
  await waitFor(() =>
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Our catering',
        slug: 'our-catering',
        kind: 'information',
        is_published: false,
      }),
    ),
  )
  expect(await screen.findByRole('status')).toHaveTextContent('Page saved.')
})
it('duplicates into an unpublished draft, preserving source content', async () => {
  service.list.mockResolvedValue([{ ...page, is_published: true }])
  renderPage(<SellerPagesPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Duplicate' }))
  expect(screen.getByLabelText('Page title')).toHaveValue('Friday Menu (copy)')
  expect(screen.getByLabelText('Published — visible in shop navigation')).not.toBeChecked()
  await userEvent.click(screen.getByRole('button', { name: 'Save page' }))
  await waitFor(() =>
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ is_published: false })),
  )
  expect(service.update).not.toHaveBeenCalled()
})
it('retains changes and shows validation error on failed save', async () => {
  service.create.mockRejectedValue(new ApiError('Select a product', 400))
  renderPage(<SellerPagesPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Create page' }))
  await userEvent.type(screen.getByLabelText('Page title'), 'Friday')
  await userEvent.type(screen.getByLabelText('Page URL name'), 'friday')
  await userEvent.click(screen.getByRole('button', { name: 'Save page' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Select a product')
  expect(screen.getByLabelText('Page title')).toHaveValue('Friday')
})
