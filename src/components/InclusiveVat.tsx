import { useTranslation } from 'react-i18next'

export function InclusiveVat({
  breakdown,
  currency,
}: {
  breakdown: { net: string; vat: string } | null
  currency: string
}) {
  const { t } = useTranslation()
  const display = (value: string) => (currency === 'EUR' ? `€${value}` : `${currency} ${value}`)
  return (
    <section className="vat-breakdown" aria-label={t('vatIncludedAria')}>
      {breakdown ? (
        <>
          <div>
            <span>{t('vatAmountExcl')}</span>
            <span>{display(breakdown.net)}</span>
          </div>
          <div>
            <span>{t('vatIncludedLabel')}</span>
            <span>{display(breakdown.vat)}</span>
          </div>
        </>
      ) : (
        <p>{t('vatBreakdownUnavailable')}</p>
      )}
      <p>{t('vatAlreadyIncluded')}</p>
    </section>
  )
}
