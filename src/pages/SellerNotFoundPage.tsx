import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function SellerNotFoundPage() {
  return (
    <main className="page-shell section">
      <EmptyState
        title="We couldn’t find this shop"
        message="Check the shop address, or browse sellers currently on GuideWisey Market."
        action={
          <Link className="button" to="/">
            Explore marketplace
          </Link>
        }
      />
    </main>
  )
}
