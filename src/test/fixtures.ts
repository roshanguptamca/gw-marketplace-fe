import type { Product, Shop } from '../types/marketplace'

export const shopFixture: Shop = {
  id: 'shop-1',
  slug: 'test-shop',
  name: 'Test Shop',
  tagline: 'Made for testing',
  description: 'A test seller description.',
  logoUrl: '/logo.jpg',
  bannerUrl: '/banner.jpg',
  categories: ['Home'],
  location: 'Test City',
  pickupAvailable: true,
  deliveryAvailable: true,
  localDeliveryFee: 5,
  internationalDeliveryFee: 10,
  freeDeliveryAbove: 50,
}

export const productFixture: Product = {
  id: 'product-1',
  shopId: '1',
  shopSlug: 'test-shop',
  name: 'Test Product',
  description: 'A useful test product.',
  price: 12.5,
  currency: 'EUR',
  category: 'Home',
  stock: 3,
  images: ['/one.jpg', '/two.jpg'],
  featured: true,
  sellerContact: {
    email: 'seller@example.com',
    phone: '+31 20 123 4567',
    whatsapp: '+31 6 1234 5678',
  },
}

export const secondShopFixture: Shop = {
  id: 'shop-2',
  slug: 'other-shop',
  name: 'Other Shop',
  tagline: 'A second seller',
  description: 'Another test seller description.',
  logoUrl: '/logo2.jpg',
  bannerUrl: '/banner2.jpg',
  categories: ['Food'],
  location: 'Other City',
  pickupAvailable: true,
  deliveryAvailable: true,
  localDeliveryFee: 3,
  internationalDeliveryFee: 8,
  freeDeliveryAbove: 30,
}

export const secondProductFixture: Product = {
  id: 'product-2',
  shopId: '2',
  shopSlug: 'other-shop',
  name: 'Other Product',
  description: 'A product from a different shop.',
  price: 8,
  currency: 'EUR',
  category: 'Food',
  stock: 5,
  images: ['/three.jpg'],
  featured: false,
  sellerContact: {
    email: 'other-seller@example.com',
  },
}
