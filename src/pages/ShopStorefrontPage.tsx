import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { analytics } from '../analytics/analytics'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { ProductGrid } from '../components/ProductGrid'
import { MarketplaceBackNavigation } from '../components/MarketplaceBackNavigation'
import { ShopDetailsModal } from '../components/ShopDetailsModal'
import { ShopHero } from '../components/ShopHero'
import { RishiKitchenVoiceAssistant } from '../components/RishiKitchenVoiceAssistant'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { shopPath } from '../utils/shopLinks'
import { SellerNotFoundPage } from './SellerNotFoundPage'

export function ShopStorefrontPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const { t } = useTranslation()
  const params = useParams()
  const location = useLocation()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const slug = resolvedSlug ?? params.shopSlug ?? ''
  const {
    data: shop,
    loading: shopLoading,
    error: shopError,
  } = useMarketplaceData(() => marketplaceService.getShopBySlug(slug), [slug])
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
  } = useMarketplaceData(() => marketplaceService.getShopProducts(slug), [slug])
  useEffect(() => {
    if (shop) analytics.event('view_shop', { shop_id: shop.id })
  }, [shop])

  if (shopLoading) return <LoadingState label={t('openingShop')} />
  if (shopError || !shop) return <SellerNotFoundPage />
  const backTo = (location.state as { returnTo?: string } | undefined)?.returnTo

  const categories = [
    ...new Set((products ?? []).map((product) => product.category).filter(Boolean)),
  ]
  const visibleProducts = (products ?? [])
    .filter(
      (product) =>
        (!category || product.category === category) &&
        product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    )
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))

  return (
    <main className="shop-storefront">
      <div className="page-shell shop-storefront__navigation">
        <MarketplaceBackNavigation
          items={[
            { label: t('marketplace'), path: '/' },
            { label: t('allShops'), path: '/#shops' },
            { label: shop.name, path: shopPath(slug), current: true },
          ]}
          backLabel={t('backToAllShops')}
          backTo={backTo ?? '/#shops'}
        />
      </div>
      <ShopHero shop={shop} onMoreDetails={() => setDetailsOpen(true)} />
      {slug === 'rishi-kitchen' && <RishiKitchenVoiceAssistant logoUrl={shop.logoUrl} />}
      <ShopDetailsModal shop={shop} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <section
        className="page-shell section shop-storefront__products"
        aria-labelledby="shop-products-title"
      >
        <div className="section-heading">
          <h2 id="shop-products-title">{t('allProducts')}</h2>
          <p aria-live="polite">
            {productsLoading
              ? t('loadingItems')
              : t('itemsCount', { count: visibleProducts.length })}
          </p>
        </div>
        {shop.acceptingOrders === false && (
          <p className="alert alert--error" role="status">
            {t('sellerNotAcceptingOrders')}
          </p>
        )}
        <div className="shop-product-filters">
          <label className="shop-product-search" htmlFor="storefront-search">
            {t('searchProductsInShop')}
            <input
              id="storefront-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchInShop')}
            />
          </label>
          <div className="category-filter" aria-label={t('filterCategory')}>
            {['', ...categories].map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? 'active' : ''}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item || t('all')}
              </button>
            ))}
          </div>
          {(search || category) && (
            <button
              type="button"
              className="shop-product-filters__reset"
              onClick={() => {
                setSearch('')
                setCategory('')
              }}
            >
              {t('resetFilters')}
            </button>
          )}
        </div>
        {productsLoading ? (
          <LoadingState label={t('loadingProducts')} />
        ) : productsError ? (
          <p className="inline-error" role="alert">
            {t('productsCouldNotLoad')}
          </p>
        ) : visibleProducts.length === 0 && (search || category) ? (
          <EmptyState title={t('noProductsFound')} message={t('trySearchOrCategory')} />
        ) : (
          <ProductGrid products={visibleProducts} />
        )}
      </section>
    </main>
  )
}
