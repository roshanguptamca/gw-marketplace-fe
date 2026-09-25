import { useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { CartCallToAction } from '../components/CartCallToAction'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { ProductGrid } from '../components/ProductGrid'
import { MarketplaceBackNavigation } from '../components/MarketplaceBackNavigation'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { shopPath } from '../utils/shopLinks'
import { SellerNotFoundPage } from './SellerNotFoundPage'

export function ProductListingPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const params = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const slug = resolvedSlug ?? params.shopSlug ?? ''
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const [searchInput, setSearchInput] = useState(search)
  const { data: shop, loading: shopLoading } = useMarketplaceData(
    () => marketplaceService.getShopBySlug(slug),
    [slug],
  )
  const { data: categories } = useMarketplaceData(
    () => marketplaceService.getShopCategories(slug),
    [slug],
  )
  const {
    data: products,
    loading: productsLoading,
    error,
  } = useMarketplaceData(
    () => marketplaceService.getShopProducts(slug, { search, category }),
    [slug, search, category],
  )

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      if (nextSearch === search) return
      const nextParams = new URLSearchParams()
      if (nextSearch) nextParams.set('search', nextSearch)
      if (category) nextParams.set('category', category)
      setSearchParams(nextParams, { replace: true })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [category, search, searchInput, setSearchParams])

  const updateCategory = (nextCategory: string) => {
    const nextParams = new URLSearchParams()
    if (search) nextParams.set('search', search)
    if (nextCategory) nextParams.set('category', nextCategory)
    setSearchParams(nextParams)
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  if (shopLoading) return <LoadingState label="Opening collection" />
  if (!shop) return <SellerNotFoundPage />
  const backTo = (location.state as { returnTo?: string } | undefined)?.returnTo
  const hasFilters = Boolean(search || category)

  return (
    <main className="page-shell section products-page">
      <MarketplaceBackNavigation
        items={[
          { label: 'Marketplace', path: '/' },
          { label: 'All Shops', path: '/#shops' },
          { label: shop.name, path: shopPath(slug) },
          { label: 'All Products', path: shopPath(slug, '/products'), current: true },
        ]}
        backLabel="Back to shop"
        backTo={backTo ?? shopPath(slug)}
      />
      <div className="section-heading">
        <div>
          <p className="eyebrow">{shop.name}</p>
          <h1>All products</h1>
        </div>
        <p aria-live="polite">
          {productsLoading ? 'Loading items' : `${products?.length ?? 0} items`}
        </p>
      </div>
      <CartCallToAction />
      <div className="shop-product-filters">
        <form
          className="shop-product-search"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="shop-product-search">Search products in this shop</label>
          <div className="shop-product-search__input">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="m14.3 12.9 4 4-1.4 1.4-4-4a7 7 0 1 1 1.4-1.4ZM8.5 14A5.5 5.5 0 1 0 8.5 3a5.5 5.5 0 0 0 0 11Z"
                fill="currentColor"
              />
            </svg>
            <input
              id="shop-product-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products in this shop..."
            />
            {searchInput && (
              <button
                type="button"
                className="shop-product-search__clear"
                onClick={() => {
                  setSearchInput('')
                  const nextParams = new URLSearchParams()
                  if (category) nextParams.set('category', category)
                  setSearchParams(nextParams)
                }}
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </form>
        <div className="category-filter" aria-label="Filter by category">
          <button
            type="button"
            className={category ? '' : 'active'}
            onClick={() => updateCategory('')}
          >
            All
          </button>
          {categories?.map((item) => (
            <button
              type="button"
              key={item.slug}
              className={category === item.slug ? 'active' : ''}
              onClick={() => updateCategory(item.slug)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button type="button" className="shop-product-filters__reset" onClick={resetFilters}>
            Reset filters
          </button>
        )}
      </div>
      {productsLoading && (
        <div className="product-grid product-grid--skeleton" aria-label="Loading products">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="product-card-skeleton" />
          ))}
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          Products could not be loaded. Please try again.
        </p>
      )}
      {products && products.length > 0 && <ProductGrid products={products} />}
      {products && products.length === 0 && !error && (
        <EmptyState title="No products found" message="Try a different search or category." />
      )}
    </main>
  )
}
