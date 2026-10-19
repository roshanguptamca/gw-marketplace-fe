import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import { shopFixture, secondShopFixture } from '../test/fixtures'
import { renderPage } from '../test/renderPage'
import { ShopsPage } from './ShopsPage'

vi.mock('../services/marketplaceService', () => ({ marketplaceService: { getShops: vi.fn() } }))
const service = vi.mocked(marketplaceService)
beforeEach(() => {
  service.getShops.mockResolvedValue([shopFixture, secondShopFixture])
})

describe('shops directory', () => {
  it('lists sellers without product cards and links to their shops', async () => {
    renderPage(<ShopsPage />)
    await screen.findByRole('heading', { name: shopFixture.name })
    expect(document.querySelector('.product-grid')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(shopFixture.name) })).toHaveAttribute(
      'href',
      `/shop/${shopFixture.slug}`,
    )
    expect(service.getShops).toHaveBeenCalledOnce()
  })
  it('filters by seller name and clears the search', async () => {
    renderPage(<ShopsPage />)
    await screen.findByRole('heading', { name: shopFixture.name })
    await userEvent.type(screen.getByRole('searchbox'), secondShopFixture.name)
    expect(screen.queryByRole('heading', { name: shopFixture.name })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: secondShopFixture.name })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('heading', { name: shopFixture.name })).toBeInTheDocument()
  })
  it('restores location filters from the URL and resets city when country changes', async () => {
    renderPage(
      <ShopsPage />,
      `/shops?country=${encodeURIComponent(shopFixture.country ?? '')}&city=${encodeURIComponent(shopFixture.location)}`,
    )
    await waitFor(() => expect(screen.getByLabelText('City')).toHaveValue(shopFixture.location))
    await userEvent.selectOptions(screen.getByLabelText('Country'), '')
    expect(screen.getByLabelText('City')).toHaveValue('')
  })
  it('shows an empty state when no sellers match', async () => {
    renderPage(<ShopsPage />)
    await screen.findByRole('heading', { name: shopFixture.name })
    await userEvent.type(screen.getByRole('searchbox'), 'missing-seller')
    expect(screen.getByRole('heading', { name: 'No shops match your search' })).toBeInTheDocument()
  })
})
