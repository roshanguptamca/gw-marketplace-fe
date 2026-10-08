import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="site-footer">
      <div>
        <strong>GuideWisey Marketplace</strong>
        <p>{t('marketplaceFooter')}</p>
      </div>
      <p>© {new Date().getFullYear()} GuideWisey</p>
    </footer>
  )
}
