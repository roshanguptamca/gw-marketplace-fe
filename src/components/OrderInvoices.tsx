import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { Invoice } from '../types/marketplace'

export function OrderInvoices({ orderId }: { orderId: number }) {
  const { t } = useTranslation()
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
      setDownloadError(caught instanceof Error ? caught.message : t('invoiceDownloadFailed'))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section className="form-section" aria-label={t('invoicesAria')}>
      <h3>{t('invoicesHeading')}</h3>
      {loading && <p role="status">{t('loadingInvoices')}</p>}
      {error && (
        <div role="alert">
          <p className="inline-error">{t('invoicesLoadFailed', { message: error.message })}</p>
          <button className="button" type="button" onClick={() => setRetry((value) => value + 1)}>
            {t('retryAction')}
          </button>
        </div>
      )}
      {!loading && !error && !data?.length && <p>{t('noInvoices')}</p>}
      {data?.map((invoice) => (
        <div className="invoice-card" key={invoice.id}>
          <div>
            <strong>{invoice.shop_name}</strong>
            <p>{invoice.invoice_number}</p>
            <p>
              {invoice.issue_date} |{' '}
              {t('invoiceTotalInclVat', {
                currency: invoice.currency,
                amount: invoice.total_inc_vat,
              })}
            </p>
          </div>
          <button
            className="button button--primary"
            type="button"
            disabled={downloading !== null}
            onClick={() => void download(invoice)}
          >
            {downloading === invoice.id ? t('downloadingInvoice') : t('downloadInvoice')}
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
