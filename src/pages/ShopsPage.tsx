import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { localizedText } from '../utils/localizedText'
import {
  getShopBannerUrl,
  getShopLogoUrl,
  handleShopBannerError,
  handleShopLogoError,
} from '../utils/shopImages'

export function ShopsPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const {
    data: shops,
    loading,
    error,
  } = useMarketplaceData(() => marketplaceService.getShops(), [])
  useEffect(() => {
    document.title = 'All shops | GuideWisey Marketplace'
  }, [])
  const q = params.get('q') ?? ''
  const country = params.get('country') ?? ''
  const city = params.get('city') ?? ''
  const countries = [...new Set((shops ?? []).map((shop) => shop.country).filter(Boolean))].sort()
  const cities = [
    ...new Set(
      (shops ?? [])
        .filter((shop) => !country || shop.country === country)
        .map((shop) => shop.location)
        .filter(Boolean),
    ),
  ].sort()
  const visible = (shops ?? [])
    .filter(
      (shop) =>
        (!country || shop.country === country) &&
        (!city || shop.location === city) &&
        [
          shop.name,
          shop.location,
          ...shop.categories,
          localizedText(shop.description, shop.translations, 'description', i18n.language),
        ]
          .join(' ')
          .toLocaleLowerCase(i18n.language)
          .includes(q.trim().toLocaleLowerCase(i18n.language)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language))
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'country') next.delete('city')
    setParams(next, { replace: true })
  }
  return (
    <main className="page-shell section shops-directory">
      <nav className="catalog-view-nav" aria-label={t('marketplaceViews')}>
        <Link to="/">{t('browseProducts')}</Link>
        <Link to="/shops" aria-current="page">
          {t('allShops')}
        </Link>
      </nav>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('shopSmall')}</p>
          <h1>{t('allShops')}</h1>
          <p className="muted">{t('shopsDirectoryIntro')}</p>
        </div>
      </div>
      <form
        className="shops-directory__filters"
        role="search"
        aria-label={t('findShops')}
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          {t('findShops')}
          <input
            type="search"
            value={q}
            placeholder={t('findShopsPlaceholder')}
            onChange={(event) => update('q', event.target.value)}
          />
        </label>
        <label>
          {t('country')}
          <select value={country} onChange={(event) => update('country', event.target.value)}>
            <option value="">{t('allCountries')}</option>
            {countries.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {t('city')}
          <select value={city} onChange={(event) => update('city', event.target.value)}>
            <option value="">{t('allCities')}</option>
            {cities.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button className="button button--ghost" type="button" onClick={() => setParams({})}>
          {t('clearShopFilters')}
        </button>
      </form>
      {loading && <LoadingState label={t('findingShops')} />}
      {error && <EmptyState title={t('shopsUnavailable')} message={t('tryAgain')} />}
      {!loading && !error && (
        <>
          <p className="shops-directory__count" aria-live="polite">
            {t('directoryShopCount', { count: visible.length })}
          </p>
          {visible.length === 0 ? (
            <EmptyState title={t('noShops')} message={t('tryDifferentFilters')} />
          ) : (
            <div className="shop-grid">
              {visible.map((shop) => (
                <Link
                  className="shop-tile"
                  to={`/shop/${shop.slug}`}
                  state={{ returnTo: `/shops${params.size ? `?${params}` : ''}` }}
                  key={shop.id}
                >
                  <img
                    src={getShopBannerUrl(shop.bannerUrl)}
                    alt=""
                    onError={handleShopBannerError}
                  />
                  <div className="shop-tile__body">
                    <img src={getShopLogoUrl(shop.logoUrl)} alt="" onError={handleShopLogoError} />
                    <div>
                      <h2>{shop.name}</h2>
                      <p>
                        {localizedText(
                          shop.shortDescription || shop.description,
                          shop.translations,
                          shop.shortDescription ? 'short_description' : 'description',
                          i18n.language,
                        )}
                      </p>
                      <p>{[shop.location, shop.country].filter(Boolean).join(' · ')}</p>
                      <span>{shop.categories.join(' · ')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
