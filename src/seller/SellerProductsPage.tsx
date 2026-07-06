import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function SellerProductsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerProducts(),
    [refreshKey],
  )
  const [status, setStatus] = useState('')

  const removeProduct = async (id: number) => {
    if (!window.confirm('Delete this product?')) return
    try {
      await marketplaceService.deleteSellerProduct(id)
      setRefreshKey((key) => key + 1)
    } catch {
      setStatus('Could not delete product')
    }
  }

  if (loading) return <LoadingState label="Loading products" />
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Products</h2>
        </div>
        <Link className="button" to="/seller/products/new">
          Add product
        </Link>
      </div>
      {error && <p className="inline-error">Products could not be loaded.</p>}
      {status && <p className="inline-error">{status}</p>}
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
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
                <td className="seller-actions">
                  <Link className="button button--ghost" to={`/seller/products/${product.id}/edit`}>
                    Edit
                  </Link>
                  <button
                    className="button button--danger"
                    type="button"
                    onClick={() => void removeProduct(product.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
