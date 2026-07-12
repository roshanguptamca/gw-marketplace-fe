import { env } from '../config/env'
import { mockProducts, mockShops } from '../data/mockData'
import type {
  AddressLookupResult,
  Campaign,
  CampaignInput,
  CartSnapshot,
  Category,
  Coupon,
  CouponInput,
  BuyerOrder,
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
  OpeningHour,
  ShopSettings,
  Shop,
} from '../types/marketplace'
import { ApiError, apiRequest } from './apiClient'

const MOCK_DELAY_MS = 30

interface ApiShop {
  id: number
  slug: string
  name: string
  description: string
  short_description?: string
  shop_type?: string
  phone?: string
  email?: string
  website_url?: string
  social_links?: string[]
  address?: string
  logo_url: string
  banner_url: string
  city: string
  postal_code?: string
  country?: string
  contact_email?: string
  contact_phone?: string
  pickup_available?: boolean
  delivery_available?: boolean
  opening_hours?: ApiOpeningHour[]
  is_active?: boolean
  is_approved?: boolean
  settings?: {
    currency?: string
    whatsapp_number?: string
    local_delivery_fee?: string
    international_delivery_fee?: string
    free_delivery_above?: string | null
    delivery_fee?: string
    min_order_amount?: string
    delivery_notes?: string
    order_acceptance_mode?: 'manual' | 'auto'
    bank_transfer_instructions?: string
    notification_email?: string
    new_order_email_enabled?: boolean
    cancellation_request_email_enabled?: boolean
    low_stock_notification_enabled?: boolean
    supported_delivery_countries?: string[]
  }
}

interface ApiOpeningHour {
  day_of_week: number
  is_closed: boolean
  open_time?: string
  close_time?: string
}

interface ApiShopSettings {
  currency: string
  min_order_amount: string
  delivery_fee: string
  local_delivery_fee: string
  international_delivery_fee: string
  free_delivery_above?: string | null
  delivery_notes: string
  order_acceptance_mode: 'manual' | 'auto'
  whatsapp_number: string
  bank_transfer_instructions: string
  notification_email: string
  new_order_email_enabled: boolean
  cancellation_request_email_enabled: boolean
  low_stock_notification_enabled: boolean
  supported_delivery_countries?: string[]
  pickup_available?: boolean
  delivery_available?: boolean
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

function normalizeOpeningHours(hours: ApiOpeningHour[] | undefined): OpeningHour[] {
  if (!Array.isArray(hours)) return []
  return hours
    .map((hour) => ({
      dayOfWeek: hour.day_of_week ?? (hour as unknown as { dayOfWeek?: number }).dayOfWeek ?? 0,
      isClosed:
        hour.is_closed ?? (hour as unknown as { isClosed?: boolean }).isClosed ?? false,
      openTime: hour.open_time ?? (hour as unknown as { openTime?: string }).openTime,
      closeTime: hour.close_time ?? (hour as unknown as { closeTime?: string }).closeTime,
    }))
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
}

function normalizeShopSettings(settings: ApiShopSettings | undefined): ShopSettings | undefined {
  if (!settings) return undefined
  return {
    currency: settings.currency ?? 'EUR',
    minOrderAmount: settings.min_order_amount ?? '0.00',
    deliveryFee: settings.delivery_fee ?? '0.00',
    localDeliveryFee: settings.local_delivery_fee ?? '0.00',
    internationalDeliveryFee: settings.international_delivery_fee ?? '0.00',
    freeDeliveryAbove: settings.free_delivery_above ?? null,
    deliveryNotes: settings.delivery_notes ?? '',
    orderAcceptanceMode: settings.order_acceptance_mode ?? 'manual',
    whatsappNumber: settings.whatsapp_number ?? '',
    bankTransferInstructions: settings.bank_transfer_instructions ?? '',
    notificationEmail: settings.notification_email ?? '',
    newOrderEmailEnabled: settings.new_order_email_enabled ?? true,
    cancellationRequestEmailEnabled: settings.cancellation_request_email_enabled ?? true,
    lowStockNotificationEnabled: settings.low_stock_notification_enabled ?? false,
    supportedDeliveryCountries: settings.supported_delivery_countries ?? [],
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
    shortDescription: shop.short_description ?? '',
    shopType: shop.shop_type ?? '',
    description: shop.description,
    phone: shop.phone,
    email: shop.email ?? shop.contact_email,
    websiteUrl: shop.website_url,
    socialLinks: shop.social_links ?? [],
    address: shop.address ?? '',
    logoUrl: shop.logo_url,
    bannerUrl: shop.banner_url,
    categories: shop.shop_type ? [shop.shop_type] : [],
    location: shop.city,
    postalCode: shop.postal_code,
    country: shop.country,
    contactEmail: shop.email ?? shop.contact_email,
    contactPhone: shop.phone ?? shop.contact_phone,
    whatsapp: shop.settings?.whatsapp_number,
    pickupAvailable: shop.pickup_available,
    deliveryAvailable: shop.delivery_available,
    localDeliveryFee: shop.settings?.local_delivery_fee
      ? Number(shop.settings.local_delivery_fee)
      : undefined,
    internationalDeliveryFee: shop.settings?.international_delivery_fee
      ? Number(shop.settings.international_delivery_fee)
      : undefined,
    freeDeliveryAbove: shop.settings?.free_delivery_above
      ? Number(shop.settings.free_delivery_above)
      : null,
    openingHours: normalizeOpeningHours(shop.opening_hours),
    active: shop.is_active,
    approved: shop.is_approved,
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
    shopName: shop?.name,
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

  // "My Orders" (buyer-facing) — lives inside the marketplace frontend so
  // customers never have to leave marketplace.guidewisey.com to track orders.
  getBuyerOrders: () => apiRequest<BuyerOrder[]>('/buyer/orders/'),
  getBuyerOrder: (id: number | string) =>
    apiRequest<BuyerOrder>(`/buyer/orders/${encodeURIComponent(String(id))}/`),
  // Instant self-serve cancel — only allowed while the order is still
  // "pending" (the seller hasn't accepted it yet), so no approval is needed.
  cancelBuyerOrder: (id: number | string) =>
    apiRequest<BuyerOrder>(`/buyer/orders/${encodeURIComponent(String(id))}/cancel/`, {
      method: 'POST',
    }),

  getSellerDashboard: () => apiRequest<SellerDashboard>('/seller/dashboard/'),
  getSellerProducts: () => apiRequest<ApiProduct[]>('/seller/products/'),
  getSellerOrders: () => apiRequest<SellerOrder[]>('/seller/orders/'),
  updateSellerOrderStatus: (id: number, status: string) =>
    apiRequest<SellerOrder>(`/seller/orders/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getSellerShop: async () => normalizeShop(await apiRequest<ApiShop>('/seller/shop/')),
  updateSellerShop: async (data: Partial<ApiShop>) =>
    normalizeShop(
      await apiRequest<ApiShop>('/seller/shop/', { method: 'PATCH', body: JSON.stringify(data) }),
    ),
  updateSellerShopForm: (formData: FormData) =>
    apiRequest<ApiShop>('/seller/shop/', { method: 'PATCH', body: formData }).then(normalizeShop),
  getSellerSettings: async () => {
    const settings = await apiRequest<ApiShopSettings>('/seller/settings/')
    return normalizeShopSettings(settings)
  },
  updateSellerSettings: (data: Partial<ShopSettings>) =>
    apiRequest<ApiShopSettings>('/seller/settings/', {
      method: 'PATCH',
      body: JSON.stringify({
        currency: data.currency,
        min_order_amount: data.minOrderAmount || '0.00',
        delivery_fee: data.deliveryFee || '0.00',
        local_delivery_fee: data.localDeliveryFee || '0.00',
        international_delivery_fee: data.internationalDeliveryFee || '0.00',
        free_delivery_above: data.freeDeliveryAbove,
        delivery_notes: data.deliveryNotes,
        order_acceptance_mode: data.orderAcceptanceMode,
        whatsapp_number: data.whatsappNumber,
        bank_transfer_instructions: data.bankTransferInstructions,
        notification_email: data.notificationEmail,
        new_order_email_enabled: data.newOrderEmailEnabled,
        cancellation_request_email_enabled: data.cancellationRequestEmailEnabled,
        low_stock_notification_enabled: data.lowStockNotificationEnabled,
        supported_delivery_countries: data.supportedDeliveryCountries,
        pickup_available: data.pickupAvailable,
        delivery_available: data.deliveryAvailable,
      }),
    }).then((settings) => normalizeShopSettings(settings) as ShopSettings),
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

  // Optional Dutch postcode + house number lookup used by checkout's "Find
  // address" button. Returns null on any failure (not found, disabled,
  // offline, etc.) so callers can always fall back to manual entry — this
  // must never throw and never block checkout.
  async lookupAddress(postcode: string, houseNumber: string): Promise<AddressLookupResult | null> {
    if (env.useMockApi) return null
    try {
      const params = new URLSearchParams({ postcode, house_number: houseNumber })
      return await apiRequest<AddressLookupResult>(`/marketplace/address-lookup/?${params}`)
    } catch (error) {
      if (error instanceof ApiError) return null
      return null
    }
  },
}
