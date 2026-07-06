import { env } from '../config/env'
import { mockProducts, mockShops } from '../data/mockData'
import type {
  Campaign,
  CampaignInput,
  CartSnapshot,
  Category,
  Coupon,
  CouponInput,
  MarketplaceSearchFilters,
  MarketplaceSearchResult,
  OrderConfirmation,
  OrderRequest,
  Product,
  SellerCategory,
  SellerDashboard,
  SellerOrder,
  SellerProduct,
  SellerProductImage,
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

interface ApiCategory {
  slug: string
  name: string
  product_count?: number
}

function normalizeCategory(category: ApiCategory): Category {
  return {
    slug: category.slug,
    name: category.name,
    productCount: category.product_count,
  }
}

function buildSearchQuery(filters: MarketplaceSearchFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.shop) params.set('shop', filters.shop)
  if (filters.minPrice) params.set('min_price', filters.minPrice)
  if (filters.maxPrice) params.set('max_price', filters.maxPrice)
  if (filters.inStock) params.set('in_stock', 'true')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function mockSearch(filters: MarketplaceSearchFilters): MarketplaceSearchResult {
  const q = (filters.q ?? '').trim().toLowerCase()
  const minPrice = filters.minPrice ? Number(filters.minPrice) : undefined
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined

  const shops = mockShops.filter((shop) => {
    if (filters.shop && shop.slug !== filters.shop) return false
    if (q && !shop.name.toLowerCase().includes(q) && !shop.description.toLowerCase().includes(q))
      return false
    return true
  })

  const products = mockProducts.filter((product) => {
    if (filters.shop && product.shopSlug !== filters.shop) return false
    if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase())
      return false
    if (
      q &&
      !product.name.toLowerCase().includes(q) &&
      !product.description.toLowerCase().includes(q)
    )
      return false
    if (minPrice !== undefined && product.price < minPrice) return false
    if (maxPrice !== undefined && product.price > maxPrice) return false
    if (filters.inStock && product.stock <= 0) return false
    return true
  })

  return { shops, products, totalShops: shops.length, totalProducts: products.length }
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

  async getCategories(): Promise<Category[]> {
    return withDevelopmentFallback(
      async () =>
        (await apiRequest<ApiCategory[]>('/marketplace/categories/')).map(normalizeCategory),
      () => {
        const seen = new Map<string, number>()
        mockProducts.forEach((product) => {
          seen.set(product.category, (seen.get(product.category) ?? 0) + 1)
        })
        return [...seen.entries()].map(([name, productCount]) => ({
          slug: name.toLowerCase(),
          name,
          productCount,
        }))
      },
    )
  },

  async search(filters: MarketplaceSearchFilters): Promise<MarketplaceSearchResult> {
    return withDevelopmentFallback(
      async () => {
        const response = await apiRequest<{
          shops: ApiShop[]
          products: ApiProduct[]
          total_shops: number
          total_products: number
        }>(`/marketplace/search/${buildSearchQuery(filters)}`)
        return {
          shops: response.shops.map(normalizeShop),
          products: response.products.map((product) => normalizeProduct(product)),
          totalShops: response.total_shops,
          totalProducts: response.total_products,
        }
      },
      () => mockSearch(filters),
    )
  },

  async getShopBySlug(slug: string): Promise<Shop | null> {
    return withDevelopmentFallback(
      async () =>
        normalizeShop(await apiRequest<ApiShop>(`/marketplace/shops/${encodeURIComponent(slug)}/`)),
      () => mockShops.find((shop) => shop.slug === slug) ?? null,
    )
  },

  async getProducts(): Promise<Product[]> {
    return withDevelopmentFallback(
      async () =>
        (await apiRequest<ApiProduct[]>('/marketplace/products/')).map((product) =>
          normalizeProduct(product),
        ),
      () => mockProducts,
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
  updateSellerOrderStatus: (id: number, status: string) =>
    apiRequest<SellerOrder>(`/seller/orders/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
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

  // Full product editor (add/edit/delete + gallery), matching the existing
  // gw-frontend seller product form which posts multipart/form-data so the
  // main image file can be uploaded in the same request.
  getSellerCategories: () => apiRequest<SellerCategory[]>('/seller/categories/'),
  getSellerProduct: (id: number) => apiRequest<SellerProduct>(`/seller/products/${id}/`),
  createSellerProductForm: (formData: FormData) =>
    apiRequest<SellerProduct>('/seller/products/', { method: 'POST', body: formData }),
  updateSellerProductForm: (id: number, formData: FormData) =>
    apiRequest<SellerProduct>(`/seller/products/${id}/`, { method: 'PATCH', body: formData }),
  addSellerProductImage: (productId: number, formData: FormData) =>
    apiRequest<SellerProductImage>(`/seller/products/${productId}/images/`, {
      method: 'POST',
      body: formData,
    }),
  deleteSellerProductImage: (imageId: number) =>
    apiRequest<void>(`/seller/product-images/${imageId}/`, { method: 'DELETE' }),

  // Coupons
  getSellerCoupons: () => apiRequest<Coupon[]>('/seller/coupons/'),
  createSellerCoupon: (data: CouponInput) =>
    apiRequest<Coupon>('/seller/coupons/', { method: 'POST', body: JSON.stringify(data) }),
  updateSellerCoupon: (id: number, data: Partial<CouponInput>) =>
    apiRequest<Coupon>(`/seller/coupons/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSellerCoupon: (id: number) =>
    apiRequest<void>(`/seller/coupons/${id}/`, { method: 'DELETE' }),

  // Campaigns
  getSellerCampaigns: () => apiRequest<Campaign[]>('/seller/campaigns/'),
  createSellerCampaign: (data: CampaignInput) =>
    apiRequest<Campaign>('/seller/campaigns/', { method: 'POST', body: JSON.stringify(data) }),
  updateSellerCampaign: (id: number, data: Partial<CampaignInput>) =>
    apiRequest<Campaign>(`/seller/campaigns/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSellerCampaign: (id: number) =>
    apiRequest<void>(`/seller/campaigns/${id}/`, { method: 'DELETE' }),

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
