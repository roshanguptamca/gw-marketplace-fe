import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { env } from '../config/env'
import { useTheme } from '../theme/useTheme'
import i18n from '../i18n'

export function Header() {
  const { t } = useTranslation()
  const { itemCount } = useCart()
  const { user, loading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label={t('brandHomeAria')}>
          <span className="brand__mark">G</span>
          <span>{t('brand')}</span>
        </Link>
        <nav aria-label={t('mainNavigationAria')}>
          <Link to="/">{t('browse')}</Link>
          <Link to="/cart" className="cart-link">
            {t('cart')}
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>
          <div className="language-switch" role="group" aria-label={t('language')}>
            {(['en', 'nl'] as const).map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={i18n.language === language}
                onClick={() => void i18n.changeLanguage(language)}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="theme-toggle"
            type="button"
            aria-label={theme === 'dark' ? t('switchToLightMode') : t('switchToDarkMode')}
            title={theme === 'dark' ? t('switchToLightMode') : t('switchToDarkMode')}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
          {!loading &&
            (user ? (
              <div className="user-menu" ref={menuRef}>
                <button
                  className="user-menu__trigger"
                  aria-label={t('userMenuAria')}
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
                    <button role="menuitem" onClick={() => void logout()}>
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="header-actions">
                <a className="header-action header-become-seller" href={env.sellerSignupUrl}>
                  {t('becomeSeller')}
                </a>
                <a className="header-action header-login" href={env.loginUrl}>
                  <span aria-hidden="true">○</span>
                  {t('login')}
                </a>
              </div>
            ))}
        </nav>
      </div>
    </header>
  )
}
