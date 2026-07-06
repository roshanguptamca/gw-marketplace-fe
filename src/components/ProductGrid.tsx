import type { Product } from '../types/marketplace'
import { EmptyState } from './EmptyState'
import { ProductCard } from './ProductCard'

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        message="This seller is preparing their collection. Check back soon."
      />
    )
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
