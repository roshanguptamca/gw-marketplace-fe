import { useState } from 'react'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { Invoice } from '../types/marketplace'

export function OrderInvoices({ orderId }: { orderId: number }) {
  const [retry, setRetry] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getOrderInvoices(orderId),
    [orderId, retry],
  )
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState('')

  const download = async (invoice: Invoice) => {
    setDownloading(invoice.id)
    setDownloadError('')
    try {
      await marketplaceService.downloadInvoice(invoice)
    } catch (caught) {
      setDownloadError(caught instanceof Error ? caught.message : 'Could not download invoice.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section className="form-section" aria-label="Invoices">
      <h3>Invoices / Facturen</h3>
      {loading && <p role="status">Loading invoices...</p>}
      {error && (
        <div role="alert">
          <p className="inline-error">Could not load invoices: {error.message}</p>
          <button className="button" type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !data?.length && <p>No invoices available for this order yet.</p>}
      {data?.map((invoice) => (
        <div className="invoice-card" key={invoice.id}>
          <div>
            <strong>{invoice.shop_name}</strong>
            <p>{invoice.invoice_number}</p>
            <p>
              {invoice.issue_date} | {invoice.currency} {invoice.total_inc_vat} incl. VAT
            </p>
          </div>
          <button
            className="button button--primary"
            type="button"
            disabled={downloading !== null}
            onClick={() => void download(invoice)}
          >
            {downloading === invoice.id ? 'Downloading...' : 'Download invoice'}
          </button>
        </div>
      ))}
      {downloadError && (
        <p className="inline-error" role="alert">
          {downloadError}
        </p>
      )}
    </section>
  )
}
