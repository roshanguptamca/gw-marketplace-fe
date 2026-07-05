import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function SellerOrdersPage() {
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerOrders(),
    [],
  )
  if (loading) return <LoadingState label="Loading orders" />
  return (
    <section>
      <p className="eyebrow">Fulfilment</p>
      <h2>Orders</h2>
      {error && <p className="inline-error">Orders could not be loaded.</p>}
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((order) => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.customer_name}</td>
                <td>{order.status.replaceAll('_', ' ')}</td>
                <td>€{order.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
