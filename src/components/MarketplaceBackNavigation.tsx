import { Link } from 'react-router-dom'
import { Breadcrumb } from './Breadcrumb'

export interface MarketplaceBackNavigationItem {
  label: string
  path: string
  current?: boolean
}

interface MarketplaceBackNavigationProps {
  items: MarketplaceBackNavigationItem[]
  backLabel: string
  backTo: string
  backState?: unknown
}

export function MarketplaceBackNavigation({
  items,
  backLabel,
  backTo,
  backState,
}: MarketplaceBackNavigationProps) {
  return (
    <div className="marketplace-back-nav">
      <Breadcrumb items={items} />
      <Link className="back-link marketplace-back-nav__button" to={backTo} state={backState}>
        ← {backLabel}
      </Link>
    </div>
  )
}
