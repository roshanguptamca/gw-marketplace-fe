import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useMatch } from 'react-router-dom'
import { getShopSlugFromHostname } from '../utils/shopResolver'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { env } from '../config/env'
import { useTheme } from '../theme/useTheme'
import i18n from '../i18n'

export function Header() {
  const { t } = useTranslation()
  const shopMatch = useMatch('/shop/:shopSlug/*')
  const rishiShop =
    (getShopSlugFromHostname(window.location.hostname) || shopMatch?.params.shopSlug) ===
    'rishi-kitchen'
  const { itemCount } = useCart()
  const { user, loading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const updateHeight = () => {
      document.documentElement.style.setProperty(
        '--marketplace-header-height',
        `${header.getBoundingClientRect().height}px`,
      )
    }
    updateHeight()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight)
    observer?.observe(header)
    window.addEventListener('resize', updateHeight)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateHeight)
      document.documentElement.style.removeProperty('--marketplace-header-height')
    }
  }, [])

  const themeButton = (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={toggleTheme}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  )

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="GuideWisey Marketplace home">
          <img
            className="brand__logo"
            src="/GuideWisey_circular_favicon-32x32.png"
            alt=""
            width="36"
            height="36"
          />
          <span>{t('brand')}</span>
        </Link>
        <div className="header-utilities">
          <div className="language-switch" role="group" aria-label={t('language')}>
            {(['en', 'nl'] as const).map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={i18n.resolvedLanguage === language}
                aria-label={language === 'en' ? 'EN' : 'NL'}
                title={language === 'en' ? 'English' : 'Nederlands'}
                onClick={() => void i18n.changeLanguage(language)}
              >
                <span aria-hidden="true">{language === 'en' ? '🇬🇧' : '🇳🇱'}</span>
              </button>
            ))}
          </div>
          <span className="header-desktop-theme">{themeButton}</span>
        </div>
        <nav aria-label="Main navigation">
          {rishiShop && <div id="rishi-header-chat" />}
          <Link to="/shops" className="header-browse">
            {t('browse')}
          </Link>
          {!loading && !user && (
            <a className="header-action header-become-seller" href={env.sellerSignupUrl}>
              {t('becomeSeller')}
            </a>
          )}
          {!loading && user?.is_seller && (
            <Link to="/seller" className="header-action header-seller-portal">
              {t('sellerPortal')}
            </Link>
          )}
          <Link
            to="/cart"
            className="cart-link"
            aria-label={itemCount > 0 ? `${t('cart')} (${itemCount})` : t('cart')}
            title={t('cart')}
          >
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3h3l3 12h11l3-9H6" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            <span className="header-cart-label">{t('cart')}</span>
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>
          {!loading &&
            (user ? (
              <div className="user-menu" ref={menuRef}>
                <button
                  className="user-menu__trigger"
                  aria-label="User menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span aria-hidden="true">{user.first_name?.[0] || user.username[0] || 'U'}</span>
                </button>
                {menuOpen && (
                  <div className="user-menu__dropdown" role="menu">
                    <div className="user-menu__identity">
                      <strong>{user.first_name || user.username}</strong>
                      <span>{user.email}</span>
                    </div>
                    <a role="menuitem" href={`${env.mainFrontendUrl}/#profile`}>
                      {t('myAccount')}
                    </a>
                    <Link role="menuitem" to="/account/orders" onClick={() => setMenuOpen(false)}>
                      {t('myOrders')}
                    </Link>
                    {user.is_seller && (
                      <Link role="menuitem" to="/seller" onClick={() => setMenuOpen(false)}>
                        {t('sellerPortal')}
                      </Link>
                    )}
                    <div className="header-mobile-theme" role="none">
                      {themeButton}
                    </div>
                    <button role="menuitem" onClick={() => void logout()}>
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`header-guest-menu${menuOpen ? ' is-open' : ''}`} ref={menuRef}>
                <button
                  type="button"
                  className="header-guest-menu__trigger"
                  aria-label={t('navigationMenu')}
                  aria-expanded={menuOpen}
                  aria-controls="guest-navigation"
                  onClick={() => setMenuOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setMenuOpen(false)
                  }}
                >
                  ☰
                </button>
                <div className="header-actions" id="guest-navigation">
                  <div className="header-mobile-theme">{themeButton}</div>
                  <a className="header-action header-login" href={env.loginUrl}>
                    <span aria-hidden="true">○</span>
                    {t('login')}
                  </a>
                </div>
              </div>
            ))}
        </nav>
      </div>
    </header>
  )
}
