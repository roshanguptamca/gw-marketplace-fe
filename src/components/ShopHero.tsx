import type { Shop } from '../types/marketplace'

export function ShopHero({ shop }: { shop: Shop }) {
  return (
    <section className="shop-hero">
      <img className="shop-hero__banner" src={shop.bannerUrl} alt="" />
      <div className="shop-hero__overlay" />
      <div className="shop-hero__content">
        <img className="shop-hero__logo" src={shop.logoUrl} alt={`${shop.name} logo`} />
        <div>
          <p className="eyebrow">{shop.shopType || shop.location}</p>
          <h1>{shop.name}</h1>
          <p className="shop-hero__tagline">{shop.shortDescription || shop.tagline}</p>
          <p className="shop-hero__description">{shop.description}</p>
        </div>
      </div>
    </section>
  )
}
