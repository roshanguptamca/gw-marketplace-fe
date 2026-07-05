import type { ReactNode } from 'react'

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <section className="state-panel empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        ◇
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  )
}
