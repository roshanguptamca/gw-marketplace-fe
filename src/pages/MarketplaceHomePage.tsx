import { Link } from 'react-router-dom'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'

export function MarketplaceHomePage() {
  const {
    data: shops,
    loading,
    error,
  } = useMarketplaceData(() => marketplaceService.getShops(), [])

  return (
    <main>
      <section className="market-hero">
        <div className="market-hero__content">
          <p className="eyebrow">Meet the makers</p>
          <h1>Good things, from people who care</h1>
          <p>
            Discover independent shops, thoughtful products and the stories behind the people who
            make them.
          </p>
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shop small</p>
            <h2>Featured sellers</h2>
          </div>
          <p>Every purchase supports an independent business.</p>
        </div>
        {loading && <LoadingState label="Finding shops" />}
        {error && (
          <EmptyState title="Shops are unavailable" message="Please try again in a moment." />
        )}
        {shops && shops.length === 0 && (
          <EmptyState title="No shops yet" message="New sellers are joining soon." />
        )}
        {shops && shops.length > 0 && (
          <div className="shop-grid">
            {shops.map((shop) => (
              <Link className="shop-tile" to={`/shop/${shop.slug}`} key={shop.id}>
                <img src={shop.bannerUrl} alt="" />
                <div className="shop-tile__body">
                  <img src={shop.logoUrl} alt={`${shop.name} logo`} />
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
      </section>
    </main>
  )
}
