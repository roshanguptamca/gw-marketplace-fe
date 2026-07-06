export function SellerPlaceholderPage({
  eyebrow,
  title,
  message,
}: {
  eyebrow: string
  title: string
  message: string
}) {
  return (
    <section>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="seller-placeholder">{message}</p>
    </section>
  )
}
