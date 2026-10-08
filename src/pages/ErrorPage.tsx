import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function ErrorPage({ title, message }: { title?: string; message?: string }) {
  const { t } = useTranslation()
  return (
    <main className="page-shell section">
      <EmptyState
        title={title ?? t('pageNotFoundTitle')}
        message={message ?? t('pageNotFoundMessage')}
        action={
          <Link className="button" to="/">
            {t('backToMarketplace')}
          </Link>
        }
      />
    </main>
  )
}
