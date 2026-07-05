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
