import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { env } from '../config/env'
import { useTheme } from '../theme/useTheme'

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
        <Link to="/" className="brand" aria-label="GuideWisey Market home">
          <span className="brand__mark">G</span>
          <span>{t('brand')}</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/">{t('browse')}</Link>
          <Link to="/cart" className="cart-link">
            {t('cart')}
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </Link>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
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
                      My Account
                    </a>
                    <a role="menuitem" href={`${env.mainFrontendUrl}/#buyer-dashboard`}>
                      My Orders
                    </a>
                    {user.is_seller && (
                      <Link role="menuitem" to="/seller" onClick={() => setMenuOpen(false)}>
                        Seller Portal
                      </Link>
                    )}
                    <button role="menuitem" onClick={() => void logout()}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="header-actions">
                <a className="header-action header-become-seller" href={env.sellerSignupUrl}>
                  Become a Seller
                </a>
                <a className="header-action header-login" href={env.loginUrl}>
                  <span aria-hidden="true">○</span>
                  Login
                </a>
              </div>
            ))}
        </nav>
      </div>
    </header>
  )
}
