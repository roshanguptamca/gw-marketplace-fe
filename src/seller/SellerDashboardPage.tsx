import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function SellerDashboardPage() {
  const { t } = useTranslation()
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerDashboard(),
    [],
  )
  if (loading) return <LoadingState label={t('sellerDashboard')} />
  if (error || !data) return <p className="inline-error">{t('sellerDashboardUnavailable')}</p>

  const metrics = [
    { label: t('sellerProducts'), value: data.total_products, to: '/seller/products' },
    {
      label: t('sellerActiveProducts'),
      value: data.active_products,
      to: '/seller/products?status=active',
    },
    {
      label: t('sellerPendingOrders'),
      value: data.pending_orders,
      to: '/seller/orders?status=pending',
    },
    { label: t('sellerTotalOrders'), value: data.total_orders, to: '/seller/orders' },
    { label: t('sellerMonthSales'), value: `€${data.month_sales}` },
    {
      label: t('sellerLowStock'),
      value: data.low_stock_products,
      to: '/seller/products?status=low-stock',
    },
  ]
  const recentOrders = data.recent_orders ?? []
  return (
    <section>
      <p className="eyebrow">{t('sellerAtAGlance')}</p>
      <h2>{t('sellerShopOverview')}</h2>
      {typeof data.pending_cancellations === 'number' && data.pending_cancellations > 0 && (
        <p className="inline-error">
          {t('sellerCancellationRequests', { count: data.pending_cancellations })}
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
              <span className="seller-card__action">{t('sellerView')}</span>
            </Link>
          ) : (
            card
          )
        })}
      </div>

      <h3 style={{ marginTop: '32px' }}>{t('sellerRecentOrders')}</h3>
      {recentOrders.length === 0 ? (
        <p>{t('sellerNoOrders')}</p>
      ) : (
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>{t('sellerOrder')}</th>
                <th>{t('sellerCustomer')}</th>
                <th>{t('sellerStatus')}</th>
                <th>{t('sellerTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.customer_name}</td>
                  <td>{t(`status_${order.status}`, { defaultValue: order.status.replaceAll('_', ' ') })}</td>
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
