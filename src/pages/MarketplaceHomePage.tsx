import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { MarketplaceSearch } from '../components/MarketplaceSearch'
import { ProductGrid } from '../components/ProductGrid'
import type { MarketplaceSearchFilters, MarketplaceSearchResult } from '../types/marketplace'
import {
  getShopBannerUrl,
  getShopLogoUrl,
  handleShopBannerError,
  handleShopLogoError,
} from '../utils/shopImages'

export function MarketplaceHomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    document.title = 'GuideWisey Marketplace | GuideWisey'
  }, [])

  const {
    data: shops,
    loading: shopsLoading,
    error: shopsError,
  } = useMarketplaceData(() => marketplaceService.getShops(), [])
  const { data: products, loading: productsLoading } = useMarketplaceData(
    () => marketplaceService.getProducts(),
    [],
  )
  const { data: categories } = useMarketplaceData(() => marketplaceService.getCategories(), [])

  const [searchResult, setSearchResult] = useState<MarketplaceSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)

  const filters: MarketplaceSearchFilters = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    shop: searchParams.get('shop') ?? '',
    country: searchParams.get('country') ?? '',
    city: searchParams.get('city') ?? '',
    minPrice: searchParams.get('min_price') ?? '0',
    maxPrice: searchParams.get('max_price') ?? '999',
    inStock: searchParams.get('in_stock') === 'true',
  }

  const hasUrlFilters = [...searchParams.keys()].length > 0

  useEffect(() => {
    if (!hasUrlFilters) return
    void handleSearch(filters, false)
    // URL search parameters are the source of truth for saved searches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function handleSearch(nextFilters: MarketplaceSearchFilters, updateUrl = true) {
    if (updateUrl) {
      const params = new URLSearchParams()
      if (nextFilters.q) params.set('q', nextFilters.q)
      if (nextFilters.category) params.set('category', nextFilters.category)
      if (nextFilters.shop) params.set('shop', nextFilters.shop)
      if (nextFilters.country) params.set('country', nextFilters.country)
      if (nextFilters.city) params.set('city', nextFilters.city)
      if (nextFilters.minPrice && nextFilters.minPrice !== '0') {
        params.set('min_price', nextFilters.minPrice)
      }
      if (nextFilters.maxPrice && nextFilters.maxPrice !== '999') {
        params.set('max_price', nextFilters.maxPrice)
      }
      if (nextFilters.inStock) params.set('in_stock', 'true')
      setSearchParams(params)
    }
    setSearchLoading(true)
    setSearchError(false)
    try {
      const result = await marketplaceService.search(nextFilters)
      setSearchResult(result)
    } catch {
      setSearchError(true)
    } finally {
      setSearchLoading(false)
    }
  }

  function handleClear() {
    setSearchResult(null)
    setSearchError(false)
    setSearchParams({})
  }

  const isSearchActive = searchResult !== null || searchError
  const shopReturnState = { returnTo: '/#shops' }

  return (
    <main>
      <section className="market-hero">
        <div className="market-hero__content">
          <p className="eyebrow">GuideWisey Marketplace</p>
          <h1 className="market-hero__title">GuideWisey Marketplace</h1>
          <p>Browse approved GuideWisey sellers and order directly from their shops.</p>
          <a className="button button--light" href="#shops">
            Explore shops
          </a>
        </div>
        <div className="market-hero__art" aria-hidden="true">
          <span>Made</span>
          <span>with</span>
          <strong>care.</strong>
        </div>
      </section>

      <section className="page-shell section" id="shops">
        <MarketplaceSearch
          categories={categories ?? []}
          shops={shops ?? []}
          initialFilters={filters}
          onSearch={(filters) => void handleSearch(filters)}
          onClear={handleClear}
          loading={searchLoading}
        />

        {isSearchActive ? (
          <>
            {searchError && (
              <EmptyState title="Search failed" message="Please try again in a moment." />
            )}
            {searchResult && (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Search results</p>
                    <h2>Matching shops</h2>
                  </div>
                  <p>
                    {searchResult.totalShops} shop(s) &middot; {searchResult.totalProducts}{' '}
                    product(s)
                  </p>
                </div>
                {searchResult.shops.length === 0 ? (
                  <EmptyState title="No shops match your search" message="Try different filters." />
                ) : (
                  <div className="shop-grid">
                    {searchResult.shops.map((shop) => (
                      <Link
                        className="shop-tile"
                        to={`/shop/${shop.slug}`}
                        state={shopReturnState}
                        key={shop.id}
                      >
                        <img
                          src={getShopBannerUrl(shop.bannerUrl)}
                          alt=""
                          onError={handleShopBannerError}
                        />
                        <div className="shop-tile__body">
                          <img
                            src={getShopLogoUrl(shop.logoUrl)}
                            alt={`${shop.name} logo`}
                            onError={handleShopLogoError}
                          />
                          <div>
                            <h3>{shop.name}</h3>
                            <p>{shop.tagline}</p>
                            <span>{shop.categories.join(' · ')}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="section-heading">
                  <div>
                    <h2>Matching products</h2>
                  </div>
                </div>
                <ProductGrid products={searchResult.products} />
              </>
            )}
          </>
        ) : (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Shop small</p>
                <h2>Featured sellers</h2>
              </div>
              <p>Every purchase supports an independent business.</p>
            </div>
            {shopsLoading && <LoadingState label="Finding shops" />}
            {shopsError && (
              <EmptyState title="Shops are unavailable" message="Please try again in a moment." />
            )}
            {shops && shops.length === 0 && (
              <EmptyState title="No shops yet" message="New sellers are joining soon." />
            )}
            {shops && shops.length > 0 && (
              <div className="shop-grid">
                {shops.map((shop) => (
                  <Link
                    className="shop-tile"
                    to={`/shop/${shop.slug}`}
                    state={shopReturnState}
                    key={shop.id}
                  >
                    <img
                      src={getShopBannerUrl(shop.bannerUrl)}
                      alt=""
                      onError={handleShopBannerError}
                    />
                    <div className="shop-tile__body">
                      <img
                        src={getShopLogoUrl(shop.logoUrl)}
                        alt={`${shop.name} logo`}
                        onError={handleShopLogoError}
                      />
                      <div>
                        <h3>{shop.name}</h3>
                        <p>{shop.tagline}</p>
                        <span>{shop.categories.join(' · ')}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="section-heading">
              <div>
                <p className="eyebrow">Fresh finds</p>
                <h2>Featured products</h2>
              </div>
            </div>
            {productsLoading && <LoadingState label="Finding products" />}
            {products && <ProductGrid products={products.slice(0, 8)} />}
          </>
        )}
      </section>
    </main>
  )
}
