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
  return (
    <section>
      <p className="eyebrow">At a glance</p>
      <h2>Shop overview</h2>
      <div className="seller-metrics">
        {metrics.map(([label, value]) => (
          <article className="seller-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
