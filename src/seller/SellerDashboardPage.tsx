import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function SellerDashboardPage() {
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerDashboard(),
    [],
  )
  if (loading) return <LoadingState label="Loading dashboard" />
  if (error || !data) return <p className="inline-error">Dashboard data is unavailable.</p>

  const metrics = [
    ['Products', data.total_products],
    ['Active products', data.active_products],
    ['Pending orders', data.pending_orders],
    ['Month sales', `€${data.month_sales}`],
    ['Low stock', data.low_stock_products],
  ]
  const recentOrders = data.recent_orders ?? []
  return (
    <section>
      <p className="eyebrow">At a glance</p>
      <h2>Shop overview</h2>
      {typeof data.pending_cancellations === 'number' && data.pending_cancellations > 0 && (
        <p className="inline-error">
          {data.pending_cancellations} cancellation request
          {data.pending_cancellations === 1 ? '' : 's'} awaiting review.
        </p>
      )}
      <div className="seller-metrics">
        {metrics.map(([label, value]) => (
          <article className="seller-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <h3 style={{ marginTop: '32px' }}>Recent orders</h3>
      {recentOrders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
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
              {recentOrders.map((order) => (
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
      )}
    </section>
  )
}
