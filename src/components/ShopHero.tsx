import { useTranslation } from 'react-i18next'
import type { Shop } from '../types/marketplace'
import { WhatsAppGroupLink } from './ShopFulfilment'
import {
  getShopBannerUrl,
  getShopLogoUrl,
  handleShopBannerError,
  handleShopLogoError,
} from '../utils/shopImages'
import { localizedText } from '../utils/localizedText'

export function ShopHero({ shop, onMoreDetails }: { shop: Shop; onMoreDetails?: () => void }) {
  const { t, i18n } = useTranslation()
  const shortDescription =
    localizedText(shop.shortDescription, shop.translations, 'short_description', i18n.language) ||
    localizedText(shop.description, shop.translations, 'description', i18n.language)
  const shopType = localizedText(shop.shopType, shop.translations, 'shop_type', i18n.language)
  return (
    <section className="shop-hero">
      <img
        className="shop-hero__banner"
        src={getShopBannerUrl(shop.bannerUrl)}
        alt=""
        onError={handleShopBannerError}
      />
      <div className="shop-hero__overlay" />
      <div className="shop-hero__content">
        <img
          className="shop-hero__logo"
          src={getShopLogoUrl(shop.logoUrl)}
          alt={`${shop.name} logo`}
          onError={handleShopLogoError}
        />
        <div className="shop-hero__copy">
          <p className="eyebrow">{shopType || shop.location}</p>
          <h1>{shop.name}</h1>
          <p className="shop-hero__tagline">{shortDescription}</p>
          <WhatsAppGroupLink url={shop.whatsappGroupUrl} />
          {onMoreDetails && (
            <button
              type="button"
              className="button button--ghost shop-hero__details-button"
              onClick={onMoreDetails}
            >
              {t('moreShopDetails')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
