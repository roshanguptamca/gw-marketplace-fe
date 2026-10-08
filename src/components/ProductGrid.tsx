import { useTranslation } from 'react-i18next'
import type { Product } from '../types/marketplace'
import { EmptyState } from './EmptyState'
import { ProductCard } from './ProductCard'

export function ProductGrid({ products }: { products: Product[] }) {
  const { t } = useTranslation()
  if (products.length === 0) {
    return <EmptyState title={t('noProductsYet')} message={t('sellerPreparingCollection')} />
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
