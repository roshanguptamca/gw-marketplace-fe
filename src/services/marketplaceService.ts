import { env } from '../config/env'
import { mockProducts, mockShops } from '../data/mockData'
import type {
  CartSnapshot,
  OrderConfirmation,
  OrderRequest,
  Product,
  SellerDashboard,
  SellerOrder,
  Shop,
} from '../types/marketplace'
import { apiRequest } from './apiClient'

const MOCK_DELAY_MS = 30

interface ApiShop {
  id: number
  slug: string
  name: string
  description: string
  logo_url: string
  banner_url: string
  city: string
  contact_email?: string
  contact_phone?: string
  settings?: { currency?: string; whatsapp_number?: string }
}

interface ApiProductImage {
  image_url: string
}

export interface ApiProduct {
  id: number
  shop: ApiShop | number
  name: string
  slug: string
  description: string
  price: string
  stock_quantity: number
  image_url: string
  external_image_url: string
  images: ApiProductImage[]
  category_detail?: { name: string } | null
  is_featured: boolean
  is_active: boolean
  is_approved: boolean
  sku?: string | null
}

function normalizeShop(shop: ApiShop): Shop {
  return {
    id: String(shop.id),
    slug: shop.slug,
    name: shop.name,
    tagline: shop.description || 'Independent seller on GuideWisey',
    description: shop.description,
    logoUrl: shop.logo_url,
    bannerUrl: shop.banner_url,
    categories: [],
    location: shop.city,
    contactEmail: shop.contact_email,
    contactPhone: shop.contact_phone,
    whatsapp: shop.settings?.whatsapp_number,
  }
}

export function normalizeProduct(product: ApiProduct, fallbackShopSlug = ''): Product {
  const shop = typeof product.shop === 'object' ? product.shop : null
  const gallery = product.images.map((image) => image.image_url).filter(Boolean)
  const primary = product.image_url || product.external_image_url
  return {
    id: String(product.id),
    shopId: shop ? String(shop.id) : undefined,
    shopSlug: shop?.slug ?? fallbackShopSlug,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    currency: shop?.settings?.currency ?? 'EUR',
    category: product.category_detail?.name ?? 'Products',
    stock: product.stock_quantity,
    images: [...(primary ? [primary] : []), ...gallery].filter(
      (image, index, all) => all.indexOf(image) === index,
    ),
    featured: product.is_featured,
    sellerContact: {
      email: shop?.contact_email,
      phone: shop?.contact_phone,
      whatsapp: shop?.settings?.whatsapp_number,
    },
  }
}

async function mockResult<T>(value: T): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, MOCK_DELAY_MS))
  return structuredClone(value)
}

async function withDevelopmentFallback<T>(
  request: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  if (env.useMockApi) return mockResult(fallback())
  return request()
}

export const marketplaceService = {
  async getShops(): Promise<Shop[]> {
    return withDevelopmentFallback(
      async () => (await apiRequest<ApiShop[]>('/marketplace/shops/')).map(normalizeShop),
      () => mockShops,
    )
  },

  async getShopBySlug(slug: string): Promise<Shop | null> {
    return withDevelopmentFallback(
      async () =>
        normalizeShop(await apiRequest<ApiShop>(`/marketplace/shops/${encodeURIComponent(slug)}/`)),
      () => mockShops.find((shop) => shop.slug === slug) ?? null,
    )
  },

  async getShopProducts(slug: string): Promise<Product[]> {
    return withDevelopmentFallback(
      async () =>
        (
          await apiRequest<ApiProduct[]>(`/marketplace/shops/${encodeURIComponent(slug)}/products/`)
        ).map((product) => normalizeProduct(product, slug)),
      () => mockProducts.filter((product) => product.shopSlug === slug),
    )
  },

  async getProductDetails(shopSlug: string, productId: string): Promise<Product | null> {
    return withDevelopmentFallback(
      async () =>
        normalizeProduct(
          await apiRequest<ApiProduct>(`/marketplace/products/${encodeURIComponent(productId)}/`),
          shopSlug,
        ),
      () =>
        mockProducts.find((product) => product.shopSlug === shopSlug && product.id === productId) ??
        null,
    )
  },

  getCart: () =>
    withDevelopmentFallback(
      () => apiRequest<CartSnapshot>('/marketplace/cart/'),
      () => ({ items: [] }),
    ),
  addCartItem: (productId: string, quantity: number) =>
    withDevelopmentFallback(
      () =>
        apiRequest<CartSnapshot>('/marketplace/cart/items/', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId, quantity }),
        }),
      () => ({ items: [] }),
    ),
  updateCartItem: (productId: string, quantity: number) =>
    withDevelopmentFallback(
      () =>
        apiRequest<CartSnapshot>(`/marketplace/cart/items/${encodeURIComponent(productId)}/`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        }),
      () => ({ items: [] }),
    ),
  removeCartItem: (productId: string) =>
    withDevelopmentFallback(
      () =>
        apiRequest<CartSnapshot>(`/marketplace/cart/items/${encodeURIComponent(productId)}/`, {
          method: 'DELETE',
        }),
      () => ({ items: [] }),
    ),

  getSellerDashboard: () => apiRequest<SellerDashboard>('/seller/dashboard/'),
  getSellerProducts: () => apiRequest<ApiProduct[]>('/seller/products/'),
  getSellerOrders: () => apiRequest<SellerOrder[]>('/seller/orders/'),
  getSellerShop: () => apiRequest<ApiShop>('/seller/shop/'),
  updateSellerShop: (data: Partial<ApiShop>) =>
    apiRequest<ApiShop>('/seller/shop/', { method: 'PATCH', body: JSON.stringify(data) }),
  updateSellerProduct: (id: number, data: Partial<ApiProduct>) =>
    apiRequest<ApiProduct>(`/seller/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSellerProduct: (id: number) =>
    apiRequest<void>(`/seller/products/${id}/`, { method: 'DELETE' }),

  createOrderRequest: (order: OrderRequest) =>
    withDevelopmentFallback(
      () =>
        apiRequest<OrderConfirmation>('/marketplace/orders/', {
          method: 'POST',
          body: JSON.stringify(order),
        }),
      () => ({
        id: Date.now(),
        order_number: `GW-DEMO-${Date.now().toString().slice(-6)}`,
        shop_name: mockShops.find((shop) => shop.id === String(order.shop_id))?.name ?? 'Seller',
        total: '0.00',
        status: 'pending',
      }),
    ),
}
