import type { Shop } from '../types/marketplace'
import { getShopBannerUrl, getShopLogoUrl } from '../utils/shopImages'

export function ShopHero({
  shop,
  onMoreDetails,
}: {
  shop: Shop
  onMoreDetails?: () => void
}) {
  return (
    <section className="shop-hero">
      <img className="shop-hero__banner" src={getShopBannerUrl(shop.bannerUrl)} alt="" />
      <div className="shop-hero__overlay" />
      <div className="shop-hero__content">
        <img className="shop-hero__logo" src={getShopLogoUrl(shop.logoUrl)} alt={`${shop.name} logo`} />
        <div className="shop-hero__copy">
          <p className="eyebrow">{shop.shopType || shop.location}</p>
          <h1>{shop.name}</h1>
          <p className="shop-hero__tagline">{shop.shortDescription || shop.tagline}</p>
          <p className="shop-hero__description">{shop.description}</p>
          {onMoreDetails && (
            <button type="button" className="button button--ghost shop-hero__details-button" onClick={onMoreDetails}>
              More details about shop
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
