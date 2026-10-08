import type { LanguageCode, LocalizedFields } from '../types/marketplace'

export function localizedText(
  source: string | null | undefined,
  translations: LocalizedFields | undefined,
  field: string,
  language: string,
): string {
  const values = translations?.[field]
  const selected = language === 'nl' ? values?.nl : values?.en
  return selected || values?.en || source || ''
}

export function languageCode(language: string): LanguageCode {
  return language === 'nl' ? 'nl' : 'en'
}
