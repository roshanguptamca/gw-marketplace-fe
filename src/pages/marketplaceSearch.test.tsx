import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import { productFixture, shopFixture } from '../test/fixtures'
import { renderPage } from '../test/renderPage'
import { MarketplaceHomePage } from './MarketplaceHomePage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getShops: vi.fn(),
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    search: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)

describe('marketplace search and filters', () => {
  beforeEach(() => {
    service.getShops.mockResolvedValue([shopFixture])
    service.getProducts.mockResolvedValue([productFixture])
    service.getCategories.mockResolvedValue([{ slug: 'home', name: 'Home', productCount: 1 }])
    service.search.mockResolvedValue({
      shops: [shopFixture],
      products: [productFixture],
      totalShops: 1,
      totalProducts: 1,
    })
  })

  it('sets the page title to GuideMarketplace', async () => {
    renderPage(<MarketplaceHomePage />)
    await waitFor(() => expect(document.title).toBe('GuideMarketplace | GuideWisey'))
  })

  it('renders the search input, category, shop, price and in-stock filters', async () => {
    renderPage(<MarketplaceHomePage />)
    expect(await screen.findByLabelText(/search products or shops/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by shop/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/minimum price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/maximum price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/in stock only/i)).toBeInTheDocument()
  })

  it('defaults the min and max price inputs to 0 and 999', async () => {
    renderPage(<MarketplaceHomePage />)
    expect(await screen.findByLabelText(/minimum price/i)).toHaveValue(0)
    expect(screen.getByLabelText(/maximum price/i)).toHaveValue(999)
  })

  it('populates the category dropdown with an "All categories" default plus fetched categories', async () => {
    renderPage(<MarketplaceHomePage />)
    const categorySelect = await screen.findByLabelText(/filter by category/i)
    expect(categorySelect).toHaveTextContent('All categories')
    expect(categorySelect).toHaveTextContent('Home (1)')
  })

  it('populates the shop dropdown with an "All shops" default plus fetched shops', async () => {
    renderPage(<MarketplaceHomePage />)
    const shopSelect = await screen.findByLabelText(/filter by shop/i)
    expect(shopSelect).toHaveTextContent('All shops')
    expect(shopSelect).toHaveTextContent('Test Shop')
  })

  it('runs a search and swaps in matching results when the user searches by keyword', async () => {
    const user = userEvent.setup()
    renderPage(<MarketplaceHomePage />)
    const input = await screen.findByLabelText(/search products or shops/i)
    await user.type(input, 'garam')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() =>
      expect(service.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'garam' })),
    )
    expect(await screen.findByText(/search results/i)).toBeInTheDocument()
  })

  it('sends the correct API query params for category, shop, price and in-stock filters', async () => {
    const user = userEvent.setup()
    renderPage(<MarketplaceHomePage />)

    await screen.findByLabelText(/filter by category/i)
    await user.selectOptions(screen.getByLabelText(/filter by category/i), 'home')
    await user.selectOptions(screen.getByLabelText(/filter by shop/i), 'test-shop')

    const minInput = screen.getByLabelText(/minimum price/i)
    await user.clear(minInput)
    await user.type(minInput, '5')

    const maxInput = screen.getByLabelText(/maximum price/i)
    await user.clear(maxInput)
    await user.type(maxInput, '50')

    await user.click(screen.getByLabelText(/in stock only/i))
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() =>
      expect(service.search).toHaveBeenCalledWith({
        q: '',
        category: 'home',
        shop: 'test-shop',
        minPrice: '5',
        maxPrice: '50',
        inStock: true,
      }),
    )
  })

  it('clearing filters returns to the default browse view', async () => {
    const user = userEvent.setup()
    renderPage(<MarketplaceHomePage />)
    const input = await screen.findByLabelText(/search products or shops/i)
    await user.type(input, 'garam')
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    expect(await screen.findByText(/search results/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.queryByText(/search results/i)).not.toBeInTheDocument()
    expect(await screen.findByText('Featured sellers')).toBeInTheDocument()
  })
})
