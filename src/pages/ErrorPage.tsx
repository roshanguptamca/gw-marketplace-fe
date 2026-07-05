import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function ErrorPage({
  title = 'This page wandered off',
  message = 'The page you requested does not exist or has moved.',
}: {
  title?: string
  message?: string
}) {
  return (
    <main className="page-shell section">
      <EmptyState
        title={title}
        message={message}
        action={
          <Link className="button" to="/">
            Back to marketplace
          </Link>
        }
      />
    </main>
  )
}
