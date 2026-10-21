import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function SellerLayout() {
  const { t } = useTranslation()
  const [navigationOpen, setNavigationOpen] = useState(false)
  return (
    <main className="page-shell seller-shell">
      <aside className="seller-nav">
        <p className="eyebrow">{t('sellerPortal')}</p>
        <h2>{t('sellerManageShop')}</h2>
        <p className="seller-nav__lead">{t('sellerNavLead')}</p>
        <button
          type="button"
          className="seller-nav-toggle button button--ghost"
          aria-expanded={navigationOpen}
          aria-controls="seller-navigation-links"
          onClick={() => setNavigationOpen((open) => !open)}
        >
          {t('menus.sellerMenu')} <span aria-hidden="true">{navigationOpen ? '▴' : '▾'}</span>
        </button>
        <nav
          id="seller-navigation-links"
          className={navigationOpen ? 'is-open' : ''}
          aria-label={t('sellerNavigation')}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setNavigationOpen(false)
          }}
        >
          <div className="seller-nav-section">
            <p className="seller-nav-section-title">{t('sellerDashboard')}</p>
            <NavLink end to="/seller">
              {t('sellerOverview')}
            </NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">{t('sellerShopConfiguration')}</p>
            <NavLink to="/seller/shop-details">{t('sellerShopDetails')}</NavLink>
            <NavLink to="/seller/shop-logo-banner">{t('sellerLogoBanner')}</NavLink>
            <NavLink to="/seller/shop-contact">{t('sellerContactInformation')}</NavLink>
            <NavLink to="/seller/shop-delivery">{t('sellerDeliveryPickup')}</NavLink>
            <NavLink to="/seller/shop-hours">{t('sellerOpeningHours')}</NavLink>
            <NavLink to="/seller/shop-orders">{t('sellerOrderSettings')}</NavLink>
            <NavLink to="/seller/shop-billing">{t('sellerBillingInvoices')}</NavLink>
            <NavLink to="/seller/shop-notifications">{t('sellerNotifications')}</NavLink>
            <NavLink to="/seller/shop-preview">{t('sellerPublicPreview')}</NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">{t('sellerProducts')}</p>
            <NavLink to="/seller/products">{t('sellerProducts')}</NavLink>
            <NavLink to="/seller/categories">{t('sellerCategories')}</NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">{t('sellerSales')}</p>
            <NavLink to="/seller/orders">{t('sellerOrders')}</NavLink>
            <NavLink to="/seller/scheduled-menus">{t('menus.title')}</NavLink>
            <NavLink to="/seller/coupons">{t('sellerCoupons')}</NavLink>
            <NavLink to="/seller/campaigns">{t('sellerCampaigns')}</NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">{t('sellerAdvanced')}</p>
            <NavLink to="/seller/settings">{t('sellerSettings')}</NavLink>
            <NavLink to="/seller/theme">{t('sellerTheme')}</NavLink>
            <NavLink to="/seller/domain">{t('sellerDomain')}</NavLink>
            <NavLink to="/seller/media">{t('sellerMedia')}</NavLink>
          </div>
        </nav>
      </aside>
      <div className="seller-content">
        <Outlet />
      </div>
    </main>
  )
}
