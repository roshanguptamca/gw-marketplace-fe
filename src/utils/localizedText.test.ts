import { describe, expect, it } from 'vitest'
import { localizedText } from './localizedText'

describe('localizedText', () => {
  it('selects the requested translation', () => {
    expect(
      localizedText(
        'Traditional Indian sweet',
        { description: { en: 'Traditional Indian sweet', nl: 'Traditionele Indiase zoetigheid' } },
        'description',
        'nl',
      ),
    ).toBe('Traditionele Indiase zoetigheid')
  })

  it('falls back to the existing English value when Dutch is missing', () => {
    expect(
      localizedText(
        'Original English description',
        { ingredients: { en: 'Gram flour, ghee' } },
        'ingredients',
        'nl',
      ),
    ).toBe('Gram flour, ghee')
  })

  it('uses English for unknown languages and does not transform product names', () => {
    const name = 'Besan Laddoo 500g'
    expect(localizedText(name, { name: { nl: 'translated name' } }, 'name', 'en')).toBe(name)
  })
})
