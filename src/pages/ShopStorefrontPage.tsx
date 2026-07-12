import { Link, useLocation, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { ProductGrid } from '../components/ProductGrid'
import { MarketplaceBackNavigation } from '../components/MarketplaceBackNavigation'
import { ShopDetailsModal } from '../components/ShopDetailsModal'
import { ShopHero } from '../components/ShopHero'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { shopPath } from '../utils/shopLinks'
import { SellerNotFoundPage } from './SellerNotFoundPage'
import { useState } from 'react'

export function ShopStorefrontPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const params = useParams()
  const location = useLocation()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const slug = resolvedSlug ?? params.shopSlug ?? ''
  const {
    data: shop,
    loading: shopLoading,
    error: shopError,
  } = useMarketplaceData(() => marketplaceService.getShopBySlug(slug), [slug])
  const { data: products, loading: productsLoading } = useMarketplaceData(
    () => marketplaceService.getShopProducts(slug),
    [slug],
  )

  if (shopLoading) return <LoadingState label="Opening shop" />
  if (shopError || !shop) return <SellerNotFoundPage />
  const backTo = (location.state as { returnTo?: string } | undefined)?.returnTo

  const featured = products?.filter((product) => product.featured) ?? []

  return (
    <main>
      <div className="page-shell" style={{ paddingTop: '24px' }}>
        <MarketplaceBackNavigation
          items={[
            { label: 'Marketplace', path: '/' },
            { label: 'All Shops', path: '/#shops' },
            { label: shop.name, path: shopPath(slug), current: true },
          ]}
          backLabel="Back to all shops"
          backTo={backTo ?? '/#shops'}
        />
      </div>
      <ShopHero shop={shop} onMoreDetails={() => setDetailsOpen(true)} />
      <ShopDetailsModal shop={shop} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <section className="page-shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seller picks</p>
            <h2>Featured products</h2>
          </div>
          <Link className="text-link" to={shopPath(slug, '/products')}>
            View all products →
          </Link>
        </div>
        {productsLoading ? (
          <LoadingState label="Loading products" />
        ) : (
          <ProductGrid products={featured.length > 0 ? featured : (products ?? [])} />
        )}
      </section>
    </main>
  )
}
