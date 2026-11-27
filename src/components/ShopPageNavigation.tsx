import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { shopPageService } from '../services/shopPageService'
import { shopPath } from '../utils/shopLinks'

export function ShopPageNavigation({
  shopSlug,
  activeSlug,
  featured = false,
}: {
  shopSlug: string
  activeSlug?: string
  featured?: boolean
}) {
  const { t } = useTranslation()
  const { data } = useMarketplaceData(() => shopPageService.listPublic(shopSlug), [shopSlug])
  // Defensive filtering also keeps unpublished configuration out of older API responses.
  const pages = (Array.isArray(data) ? data : [])
    .filter((page) => page.is_published)
    .sort((a, b) => a.position - b.position || a.id - b.id)
  if (!pages.length) return null
  const highlights = featured ? pages.filter((page) => page.is_featured && page.ordering_open) : []
  return (
    <div className="page-shell shop-pages">
      <nav className="shop-page-nav" aria-label={t('shopPageNavigation')}>
        <Link to={shopPath(shopSlug)} aria-current={!activeSlug ? 'page' : undefined}>
          {t('allProducts')}
        </Link>
        {pages.map((page) => (
          <Link
            key={page.id}
            to={shopPath(shopSlug, `/pages/${page.slug}`)}
            aria-current={activeSlug === page.slug ? 'page' : undefined}
          >
            {page.title}
          </Link>
        ))}
      </nav>
      {highlights.map((page) => (
        <Link
          className="shop-page-feature"
          key={page.id}
          to={shopPath(shopSlug, `/pages/${page.slug}`)}
        >
          {page.cover_url && <img src={page.cover_url} alt="" loading="lazy" />}
          <div>
            <strong>{page.title}</strong>
            {page.fulfilment_notes && <p>{page.fulfilment_notes}</p>}
          </div>
          <span>{t('viewMenuPage')} →</span>
        </Link>
      ))}
    </div>
  )
}
