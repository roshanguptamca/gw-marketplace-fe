import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CartCallToAction } from '../components/CartCallToAction'
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
  const slug = resolvedSlug ?? params.shopSlug ?? ''
  const [category, setCategory] = useState('All')
  const { data: shop, loading: shopLoading } = useMarketplaceData(
    () => marketplaceService.getShopBySlug(slug),
    [slug],
  )
  const {
    data: products,
    loading: productsLoading,
    error,
  } = useMarketplaceData(() => marketplaceService.getShopProducts(slug), [slug])
  const filteredProducts = useMemo(
    () =>
      category === 'All'
        ? (products ?? [])
        : (products ?? []).filter((product) => product.category === category),
    [products, category],
  )

  if (shopLoading) return <LoadingState label="Opening collection" />
  if (!shop) return <SellerNotFoundPage />
  const backTo = (location.state as { returnTo?: string } | undefined)?.returnTo

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
        <p>{products?.length ?? 0} items</p>
      </div>
      <CartCallToAction />
      <div className="category-filter" aria-label="Filter by category">
        {['All', ...shop.categories].map((item) => (
          <button
            key={item}
            className={category === item ? 'active' : ''}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {productsLoading && <LoadingState label="Loading products" />}
      {error && (
        <p className="inline-error" role="alert">
          Products could not be loaded. Please try again.
        </p>
      )}
      {products && <ProductGrid products={filteredProducts} />}
    </main>
  )
}
