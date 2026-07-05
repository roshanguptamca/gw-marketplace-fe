import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { ProductGrid } from '../components/ProductGrid'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { SellerNotFoundPage } from './SellerNotFoundPage'

export function ProductListingPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const params = useParams()
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

  return (
    <main className="page-shell section products-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{shop.name}</p>
          <h1>All products</h1>
        </div>
        <p>{products?.length ?? 0} items</p>
      </div>
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
