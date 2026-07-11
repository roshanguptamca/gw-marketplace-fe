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
import { ProtectedBuyerRoute } from './auth/ProtectedBuyerRoute'
import { BuyerOrdersPage } from './pages/BuyerOrdersPage'
import { BuyerOrderDetailPage } from './pages/BuyerOrderDetailPage'
import { SellerLayout } from './seller/SellerLayout'
import { SellerDashboardPage } from './seller/SellerDashboardPage'
import { SellerProductsPage } from './seller/SellerProductsPage'
import { SellerProductFormPage } from './seller/SellerProductFormPage'
import { SellerOrdersPage } from './seller/SellerOrdersPage'
import { SellerCouponsPage } from './seller/SellerCouponsPage'
import { SellerCampaignsPage } from './seller/SellerCampaignsPage'
import { SellerSettingsPage } from './seller/SellerSettingsPage'
import { SellerPlaceholderPage } from './seller/SellerPlaceholderPage'
import { SellerShopDetailsPage } from './seller/SellerShopDetailsPage'
import { SellerShopLogoBannerPage } from './seller/SellerShopLogoBannerPage'
import { SellerShopContactPage } from './seller/SellerShopContactPage'
import { SellerShopDeliveryPage } from './seller/SellerShopDeliveryPage'
import { SellerShopHoursPage } from './seller/SellerShopHoursPage'
import { SellerShopOrderSettingsPage } from './seller/SellerShopOrderSettingsPage'
import { SellerShopNotificationsPage } from './seller/SellerShopNotificationsPage'
import { SellerShopPreviewPage } from './seller/SellerShopPreviewPage'

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
                  path="account/orders"
                  element={
                    <ProtectedBuyerRoute nextPath="/account/orders">
                      <BuyerOrdersPage />
                    </ProtectedBuyerRoute>
                  }
                />
                <Route
                  path="account/orders/:orderId"
                  element={
                    <ProtectedBuyerRoute nextPath="/account/orders">
                      <BuyerOrderDetailPage />
                    </ProtectedBuyerRoute>
                  }
                />
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

                  <Route path="shop-details" element={<SellerShopDetailsPage />} />
                  <Route path="shop-logo-banner" element={<SellerShopLogoBannerPage />} />
                  <Route path="shop-contact" element={<SellerShopContactPage />} />
                  <Route path="shop-delivery" element={<SellerShopDeliveryPage />} />
                  <Route path="shop-hours" element={<SellerShopHoursPage />} />
                  <Route path="shop-orders" element={<SellerShopOrderSettingsPage />} />
                  <Route path="shop-notifications" element={<SellerShopNotificationsPage />} />
                  <Route path="shop-preview" element={<SellerShopPreviewPage />} />

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
