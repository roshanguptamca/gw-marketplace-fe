import { expect, test, type Page } from '@playwright/test'

const shop = {
  id: 1,
  slug: 'rishi-kitchen',
  name: 'Rishi Kitchen',
  description: 'Homemade vegetarian Indian food for pickup in Zoetermeer.',
  short_description: 'Homemade vegetarian Indian food.',
  logo_url: '',
  banner_url: '',
  city: 'Zoetermeer',
  country: 'Netherlands',
  settings: { accepting_orders: true },
}
const product = {
  id: 1,
  shop: 1,
  shop_slug: 'rishi-kitchen',
  shop_name: 'Rishi Kitchen',
  name: 'Pav Bhaji',
  slug: 'pav-bhaji',
  description: 'Two pav with bhaji',
  price: '7.00',
  stock_quantity: 40,
  selling_unit: 'PLATE',
  minimum_order_quantity: 2,
  is_active: true,
  is_approved: true,
  image_url: '',
  images: [],
  category_detail: null,
}
const menu = {
  id: 1,
  slug: 'friday-menu',
  title: 'Friday Menu',
  kind: 'menu',
  description: 'Freshly prepared Friday special.',
  fulfilment_notes: 'Pickup Friday after 17:00',
  cover_url: '',
  is_published: true,
  is_featured: true,
  position: 0,
  order_deadline: '2099-11-27T17:00:00Z',
  ordering_open: true,
  product_ids: [1],
}
const party = {
  ...menu,
  id: 2,
  slug: 'party-orders',
  title: 'Party Orders',
  kind: 'enquiry',
  position: 1,
  is_featured: false,
}
const info = {
  ...menu,
  id: 3,
  slug: 'our-story',
  title: 'Our story',
  kind: 'information',
  position: 2,
  is_featured: false,
}

async function fixture(page: Page, configured = true) {
  let pages = configured ? [menu, party, info] : []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.text().includes('Marketplace rendering error')) console.log(message.text())
  })
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/\/$/, '')
    const method = route.request().method()
    let body: unknown = []
    let status = 200
    if (path.endsWith('/auth/me'))
      body = { id: 1, email: 'seller@example.com', first_name: 'Seller', is_seller: true }
    else if (path.endsWith('/accounts/csrf')) body = { csrfToken: 'test-csrf' }
    else if (path === '/api/seller/shop' || path === '/api/marketplace/shops/rishi-kitchen')
      body = shop
    else if (path.endsWith('/products')) body = [product]
    else if (path.endsWith('/page-enquiries')) body = []
    else if (path.endsWith('/enquiries')) {
      const sent = route.request().postDataJSON()
      expect(sent.customer_name).toBe('Roshan Gupta')
      expect(sent.privacy_accepted).toBe(true)
      body = { id: 12 }
      status = 201
    } else if (path === '/api/seller/pages' && method === 'POST') {
      const sent = route.request().postDataJSON()
      const created = { ...sent, id: 9, ordering_open: true }
      pages = [...pages, created]
      body = created
      status = 201
    } else if (/\/seller\/pages\/\d+$/.test(path) && method === 'PATCH') {
      const id = Number(path.split('/').at(-1))
      pages = pages.map((p) => (p.id === id ? { ...p, ...route.request().postDataJSON() } : p))
      body = pages.find((p) => p.id === id)
    } else if (/\/seller\/pages\/\d+$/.test(path) && method === 'DELETE') {
      pages = pages.filter((p) => p.id !== Number(path.split('/').at(-1)))
      status = 204
    } else if (path.endsWith('/pages'))
      body = path.startsWith('/api/seller') ? pages : pages.filter((p) => p.is_published)
    else if (path.includes('/pages/')) {
      body = pages.find((p) => p.slug === path.split('/').at(-1) && p.is_published)
      if (!body) {
        status = 404
        body = { detail: 'Not found' }
      }
    } else if (path.endsWith('/google-rating')) body = { rating: null, review_count: 0 }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: status === 204 ? undefined : JSON.stringify(body),
    })
  })
  return errors
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}

for (const width of [320, 390, 768, 1440]) {
  test(`configured shop navigation, menu basket and quote form at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors = await fixture(page)
    await page.goto('/shop/rishi-kitchen')
    const navigation = page.getByRole('navigation', { name: 'Shop pages' })
    await expect(navigation).toBeVisible()
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('shop.png'), fullPage: true })
    await navigation.getByRole('link', { name: 'Friday Menu' }).click()
    await expect(page.getByRole('heading', { name: 'Friday Menu' })).toBeVisible()
    await page.getByRole('button', { name: 'Increase Pav Bhaji' }).click()
    await expect(page.locator('.menu-stepper output')).toHaveText('2')
    await page.getByRole('button', { name: 'Increase Pav Bhaji' }).click()
    await expect(page.locator('.menu-stepper output')).toHaveText('3')
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('menu.png'), fullPage: true })
    await page.getByRole('link', { name: 'View basket' }).click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByRole('heading', { name: 'Pav Bhaji' })).toBeVisible()
    await page.goto('/shop/rishi-kitchen/pages/party-orders')
    await page.getByLabel('Your name').fill('Roshan Gupta')
    await page.getByLabel('Email', { exact: true }).fill('roshan@example.com')
    await page.getByLabel('Event date').fill('2099-12-10')
    await page.getByLabel('Number of guests').fill('25')
    await page.getByLabel(/I agree to share/).check()
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('quote-form.png'), fullPage: true })
    await page.getByRole('button', { name: 'Send quote request' }).click()
    await expect(page.getByText('Your request has been sent')).toBeVisible()
    expect(errors).toEqual([])
  })
}
test('unconfigured shops have no custom navigation or promotion; hidden URLs return unavailable', async ({
  page,
}) => {
  await fixture(page, false)
  await page.goto('/shop/rishi-kitchen')
  await expect(page.getByRole('heading', { name: 'All products' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Shop pages' })).toHaveCount(0)
  await expect(page.locator('.shop-page-feature')).toHaveCount(0)
  await page.goto('/shop/rishi-kitchen/pages/friday-menu')
  await expect(page.getByRole('heading', { name: 'Page unavailable' })).toBeVisible()
})

test('seller creates, publishes, duplicates, hides and deletes configured pages', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 })
  const errors = await fixture(page, false)
  await page.goto('/seller/pages')
  await page.getByRole('button', { name: 'Create page' }).click()
  await page.getByLabel('Page title', { exact: true }).fill('Weekend special')
  await page.getByLabel('Page URL name').fill('weekend-special')
  await page.getByLabel('Pav Bhaji', { exact: true }).check()
  await page.getByLabel('Published — visible in shop navigation').check()
  await page.getByLabel('Show a featured strip').check()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('seller-editor.png'), fullPage: true })
  await page.getByRole('button', { name: 'Save page' }).click()
  await expect(page.getByText('Page saved.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open page' })).toHaveAttribute(
    'href',
    '/shop/rishi-kitchen/pages/weekend-special',
  )
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByLabel('Page title', { exact: true })).toHaveValue('Weekend special (copy)')
  await expect(page.getByLabel('Published — visible in shop navigation')).not.toBeChecked()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Edit page' }).click()
  await page.getByLabel('Published — visible in shop navigation').uncheck()
  await page.getByRole('button', { name: 'Save page' }).click()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open page' })).toHaveCount(0)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(
    page.getByText('No pages yet. Create your first menu or enquiry page.'),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('menu closes and temporary page failures can be retried', async ({ page }) => {
  await fixture(page)
  let failed = true
  await page.route('**/api/marketplace/shops/rishi-kitchen/pages/friday-menu/', (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(failed ? { detail: 'Unavailable' } : { ...menu, ordering_open: false }),
    }),
  )
  await page.goto('/shop/rishi-kitchen/pages/friday-menu')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  failed = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('status')).toContainText('Orders closed')
  await expect(page.getByRole('button', { name: 'Increase Pav Bhaji' })).toHaveCount(0)
})
