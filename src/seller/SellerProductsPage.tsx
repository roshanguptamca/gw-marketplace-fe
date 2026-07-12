import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

const PRODUCT_STATUS_FILTERS = [
  { value: '', label: 'All products' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'featured', label: 'Featured' },
  { value: 'low-stock', label: 'Low stock' },
] as const

export function SellerProductsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const selectedStatus = searchParams.get('status') ?? ''
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerProducts({ q: query, status: selectedStatus }),
    [refreshKey, query, selectedStatus],
  )
  const [status, setStatus] = useState('')
  const filteredProducts = useMemo(() => data ?? [], [data])

  const updateFilter = (nextQuery: string, nextStatus: string) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextStatus) params.set('status', nextStatus)
    setSearchParams(params)
  }

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
      <div className="seller-toolbar">
        <div className="form-group form-group--full">
          <label htmlFor="seller-product-search">Search products</label>
          <input
            id="seller-product-search"
            className="form-input"
            value={query}
            onChange={(event) => updateFilter(event.target.value, selectedStatus)}
            placeholder="Name, SKU, description, category"
          />
        </div>
        <div className="form-group">
          <label htmlFor="seller-product-status">Status</label>
          <select
            id="seller-product-status"
            className="form-input"
            value={selectedStatus}
            onChange={(event) => updateFilter(query, event.target.value)}
          >
            {PRODUCT_STATUS_FILTERS.map((filter) => (
              <option key={filter.value || 'all'} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="button button--ghost" onClick={() => setSearchParams({})}>
          Clear
        </button>
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
            {filteredProducts.map((product) => (
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
