export interface Category {
  slug: string
  name: string
  productCount?: number
}

export interface MarketplaceSearchFilters {
  q?: string
  category?: string
  shop?: string
  minPrice?: string
  maxPrice?: string
  inStock?: boolean
}

export interface MarketplaceSearchResult {
  shops: Shop[]
  products: Product[]
  totalShops: number
  totalProducts: number
}

export interface Shop {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  logoUrl: string
  bannerUrl: string
  categories: string[]
  location: string
  contactEmail?: string
  contactPhone?: string
  whatsapp?: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string
  is_seller: boolean
}

export interface SellerDashboard {
  total_products: number
  active_products: number
  pending_orders: number
  completed_orders: number
  today_sales: string
  month_sales: string
  low_stock_products: number
  pending_cancellations?: number
  recent_orders?: SellerOrder[]
}

export interface SellerOrder {
  id: number
  order_number: string
  customer_name: string
  status: string
  total: string
  created_at: string
}

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed'],
  out_for_delivery: ['completed'],
}

export interface SellerCategory {
  id: number
  shop: number | null
  name: string
  slug: string
  is_global: boolean
  is_active: boolean
}

export interface SellerProductImage {
  id: number
  product: number
  image_public_id: string
  image_url: string
  alt_text: string
  sort_order: number
}

export interface SellerProduct {
  id: number
  shop: number
  category: number | null
  category_detail?: { id: number; name: string; slug: string } | null
  name: string
  slug: string
  description: string
  ingredients: string
  allergens: string
  price: string
  compare_at_price: string | null
  stock_quantity: number
  sku: string
  image_public_id: string
  image_url: string
  external_image_url: string
  images: SellerProductImage[]
  is_active: boolean
  is_approved: boolean
  is_featured: boolean
  preparation_time_minutes?: number | null
}

export interface Coupon {
  id: number
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  min_order_amount: string
  usage_limit: number | null
  used_count: number
  active: boolean
  starts_at: string | null
  ends_at: string | null
}

export interface CouponInput {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  min_order_amount?: string
  usage_limit?: number | null
  active: boolean
}

export interface Campaign {
  id: number
  title: string
  description: string
  banner_image: string | null
  starts_at: string
  ends_at: string
  active: boolean
  featured_product: number | null
}

export interface CampaignInput {
  title: string
  description: string
  starts_at: string
  ends_at: string
  active: boolean
}

export interface Product {
  id: string
  shopId?: string
  shopSlug: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  stock: number
  images: string[]
  featured?: boolean
  sellerContact?: {
    email?: string
    phone?: string
    whatsapp?: string
  }
}

export interface OrderRequest {
  shop_id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  order_type: 'pickup' | 'delivery'
  customer_note: string
  payment_method: 'cash'
  terms_accepted: true
  items: Array<{ product_id: number; quantity: number }>
  create_account?: boolean
  password?: string
  password_confirm?: string
}

export interface OrderConfirmation {
  id: number
  order_number: string
  shop_name: string
  total: string
  status: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface CartSnapshot {
  items: CartItem[]
}

export interface ApiErrorShape {
  message: string
  status: number
}
