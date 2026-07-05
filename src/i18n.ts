import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        brand: 'GuideWisey Market',
        browse: 'Browse shops',
        cart: 'Cart',
        addToCart: 'Add to cart',
        outOfStock: 'Out of stock',
      },
    },
  },
})

export default i18n
