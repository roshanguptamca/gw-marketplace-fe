export interface Category {
  slug: string
  name: string
  productCount?: number
}

export interface MarketplaceSearchFilters {
  q?: string
  category?: string
  shop?: string
  country?: string
  city?: string
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
  shortDescription: string
  shopType: string
  description: string
  phone?: string
  email?: string
  websiteUrl?: string
  socialLinks?: string[]
  address?: string
  logoUrl: string
  bannerUrl: string
  logoPublicId?: string
  bannerPublicId?: string
  categories: string[]
  location: string
  postalCode?: string
  country?: string
  contactEmail?: string
  contactPhone?: string
  whatsapp?: string
  whatsappGroupUrl?: string
  minimumOrderAmount?: string
  pickupAddress?: {
    addressLine1: string
    addressLine2: string
    postalCode: string
    city: string
    country: string
  }
  pickupInstructions?: string
  deliveryInstructions?: string
  pickupAvailable?: boolean
  deliveryAvailable?: boolean
  localDeliveryFee?: number
  internationalDeliveryFee?: number
  freeDeliveryAbove?: number | null
  openingHours?: OpeningHour[]
  active?: boolean
  approved?: boolean
}

export interface OpeningHour {
  dayOfWeek: number
  isClosed: boolean
  openTime?: string
  closeTime?: string
}

export interface ShopSettings {
  currency: string
  minOrderAmount: string
  deliveryFee: string
  localDeliveryFee: string
  internationalDeliveryFee: string
  freeDeliveryAbove?: string | null
  deliveryNotes: string
  whatsappGroupUrl?: string
  pickupAddressLine1?: string
  pickupAddressLine2?: string
  pickupPostalCode?: string
  pickupCity?: string
  pickupCountry?: string
  pickupInstructions?: string
  orderAcceptanceMode: 'manual' | 'auto'
  whatsappNumber: string
  bankTransferInstructions: string
  notificationEmail: string
  newOrderEmailEnabled: boolean
  cancellationRequestEmailEnabled: boolean
  lowStockNotificationEnabled: boolean
  supportedDeliveryCountries: string[]
  pickupAvailable?: boolean
  deliveryAvailable?: boolean
  pickupSlotMinutes?: number
  pickupTimezone?: string
  pickupBookingWindowDays?: number
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
  total_orders: number
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

export interface SellerCategoryInput {
  name: string
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
  selling_unit?: SellingUnit
  units_per_pack?: number | null
  weight_value?: string | null
  weight_unit?: MeasureUnit | ''
  minimum_order_quantity?: number | null
  minimum_physical_units?: number | null
  minimum_order_amount?: string | null
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

export const SELLING_UNITS = ['PIECE', 'PACK', 'PLATE', 'BOX', 'TRAY', 'BOTTLE', 'WEIGHT'] as const
export type SellingUnit = (typeof SELLING_UNITS)[number]
export const MEASURE_UNITS = ['GRAM', 'KILOGRAM', 'MILLILITRE', 'LITRE'] as const
export type MeasureUnit = (typeof MEASURE_UNITS)[number]

export interface OrderingRules {
  minimumOrderQuantity: number | null
  minimumPhysicalUnits: number | null
  minimumOrderAmount: number | null
  orderLeadTimeHours: number
}

export interface Product {
  id: string
  shopId?: string
  shopSlug: string
  shopName?: string
  name: string
  description: string
  ingredients?: string
  allergens?: string
  price: number
  currency: string
  category: string
  stock: number
  images: string[]
  featured?: boolean
  sku?: string
  // Optional so carts saved before selling formats existed still render.
  sellingUnit?: SellingUnit
  unitsPerPack?: number | null
  weightValue?: number | null
  weightUnit?: MeasureUnit | null
  orderingRules?: OrderingRules
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
  delivery_zone?: 'local' | 'international'
  customer_note: string
  payment_method: 'cash'
  terms_accepted: true
  items: Array<{ product_id: number; quantity: number }>
  pickup_slot_start?: string | null
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
  subtotal?: string
  delivery_fee?: string
  order_type?: 'pickup' | 'delivery'
}

export interface BuyerOrderItem {
  id: number
  product: number | null
  product_name: string
  unit_price: string
  quantity: number
  line_total: string
  sku?: string
  selling_unit?: string
  units_per_pack?: number | null
  weight_value?: string | null
  weight_unit?: string
  physical_quantity?: number | null
  total_weight_value?: string | null
  quantity_description?: string
}

export interface PickupSlot {
  start: string
  end: string
  date: string
  label: string
}

export interface PickupSchedule {
  schedulingEnabled: boolean
  timezone: string
  slotMinutes: number
  requiredLeadTimeHours: number
  earliestAvailablePickup: string | null
  days: Array<{ date: string; label: string; slots: PickupSlot[] }>
}

export interface BuyerOrder {
  id: number
  order_number: string
  shop_name: string
  shop_slug: string
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  order_type: 'pickup' | 'delivery'
  delivery_zone?: string
  status: string
  payment_method: string
  payment_status: string
  subtotal: string
  discount_total: string
  delivery_fee: string
  total: string
  customer_note: string
  pickup_slot_start?: string | null
  pickup_slot_end?: string | null
  fulfillment_snapshot?: {
    order_type?: 'pickup' | 'delivery'
    shop_name?: string
    shop_address?: string
    shop_phone?: string
    shop_email?: string
    whatsapp_group_url?: string | null
    pickup_address_line_1?: string
    pickup_address_line_2?: string
    pickup_postal_code?: string
    pickup_city?: string
    pickup_country?: string
    pickup_instructions?: string
    delivery_instructions?: string
    pickup_date?: string
    pickup_time?: string
    required_lead_time_hours?: number
  } | null
  seller_note: string
  items: BuyerOrderItem[]
  created_at: string
  updated_at: string
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

export interface AddressLookupResult {
  street: string
  city: string
  country: string
}
