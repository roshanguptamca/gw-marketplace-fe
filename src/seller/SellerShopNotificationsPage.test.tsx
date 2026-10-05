import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import { renderPage } from '../test/renderPage'
import type { ShopSettings } from '../types/marketplace'
import { SellerShopNotificationsPage } from './SellerShopNotificationsPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getSellerSettings: vi.fn(),
    updateSellerSettings: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)
const settings: ShopSettings = {
  currency: 'EUR',
  minOrderAmount: '25.00',
  deliveryFee: '0.00',
  localDeliveryFee: '5.00',
  internationalDeliveryFee: '10.00',
  freeDeliveryAbove: null,
  deliveryNotes: 'Leave at the door',
  orderAcceptanceMode: 'manual',
  whatsappNumber: '+31600000000',
  whatsappNotificationsEnabled: true,
  whatsappGroupUrl: 'https://chat.whatsapp.com/CustomerGroup123',
  bankTransferInstructions: '',
  notificationEmail: 'seller@example.com',
  newOrderEmailEnabled: true,
  cancellationRequestEmailEnabled: false,
  lowStockNotificationEnabled: true,
  supportedDeliveryCountries: ['NL'],
}

let originalTheme: string | null

beforeEach(() => {
  vi.clearAllMocks()
  originalTheme = document.documentElement.getAttribute('data-theme')
  service.getSellerSettings.mockResolvedValue(settings)
  service.updateSellerSettings.mockResolvedValue(settings)
})

afterEach(() => {
  if (originalTheme === null) document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', originalTheme)
})

describe('seller WhatsApp order notification settings', () => {
  it.each(['dark', 'light'])(
    'loads and displays the current settings in %s theme',
    async (theme) => {
      document.documentElement.setAttribute('data-theme', theme)
      renderPage(<SellerShopNotificationsPage />)

      expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
      expect(screen.getByLabelText('Notification email address')).toHaveValue('seller@example.com')
      expect(screen.getByLabelText('New order email notifications')).toBeChecked()
      expect(screen.getByLabelText('Cancellation request email notifications')).not.toBeChecked()
      expect(screen.getByLabelText('Low-stock notifications')).toBeChecked()
      expect(screen.getByLabelText('Send new order notifications to WhatsApp')).toBeChecked()
      expect(screen.getByLabelText('Shop WhatsApp number')).toHaveValue('+31600000000')
      expect(screen.getByText(/also shown to customers/i)).toBeInTheDocument()
      expect(
        screen.getByText(/must have opted in to receive WhatsApp order notifications/i),
      ).toBeInTheDocument()
    },
  )

  it('allows enabling notifications and editing the shared shop contact number', async () => {
    service.getSellerSettings.mockResolvedValueOnce({
      ...settings,
      whatsappNotificationsEnabled: false,
      whatsappNumber: '',
    })
    renderPage(<SellerShopNotificationsPage />)

    const toggle = await screen.findByLabelText('Send new order notifications to WhatsApp')
    const numberInput = screen.getByLabelText('Shop WhatsApp number')
    expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    await userEvent.type(numberInput, '+31 (6) 8765-4321')
    expect(toggle).toBeChecked()
    expect(numberInput).toHaveValue('+31 (6) 8765-4321')
  })

  it.each([
    { whatsappNumber: '', message: /enter the shop WhatsApp number/i },
    { whatsappNumber: '+123', message: /valid international WhatsApp number/i },
  ])(
    'blocks enabling with an invalid shop WhatsApp number',
    async ({ whatsappNumber, message }) => {
      service.getSellerSettings.mockResolvedValueOnce({
        ...settings,
        whatsappNotificationsEnabled: false,
        whatsappNumber: '',
      })
      renderPage(<SellerShopNotificationsPage />)

      await userEvent.click(
        await screen.findByLabelText('Send new order notifications to WhatsApp'),
      )
      if (whatsappNumber) {
        await userEvent.type(screen.getByLabelText('Shop WhatsApp number'), whatsappNumber)
      }
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(service.updateSellerSettings).not.toHaveBeenCalled()
    },
  )

  it('saves disabled notifications with a blank shop WhatsApp number', async () => {
    service.getSellerSettings.mockResolvedValueOnce({
      ...settings,
      whatsappNotificationsEnabled: false,
      whatsappNumber: '',
    })
    service.updateSellerSettings.mockResolvedValueOnce({
      ...settings,
      whatsappNotificationsEnabled: false,
      whatsappNumber: '',
    })
    renderPage(<SellerShopNotificationsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(service.updateSellerSettings).toHaveBeenCalledWith({
        notificationEmail: 'seller@example.com',
        newOrderEmailEnabled: true,
        cancellationRequestEmailEnabled: false,
        lowStockNotificationEnabled: true,
        whatsappNumber: '',
        whatsappNotificationsEnabled: false,
      }),
    )
    expect(await screen.findByText('✓ Notification settings saved')).toBeInTheDocument()
  })

  it('saves the shared contact and email preferences without resending unrelated settings', async () => {
    service.getSellerSettings.mockResolvedValueOnce({
      ...settings,
      whatsappNotificationsEnabled: false,
      whatsappNumber: '',
    })
    service.updateSellerSettings.mockResolvedValueOnce({
      ...settings,
      whatsappNotificationsEnabled: true,
      whatsappNumber: '+31611112222',
    })
    renderPage(<SellerShopNotificationsPage />)

    await userEvent.click(await screen.findByLabelText('Send new order notifications to WhatsApp'))
    await userEvent.type(screen.getByLabelText('Shop WhatsApp number'), '+31 (6) 8765-4321')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(service.updateSellerSettings).toHaveBeenCalledWith({
        notificationEmail: 'seller@example.com',
        newOrderEmailEnabled: true,
        cancellationRequestEmailEnabled: false,
        lowStockNotificationEnabled: true,
        whatsappNumber: '+31 (6) 8765-4321',
        whatsappNotificationsEnabled: true,
      }),
    )
    expect(await screen.findByText('✓ Notification settings saved')).toBeInTheDocument()
    expect(screen.getByLabelText('Shop WhatsApp number')).toHaveValue('+31611112222')
  })

  it('shows the API error when settings fail to load', async () => {
    service.getSellerSettings.mockRejectedValueOnce(new Error('Settings access denied'))
    renderPage(<SellerShopNotificationsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Settings access denied')
  })

  it('shows the API error when settings fail to save', async () => {
    service.updateSellerSettings.mockRejectedValueOnce(new Error('WhatsApp number is invalid'))
    renderPage(<SellerShopNotificationsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('WhatsApp number is invalid')
  })
})
