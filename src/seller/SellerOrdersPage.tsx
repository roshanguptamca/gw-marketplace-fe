import { useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { ORDER_STATUS_TRANSITIONS } from '../types/marketplace'

export function SellerOrdersPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerOrders(),
    [refreshKey],
  )
  const [status, setStatus] = useState('')

  const changeStatus = async (id: number, nextStatus: string) => {
    if (!nextStatus) return
    try {
      await marketplaceService.updateSellerOrderStatus(id, nextStatus)
      setRefreshKey((key) => key + 1)
    } catch {
      setStatus('Could not update order status')
    }
  }

  if (loading) return <LoadingState label="Loading orders" />
  return (
    <section>
      <p className="eyebrow">Fulfilment</p>
      <h2>Orders</h2>
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
            {(data ?? []).map((order) => {
              const nextOptions = ORDER_STATUS_TRANSITIONS[order.status] ?? []
              return (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
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
