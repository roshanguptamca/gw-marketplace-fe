import { NavLink, Outlet } from 'react-router-dom'

export function SellerLayout() {
  return (
    <main className="page-shell seller-shell">
      <aside className="seller-nav">
        <p className="eyebrow">Seller portal</p>
        <h1>Manage shop</h1>
        <nav aria-label="Seller navigation">
          <NavLink end to="/seller">
            Overview
          </NavLink>
          <NavLink to="/seller/products">Products</NavLink>
          <NavLink to="/seller/orders">Orders</NavLink>
          <NavLink to="/seller/coupons">Coupons</NavLink>
          <NavLink to="/seller/campaigns">Campaigns</NavLink>
          <NavLink to="/seller/settings">Settings</NavLink>
          <NavLink to="/seller/theme">Theme</NavLink>
          <NavLink to="/seller/domain">Domain</NavLink>
          <NavLink to="/seller/media">Media</NavLink>
        </nav>
      </aside>
      <div className="seller-content">
        <Outlet />
      </div>
    </main>
  )
}
