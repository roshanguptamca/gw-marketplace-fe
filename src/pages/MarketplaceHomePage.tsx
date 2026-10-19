import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { analytics } from '../analytics/analytics'
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
import { localizedText } from '../utils/localizedText'

export function MarketplaceHomePage() {
  const { t, i18n } = useTranslation()
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

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState('featured')
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
    if (updateUrl) analytics.event('search')
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

  const visibleProducts = isSearchActive ? (searchResult?.products ?? []) : (products ?? [])
  const sortedProducts = [...visibleProducts].sort((a, b) => {
    if (sortOrder === 'price-asc') return a.price - b.price
    if (sortOrder === 'price-desc') return b.price - a.price
    if (sortOrder === 'name') return a.name.localeCompare(b.name, i18n.language)
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured))
  })
  const visibleShops = isSearchActive ? (searchResult?.shops ?? []) : (shops ?? [])

  return (
    <main className="market-catalog">
      <section className="page-shell catalog-intro">
        <nav className="catalog-view-nav" aria-label={t('marketplaceViews')}>
          <Link to="/" aria-current="page">
            {t('browseProducts')}
          </Link>
          <Link to="/shops">{t('allShops')}</Link>
        </nav>
        <p className="eyebrow">{t('shopSmall')}</p>
        <h1>GuideWisey Marketplace</h1>
        <p>{t('homeIntro')}</p>
        {shops && shops.length > 0 && (
          <div className="home-shop-discovery">
            <div>
              <strong>{t('discoverSellers')}</strong>
              <Link to="/shops">{t('viewAllShops')}</Link>
            </div>
            <div className="home-shop-discovery__shops">
              {shops.slice(0, 4).map((shop) => (
                <Link key={shop.id} to={`/shop/${shop.slug}`} state={{ returnTo: '/' }}>
                  <img src={getShopLogoUrl(shop.logoUrl)} alt="" onError={handleShopLogoError} />
                  <span>{shop.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="page-shell catalog-layout" id="shops">
        <aside className="catalog-filters" aria-label={t('catalogFilters')}>
          <Link className="catalog-shop-directory-link" to="/shops">
            {t('browseAllSellers')}
          </Link>
          <button
            type="button"
            className="button catalog-filters__toggle"
            aria-expanded={filtersOpen}
            aria-controls="catalog-filter-fields"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {t('catalogFilters')} <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
          </button>
          <div
            id="catalog-filter-fields"
            className={`catalog-filters__body${filtersOpen ? ' is-open' : ''}`}
          >
            <h2 className="catalog-filters__heading">{t('catalogFilters')}</h2>
            <MarketplaceSearch
              categories={categories ?? []}
              shops={shops ?? []}
              initialFilters={filters}
              onSearch={(filters) => void handleSearch(filters)}
              onClear={handleClear}
              loading={searchLoading}
            />
          </div>
        </aside>

        <div className="catalog-results" aria-busy={searchLoading}>
          <section aria-labelledby="catalog-products-heading">
            <div className="section-heading catalog-results__heading">
              <div>
                <p className="eyebrow">{isSearchActive ? t('searchResults') : t('freshFinds')}</p>
                <h2 id="catalog-products-heading">
                  {isSearchActive ? t('matchingProducts') : t('featuredProducts')}
                </h2>
              </div>
              <div className="catalog-toolbar">
                <span className="catalog-count" aria-live="polite">
                  {t('catalogProductCount', { count: visibleProducts.length })}
                </span>
                <label className="catalog-sort">
                  <span>{t('catalogSort')}</span>
                  <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                    <option value="featured">{t('catalogSortFeatured')}</option>
                    <option value="price-asc">{t('catalogSortPriceAsc')}</option>
                    <option value="price-desc">{t('catalogSortPriceDesc')}</option>
                    <option value="name">{t('catalogSortName')}</option>
                  </select>
                </label>
              </div>
            </div>
            {searchError && <EmptyState title={t('searchFailed')} message={t('tryAgain')} />}
            {(searchLoading || (!isSearchActive && productsLoading)) && (
              <LoadingState label={t('findingProducts')} />
            )}
            {!searchLoading &&
              !productsLoading &&
              !searchError &&
              (visibleProducts.length > 0 ? (
                <ProductGrid products={sortedProducts} />
              ) : (
                <EmptyState title={t('catalogNoProducts')} message={t('tryDifferentFilters')} />
              ))}
          </section>

          <section className="catalog-shops" aria-labelledby="catalog-shops-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('shopSmall')}</p>
                <h2 id="catalog-shops-heading">
                  {isSearchActive ? t('matchingShops') : t('featuredSellers')}
                </h2>
              </div>
              <p>
                {isSearchActive && searchResult
                  ? t('shopsCount', {
                      shops: searchResult.totalShops,
                      products: searchResult.totalProducts,
                    })
                  : t('supportsBusiness')}
              </p>
            </div>
            {!isSearchActive && shopsLoading && <LoadingState label={t('findingShops')} />}
            {!isSearchActive && shopsError && (
              <EmptyState title={t('shopsUnavailable')} message={t('tryAgain')} />
            )}
            {!shopsLoading && !shopsError && visibleShops.length === 0 && (
              <EmptyState
                title={isSearchActive ? t('noShops') : t('noShopsYet')}
                message={isSearchActive ? t('tryDifferentFilters') : t('newSellersSoon')}
              />
            )}
            <div className="shop-grid">
              {visibleShops.map((shop) => (
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
                      <p>
                        {localizedText(
                          shop.description,
                          shop.translations,
                          'description',
                          i18n.language,
                        )}
                      </p>
                      <span>{shop.categories.join(' · ')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
