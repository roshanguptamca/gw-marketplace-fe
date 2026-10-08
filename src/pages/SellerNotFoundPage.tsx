import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function SellerNotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="page-shell section">
      <EmptyState
        title={t('shopNotFoundTitle')}
        message={t('shopNotFoundMessage')}
        action={
          <Link className="button" to="/">
            {t('exploreMarketplace')}
          </Link>
        }
      />
    </main>
  )
}
