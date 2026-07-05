import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function SellerProductsPage() {
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerProducts(),
    [],
  )
  if (loading) return <LoadingState label="Loading products" />
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Products</h2>
        </div>
      </div>
      {error && <p className="inline-error">Products could not be loaded.</p>}
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.sku || '—'}</td>
                <td>€{product.price}</td>
                <td>{product.stock_quantity}</td>
                <td>{product.is_approved && product.is_active ? 'Live' : 'Draft'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
