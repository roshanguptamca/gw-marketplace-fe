export function InclusiveVat({
  breakdown,
  currency,
}: {
  breakdown: { net: string; vat: string } | null
  currency: string
}) {
  const display = (value: string) => (currency === 'EUR' ? `€${value}` : `${currency} ${value}`)
  return (
    <section className="vat-breakdown" aria-label="Included VAT">
      {breakdown ? (
        <>
          <div>
            <span>Amount excl. VAT</span>
            <span>{display(breakdown.net)}</span>
          </div>
          <div>
            <span>Included VAT</span>
            <span>{display(breakdown.vat)}</span>
          </div>
        </>
      ) : (
        <p>The detailed VAT breakdown is currently unavailable.</p>
      )}
      <p>VAT is already included in the prices, not added to your total.</p>
    </section>
  )
}
