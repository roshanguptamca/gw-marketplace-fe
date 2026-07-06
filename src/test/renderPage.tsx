import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthValue } from '../auth/AuthContext'
import { CartProvider } from '../cart/CartContext'
import '../i18n'

const defaultAuthValue: AuthValue = {
  user: null,
  loading: false,
  logout: async () => {},
}

export function renderPage(ui: React.ReactNode, route = '/', authValue: AuthValue = defaultAuthValue) {
  window.history.pushState({}, '', route)
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <CartProvider>{ui}</CartProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}
