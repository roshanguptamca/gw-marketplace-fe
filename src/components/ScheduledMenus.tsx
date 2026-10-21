import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { Product, ScheduledMenu } from '../types/marketplace'
import { ProductGrid } from './ProductGrid'

export function menuDate(value: string, timezone: string, language: string) {
  return new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))
}

export function ScheduledMenus({ slug, products }: { slug: string; products: Product[] }) {
  const { t, i18n } = useTranslation()
  const { data: menus, error } = useMarketplaceData(
    () => marketplaceService.getScheduledMenus(slug),
    [slug],
  )
  const [selected, setSelected] = useState<number | null>(null)
  if (error || !menus?.length) return null
  return (
    <section className="page-shell section" aria-label={t('menus.title')}>
      <h2>{t('menus.title')}</h2>
      <div className="scheduled-menu-grid">
        {menus.map((menu: ScheduledMenu) => (
          <article className="scheduled-menu-card" key={menu.id}>
            <p className="eyebrow">
              {menu.pickup_date} · {menu.pickup_start.slice(0, 5)}–{menu.pickup_end.slice(0, 5)} (
              {menu.timezone})
            </p>
            <h3>{menu.title}</h3>
            <p>{menu.description}</p>
            <p>
              {t('menus.deadline')}: {menuDate(menu.order_deadline, menu.timezone, i18n.language)}
            </p>
            <p>{t('menus.remaining', { count: menu.remaining_capacity })}</p>
            <button
              className="button"
              type="button"
              disabled={!menu.is_open}
              aria-expanded={selected === menu.id}
              onClick={() => setSelected(selected === menu.id ? null : menu.id)}
            >
              {t(menu.is_open ? 'menus.choose' : 'menus.closed')}
            </button>
            {selected === menu.id && (
              <>
                <p className="inline-note">{t('menus.pickupOnly')}</p>
                <ProductGrid
                  products={products
                    .filter((p) => menu.products.includes(Number(p.id)))
                    .map((p) => ({
                      ...p,
                      scheduledMenuId: menu.id,
                      scheduledMenuTitle: menu.title,
                      stock: Math.min(p.stock, menu.remaining_capacity),
                    }))}
                />
                <Link className="button" to="/cart">
                  {t('cart')}
                </Link>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
