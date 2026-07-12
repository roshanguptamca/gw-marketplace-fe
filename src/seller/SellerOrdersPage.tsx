import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { ORDER_STATUS_TRANSITIONS } from '../types/marketplace'

const ORDER_STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
] as const

export function SellerOrdersPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedStatus = searchParams.get('status') ?? ''
  const query = searchParams.get('q') ?? ''
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerOrders({ q: query, status: selectedStatus }),
    [refreshKey, query, selectedStatus],
  )
  const [status, setStatus] = useState('')

  const filteredOrders = useMemo(() => data ?? [], [data])

  const changeStatus = async (id: number, nextStatus: string) => {
    if (!nextStatus) return
    try {
      await marketplaceService.updateSellerOrderStatus(id, nextStatus)
      setRefreshKey((key) => key + 1)
    } catch {
      setStatus('Could not update order status')
    }
  }

  const updateFilter = (nextQuery: string, nextStatus: string) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextStatus) params.set('status', nextStatus)
    setSearchParams(params)
  }

  if (loading) return <LoadingState label="Loading orders" />
  return (
    <section>
      <p className="eyebrow">Fulfilment</p>
      <h2>Orders</h2>
      <div className="seller-toolbar">
        <div className="form-group form-group--full">
          <label htmlFor="seller-order-search">Search orders</label>
          <input
            id="seller-order-search"
            className="form-input"
            value={query}
            onChange={(event) => updateFilter(event.target.value, selectedStatus)}
            placeholder="Order number, customer, email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="seller-order-status">Status</label>
          <select
            id="seller-order-status"
            className="form-input"
            value={selectedStatus}
            onChange={(event) => updateFilter(query, event.target.value)}
          >
            {ORDER_STATUS_FILTERS.map((filter) => (
              <option key={filter.value || 'all'} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => setSearchParams({})}
        >
          Clear
        </button>
      </div>
      {error && <p className="inline-error">Orders could not be loaded.</p>}
      {status && <p className="inline-error">{status}</p>}
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const nextOptions = ORDER_STATUS_TRANSITIONS[order.status] ?? []
              return (
                <tr key={order.id}>
                  <td>
                    <Link to={`/seller/orders?status=${order.status}`}>{order.order_number}</Link>
                  </td>
                  <td>{order.customer_name}</td>
                  <td>{order.status.replaceAll('_', ' ')}</td>
                  <td>€{order.total}</td>
                  <td>
                    {nextOptions.length > 0 && (
                      <select
                        aria-label={`Update status for order ${order.order_number}`}
                        defaultValue=""
                        onChange={(event) => void changeStatus(order.id, event.target.value)}
                      >
                        <option value="">Update</option>
                        {nextOptions.map((option) => (
                          <option value={option} key={option}>
                            {option.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
