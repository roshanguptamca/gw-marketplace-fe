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

  return (
    <main>
      <section className="market-hero">
        <div className="market-hero__content">
          <p className="eyebrow">GuideWisey Marketplace</p>
          <h1 className="market-hero__title">GuideWisey Marketplace</h1>
          <p>{t('homeIntro')}</p>
          <a className="button button--light" href="#shops">
            {t('exploreShops')}
          </a>
        </div>
        <div className="market-hero__art" aria-hidden="true">
          <span>{t('made')}</span>
          <span>{t('with')}</span>
          <strong>{t('care')}</strong>
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
              <EmptyState title={t('searchFailed')} message={t('tryAgain')} />
            )}
            {searchResult && (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{t('searchResults')}</p>
                    <h2>{t('matchingShops')}</h2>
                  </div>
                  <p>
                    {t('shopsCount', {
                      shops: searchResult.totalShops,
                      products: searchResult.totalProducts,
                    })}
                  </p>
                </div>
                {searchResult.shops.length === 0 ? (
                  <EmptyState title={t('noShops')} message={t('tryDifferentFilters')} />
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
                            <p>{localizedText(shop.description, shop.translations, 'description', i18n.language)}</p>
                            <span>{shop.categories.join(' · ')}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="section-heading">
                  <div>
                    <h2>{t('matchingProducts')}</h2>
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
                <p className="eyebrow">{t('shopSmall')}</p>
                <h2>{t('featuredSellers')}</h2>
              </div>
              <p>{t('supportsBusiness')}</p>
            </div>
            {shopsLoading && <LoadingState label={t('findingShops')} />}
            {shopsError && (
              <EmptyState title={t('shopsUnavailable')} message={t('tryAgain')} />
            )}
            {shops && shops.length === 0 && (
              <EmptyState title={t('noShopsYet')} message={t('newSellersSoon')} />
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
                        <p>{localizedText(shop.description, shop.translations, 'description', i18n.language)}</p>
                        <span>{shop.categories.join(' · ')}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('freshFinds')}</p>
                <h2>{t('featuredProducts')}</h2>
              </div>
            </div>
            {productsLoading && <LoadingState label={t('findingProducts')} />}
            {products && <ProductGrid products={products.slice(0, 8)} />}
          </>
        )}
      </section>
    </main>
  )
}
