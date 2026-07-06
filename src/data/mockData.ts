import type { Product, Shop } from '../types/marketplace'

const images = {
  kitchen:
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1600&q=80',
  bakery:
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  spice:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
  pickle:
    'https://images.unsplash.com/photo-1589135233689-c3d66305fe76?auto=format&fit=crop&w=1200&q=80',
  bowl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=80',
  ceramics:
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1600&q=80',
  mug: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=1200&q=80',
  plate:
    'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1200&q=80',
}

export const mockShops: Shop[] = [
  {
    id: '1',
    slug: 'rishikitchen',
    name: "Rishi's Kitchen",
    tagline: 'Small-batch flavors, made slowly',
    description:
      'Family recipes and vibrant pantry staples, prepared in small batches with responsibly sourced ingredients.',
    logoUrl: images.bowl,
    bannerUrl: images.kitchen,
    categories: ['Pantry', 'Spices', 'Condiments'],
    location: 'Amsterdam, Netherlands',
    contactEmail: 'hello@rishikitchen.example',
    whatsapp: '+31612345678',
  },
  {
    id: '2',
    slug: 'demo',
    name: 'Atelier Demo',
    tagline: 'Useful objects, thoughtfully made',
    description:
      'A working demonstration shop featuring hand-thrown ceramics for everyday rituals.',
    logoUrl: images.mug,
    bannerUrl: images.ceramics,
    categories: ['Ceramics', 'Home'],
    location: 'Utrecht, Netherlands',
    contactEmail: 'hello@atelierdemo.example',
  },
]

export const mockProducts: Product[] = [
  {
    id: 'masala-01',
    shopId: '1',
    shopSlug: 'rishikitchen',
    name: 'House Garam Masala',
    description:
      'A warm, aromatic blend of toasted cumin, coriander, cardamom, cinnamon and black pepper. Ground fresh in small batches.',
    price: 8.5,
    currency: 'EUR',
    category: 'Spices',
    stock: 18,
    images: [images.spice, images.bowl],
    featured: true,
    sellerContact: {
      email: 'hello@rishikitchen.example',
      whatsapp: '+31612345678',
    },
  },
  {
    id: 'pickle-01',
    shopId: '1',
    shopSlug: 'rishikitchen',
    name: 'Mango & Lime Pickle',
    description: 'Bright, tangy and gently spiced. A spoonful transforms rice, eggs or sandwiches.',
    price: 11,
    currency: 'EUR',
    category: 'Condiments',
    stock: 7,
    images: [images.pickle],
    featured: true,
    sellerContact: {
      email: 'hello@rishikitchen.example',
      whatsapp: '+31612345678',
    },
  },
  {
    id: 'bread-01',
    shopId: '1',
    shopSlug: 'rishikitchen',
    name: 'Cardamom Milk Bread',
    description: 'A soft, fragrant loaf enriched with cardamom and cultured butter.',
    price: 6.75,
    currency: 'EUR',
    category: 'Pantry',
    stock: 0,
    images: [images.bakery],
    sellerContact: {
      email: 'hello@rishikitchen.example',
      whatsapp: '+31612345678',
    },
  },
  {
    id: 'mug-01',
    shopId: '2',
    shopSlug: 'demo',
    name: 'Morning Mug',
    description: 'A tactile stoneware mug with a satin glaze, thrown and finished by hand.',
    price: 28,
    currency: 'EUR',
    category: 'Ceramics',
    stock: 9,
    images: [images.mug, images.ceramics],
    featured: true,
    sellerContact: { email: 'hello@atelierdemo.example' },
  },
  {
    id: 'plate-01',
    shopId: '2',
    shopSlug: 'demo',
    name: 'Everyday Side Plate',
    description: 'A softly irregular plate designed for breakfast, snacks and shared tables.',
    price: 24,
    currency: 'EUR',
    category: 'Ceramics',
    stock: 12,
    images: [images.plate],
    sellerContact: { email: 'hello@atelierdemo.example' },
  },
]
