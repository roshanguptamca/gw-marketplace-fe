import { NavLink, Outlet } from 'react-router-dom'

export function SellerLayout() {
  return (
    <main className="page-shell seller-shell">
      <aside className="seller-nav">
        <p className="eyebrow">Seller portal</p>
        <h1>Manage shop</h1>
        <p className="seller-nav__lead">Products, orders, shop settings, and storefront controls.</p>
        <nav aria-label="Seller navigation">
          <div className="seller-nav-section">
            <p className="seller-nav-section-title">Dashboard</p>
            <NavLink end to="/seller">
              Overview
            </NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">Shop Configuration</p>
            <NavLink to="/seller/shop-details">Shop Details</NavLink>
            <NavLink to="/seller/shop-logo-banner">Logo & Banner</NavLink>
            <NavLink to="/seller/shop-contact">Contact Information</NavLink>
            <NavLink to="/seller/shop-delivery">Delivery & Pickup</NavLink>
            <NavLink to="/seller/shop-hours">Opening Hours</NavLink>
            <NavLink to="/seller/shop-orders">Order Settings</NavLink>
            <NavLink to="/seller/shop-notifications">Notifications</NavLink>
            <NavLink to="/seller/shop-preview">Public Shop Preview</NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">Products</p>
            <NavLink to="/seller/products">Products</NavLink>
            <NavLink to="/seller/categories">Categories</NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">Sales</p>
            <NavLink to="/seller/orders">Orders</NavLink>
            <NavLink to="/seller/coupons">Coupons</NavLink>
            <NavLink to="/seller/campaigns">Campaigns</NavLink>
          </div>

          <div className="seller-nav-section">
            <p className="seller-nav-section-title">Advanced</p>
            <NavLink to="/seller/settings">Settings</NavLink>
            <NavLink to="/seller/theme">Theme</NavLink>
            <NavLink to="/seller/domain">Domain</NavLink>
            <NavLink to="/seller/media">Media</NavLink>
          </div>
        </nav>
      </aside>
      <div className="seller-content">
        <Outlet />
      </div>
    </main>
  )
}
