import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M13.85 2.85a2.5 2.5 0 0 1 3.54 3.54l-9.9 9.9L3 17l.71-4.49 10.14-10.14Zm2.12 1.41a.5.5 0 0 0-.71 0l-.88.88 1.12 1.12.88-.88a.5.5 0 0 0 0-.71l-.41-.41Zm-2.62 2.29L5.55 14.5l-.27 1.72 1.72-.27 7.8-7.8-1.45-1.6Z"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5V4h3a1 1 0 1 1 0 2h-1.02l-.68 9.1A2.5 2.5 0 0 1 11.8 17H8.2a2.5 2.5 0 0 1-2.5-1.9L5.02 6H4a1 1 0 1 1 0-2h3v-.5ZM8.5 4h3v-.5h-3V4Zm-1.46 2 .55 7.83a.5.5 0 0 0 .5.46h4.82a.5.5 0 0 0 .5-.46L14.46 6H7.04Z"
      />
    </svg>
  )
}

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
                <td className="seller-product-name">{product.name}</td>
                <td>{product.sku || '—'}</td>
                <td>€{product.price}</td>
                <td>{product.stock_quantity}</td>
                <td>{product.is_approved && product.is_active ? 'Live' : 'Draft'}</td>
                <td className="seller-actions seller-actions--icons">
                  <Link
                    className="icon-button"
                    to={`/seller/products/${product.id}/edit`}
                    aria-label={`Edit ${product.name}`}
                    title={`Edit ${product.name}`}
                  >
                    <PencilIcon />
                  </Link>
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    aria-label={`Delete ${product.name}`}
                    title={`Delete ${product.name}`}
                    onClick={() => void removeProduct(product.id)}
                  >
                    <TrashIcon />
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
