import { Link } from 'react-router-dom'
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
    { label: 'Products', value: data.total_products, to: '/seller/products' },
    { label: 'Active products', value: data.active_products, to: '/seller/products?status=active' },
    { label: 'Pending orders', value: data.pending_orders, to: '/seller/orders?status=pending' },
    { label: 'Total orders', value: data.total_orders, to: '/seller/orders' },
    { label: 'Month sales', value: `€${data.month_sales}` },
    { label: 'Low stock', value: data.low_stock_products, to: '/seller/products?status=low-stock' },
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
        {metrics.map((metric) => {
          const card = (
            <article className="seller-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          )
          return metric.to ? (
            <Link key={metric.label} className="seller-card seller-card--link" to={metric.to}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <span className="seller-card__action">View</span>
            </Link>
          ) : (
            card
          )
        })}
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
