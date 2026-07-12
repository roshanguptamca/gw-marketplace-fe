import { Link, useLocation, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { ProductGrid } from '../components/ProductGrid'
import { MarketplaceBackNavigation } from '../components/MarketplaceBackNavigation'
import { ShopHero } from '../components/ShopHero'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { shopPath } from '../utils/shopLinks'
import { SellerNotFoundPage } from './SellerNotFoundPage'

export function ShopStorefrontPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const params = useParams()
  const location = useLocation()
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
      <ShopHero shop={shop} />
      <section className="page-shell section">
        <div className="shop-summary-grid">
          <article className="shop-summary-card">
            <p className="eyebrow">Shop details</p>
            <h2>{shop.shortDescription || shop.tagline}</h2>
            <p>{shop.description}</p>
            <dl className="shop-summary-list">
              <div>
                <dt>Category</dt>
                <dd>{shop.shopType || 'General marketplace shop'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{[shop.location, shop.country].filter(Boolean).join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{shop.websiteUrl ? <a href={shop.websiteUrl}>{shop.websiteUrl}</a> : '—'}</dd>
              </div>
            </dl>
          </article>
          <article className="shop-summary-card">
            <p className="eyebrow">Opening hours</p>
            <h2>When the shop is open</h2>
            {shop.openingHours && shop.openingHours.length > 0 ? (
              <ul className="hours-list">
                {shop.openingHours.map((hour) => (
                  <li key={hour.dayOfWeek}>
                    <span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][hour.dayOfWeek]}</span>
                    <strong>
                      {hour.isClosed
                        ? 'Closed'
                        : `${hour.openTime ?? '—'} - ${hour.closeTime ?? '—'}`}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No opening hours have been published yet.</p>
            )}
          </article>
          <article className="shop-summary-card">
            <p className="eyebrow">Service</p>
            <h2>Pickup and delivery</h2>
            <p>{shop.pickupAvailable ? 'Pickup is available.' : 'Pickup is not available.'}</p>
            <p>{shop.deliveryAvailable ? 'Delivery is available.' : 'Delivery is not available.'}</p>
            <p>
              {shop.localDeliveryFee !== undefined
                ? `Netherlands delivery fee: €${shop.localDeliveryFee.toFixed(2)}`
                : 'Netherlands delivery fee: —'}
            </p>
            <p>
              {shop.internationalDeliveryFee !== undefined
                ? `International delivery fee: €${shop.internationalDeliveryFee.toFixed(2)}`
                : 'International delivery fee: —'}
            </p>
          </article>
        </div>
      </section>
      <section className="page-shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seller picks</p>
            <h2>Featured products</h2>
          </div>
          <Link className="text-link" to={shopPath(slug, '/products')} state={{ returnTo: shopPath(slug) }}>
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
