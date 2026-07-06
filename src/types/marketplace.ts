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
}

export interface SellerOrder {
  id: number
  order_number: string
  customer_name: string
  status: string
  total: string
  created_at: string
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
