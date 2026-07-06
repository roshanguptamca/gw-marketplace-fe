import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CartProvider } from './cart/CartContext'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { Layout } from './components/Layout'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ErrorPage } from './pages/ErrorPage'
import { MarketplaceHomePage } from './pages/MarketplaceHomePage'
import { ProductDetailsPage } from './pages/ProductDetailsPage'
import { ProductListingPage } from './pages/ProductListingPage'
import { SellerNotFoundPage } from './pages/SellerNotFoundPage'
import { ShopStorefrontPage } from './pages/ShopStorefrontPage'
import { getShopSlugFromHostname } from './utils/shopResolver'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedSellerRoute } from './auth/ProtectedSellerRoute'
import { SellerLayout } from './seller/SellerLayout'
import { SellerDashboardPage } from './seller/SellerDashboardPage'
import { SellerProductsPage } from './seller/SellerProductsPage'
import { SellerProductFormPage } from './seller/SellerProductFormPage'
import { SellerOrdersPage } from './seller/SellerOrdersPage'
import { SellerCouponsPage } from './seller/SellerCouponsPage'
import { SellerCampaignsPage } from './seller/SellerCampaignsPage'
import { SellerSettingsPage } from './seller/SellerSettingsPage'
import { SellerPlaceholderPage } from './seller/SellerPlaceholderPage'

export function App() {
  const hostnameShopSlug = getShopSlugFromHostname(window.location.hostname)

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                {hostnameShopSlug ? (
                  <>
                    <Route index element={<ShopStorefrontPage resolvedSlug={hostnameShopSlug} />} />
                    <Route
                      path="products"
                      element={<ProductListingPage resolvedSlug={hostnameShopSlug} />}
                    />
                    <Route
                      path="products/:productId"
                      element={<ProductDetailsPage resolvedSlug={hostnameShopSlug} />}
                    />
                  </>
                ) : (
                  <>
                    <Route index element={<MarketplaceHomePage />} />
                    <Route path="shop/:shopSlug" element={<ShopStorefrontPage />} />
                    <Route path="shop/:shopSlug/products" element={<ProductListingPage />} />
                    <Route
                      path="shop/:shopSlug/products/:productId"
                      element={<ProductDetailsPage />}
                    />
                    <Route path="shop/*" element={<SellerNotFoundPage />} />
                  </>
                )}
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route
                  path="seller"
                  element={
                    <ProtectedSellerRoute>
                      <SellerLayout />
                    </ProtectedSellerRoute>
                  }
                >
                  <Route index element={<SellerDashboardPage />} />
                  <Route path="dashboard" element={<SellerDashboardPage />} />
                  <Route path="products" element={<SellerProductsPage />} />
                  <Route path="products/new" element={<SellerProductFormPage />} />
                  <Route path="products/:id/edit" element={<SellerProductFormPage />} />
                  <Route path="orders" element={<SellerOrdersPage />} />
                  <Route
                    path="orders/:id"
                    element={
                      <SellerPlaceholderPage
                        eyebrow="Fulfilment"
                        title="Order details"
                        message="Order details and status actions will appear here."
                      />
                    }
                  />
                  <Route path="coupons" element={<SellerCouponsPage />} />
                  <Route path="campaigns" element={<SellerCampaignsPage />} />
                  <Route path="settings" element={<SellerSettingsPage />} />
                  <Route
                    path="theme"
                    element={
                      <SellerPlaceholderPage
                        eyebrow="Storefront"
                        title="Theme"
                        message="Storefront theme controls are coming next."
                      />
                    }
                  />
                  <Route
                    path="domain"
                    element={
                      <SellerPlaceholderPage
                        eyebrow="Storefront"
                        title="Domain"
                        message="Shop domain status and guidance will appear here."
                      />
                    }
                  />
                  <Route
                    path="media"
                    element={
                      <SellerPlaceholderPage
                        eyebrow="Storefront"
                        title="Media"
                        message="Manage shop logos, banners and product media here."
                      />
                    }
                  />
                </Route>
                <Route path="*" element={<ErrorPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
