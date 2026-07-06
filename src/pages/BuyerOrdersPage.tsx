import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function BuyerOrdersPage() {
  const { data, loading, error } = useMarketplaceData(() => marketplaceService.getBuyerOrders(), [])

  if (loading) return <LoadingState label="Loading your orders" />
  if (error) {
    return <EmptyState title="Orders unavailable" message="We could not load your orders. Please try again later." />
  }

  const orders = data ?? []
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="Once you place an order with a GuideWisey seller, it will show up here."
        action={
          <Link className="btn btn-primary" to="/">
            Browse the marketplace
          </Link>
        }
      />
    )
  }

  return (
    <section>
      <p className="eyebrow">Marketplace</p>
      <h2>My Orders</h2>
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Shop</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.shop_name}</td>
                <td>{order.status.replaceAll('_', ' ')}</td>
                <td>€{order.total}</td>
                <td>
                  <Link to={`/account/orders/${order.id}`}>View order</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
