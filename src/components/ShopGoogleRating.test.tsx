import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShopGoogleRating } from './ShopGoogleRating'
import { marketplaceService } from '../services/marketplaceService'
import { shopFixture } from '../test/fixtures'
import i18n from '../i18n'
vi.mock('../services/marketplaceService', () => ({
  marketplaceService: { getShopGoogleRating: vi.fn() },
}))
const fetchRating = vi.mocked(marketplaceService.getShopGoogleRating)
const shop = {
  ...shopFixture,
  googlePlaceId: 'ChIJtest',
  googleReviewUrl: 'https://g.page/r/test/review',
}
describe('Google shop rating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void i18n.changeLanguage('en')
  })
  it('shows the actual score, count and review deep link below the stars', async () => {
    fetchRating.mockResolvedValue({
      rating: 4.7,
      review_count: 23,
      reviews_url: 'https://maps.google.com/reviews/test',
    })
    render(<ShopGoogleRating shop={shop} />)
    expect(
      await screen.findByLabelText('4.7 out of 5 on Google Maps, 23 reviews'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Read reviews on Google/ })).toHaveAttribute(
      'href',
      'https://maps.google.com/reviews/test',
    )
    expect(screen.getByText('Google Maps')).toBeInTheDocument()
  })
  it('preserves the review link without inventing a rating on failure', async () => {
    fetchRating.mockRejectedValue(new Error('offline'))
    render(<ShopGoogleRating shop={shop} />)
    await waitFor(() => expect(fetchRating).toHaveBeenCalledWith(shop.slug))
    expect(screen.getByRole('link', { name: /Read reviews on Google/ })).toBeInTheDocument()
    expect(screen.queryByText(/\/5/)).not.toBeInTheDocument()
  })
  it('uses the existing write-review link without making a request if no Place ID is set', () => {
    render(<ShopGoogleRating shop={{ ...shop, googlePlaceId: '' }} />)
    expect(fetchRating).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Leave a Google review/ })).toHaveAttribute(
      'href',
      shop.googleReviewUrl,
    )
  })
  it('hides the section for an unconfigured shop or an unsafe URL', () => {
    const { container } = render(
      <ShopGoogleRating shop={{ ...shopFixture, googleReviewUrl: 'javascript:alert(1)' }} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(fetchRating).not.toHaveBeenCalled()
  })
  it('does not keep another shop’s rating after navigation', async () => {
    fetchRating.mockResolvedValueOnce({ rating: 5, review_count: 7, reviews_url: null })
    const { rerender } = render(<ShopGoogleRating shop={shop} />)
    expect(await screen.findByText('5/5')).toBeInTheDocument()
    fetchRating.mockReturnValue(new Promise(() => {}))
    rerender(
      <ShopGoogleRating shop={{ ...shop, slug: 'other-shop', googlePlaceId: 'ChIJother' }} />,
    )
    expect(screen.queryByText('5/5')).not.toBeInTheDocument()
  })
  it('rejects invalid numbers and unsafe upstream links', async () => {
    fetchRating.mockResolvedValue({
      rating: 6,
      review_count: 0,
      reviews_url: 'javascript:alert(1)',
    })
    render(<ShopGoogleRating shop={shop} />)
    await waitFor(() => expect(fetchRating).toHaveBeenCalled())
    expect(screen.queryByText('6/5')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Read reviews on Google/ }).getAttribute('href'),
    ).toContain('query_place_id=ChIJtest')
  })
  it('uses Dutch labels and localized score', async () => {
    await i18n.changeLanguage('nl')
    fetchRating.mockResolvedValue({ rating: 4.7, review_count: 23, reviews_url: null })
    render(<ShopGoogleRating shop={shop} />)
    expect(await screen.findByLabelText('4,7 van 5 op Google Maps, 23 reviews')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lees reviews op Google/ })).toBeInTheDocument()
  })
})
