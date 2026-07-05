import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('marketplace-e2e-initialized')) {
      localStorage.clear()
      sessionStorage.setItem('marketplace-e2e-initialized', 'true')
    }
  })
})

test('opens the marketplace landing page', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /good things, from people who care/i }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: "Rishi's Kitchen" })).toBeVisible()
})

test('opens a seller shop through the path fallback', async ({ page }) => {
  await page.goto('/shop/rishikitchen')
  await expect(page.getByRole('heading', { name: "Rishi's Kitchen" })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible()
})

test('opens a seller shop through a localhost subdomain', async ({ page }) => {
  await page.goto('http://rishikitchen.localhost:3102')
  await expect(page.getByRole('heading', { name: "Rishi's Kitchen" })).toBeVisible()
  await expect(page).toHaveURL(/^http:\/\/rishikitchen\.localhost:3102/)
})

test('views product details and adds a product to the cart', async ({ page }) => {
  await page.goto('/shop/rishikitchen/products/masala-01')
  await expect(page.getByRole('heading', { name: 'House Garam Masala' })).toBeVisible()
  await page.getByRole('button', { name: 'Show image 2' }).click()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByRole('link', { name: /cart/i }).getByText('1')).toBeVisible()
  await page.getByRole('link', { name: /cart/i }).click()
  await expect(page.getByRole('heading', { name: 'Shopping cart' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'House Garam Masala' })).toBeVisible()
})

test('redirects anonymous users from the protected seller portal', async ({ page }) => {
  await page.route('http://localhost:3000/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>GuideWisey login</h1>' }),
  )
  await page.goto('/seller')
  await page.waitForURL('http://localhost:3000/#login?next=http%3A%2F%2Flocalhost%3A3102%2Fseller')
  await expect(page).toHaveURL(
    'http://localhost:3000/#login?next=http%3A%2F%2Flocalhost%3A3102%2Fseller',
  )
})

test('logs out an authenticated marketplace user through the shared backend', async ({ page }) => {
  let logoutCalled = false
  await page.route('http://localhost:8000/api/**', async (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          id: 1,
          username: 'buyer',
          email: 'buyer@example.com',
          first_name: 'Guide',
          last_name: 'Buyer',
          avatar_url: '',
          is_seller: false,
        },
      })
    } else if (url.endsWith('/accounts/csrf/')) {
      await route.fulfill({ json: { csrfToken: 'e2e-token' } })
    } else if (url.endsWith('/accounts/logout/')) {
      logoutCalled = true
      await route.fulfill({ json: { message: 'Logged out' } })
    } else {
      await route.continue()
    }
  })
  await page.goto('/shop/demo')
  await page.getByRole('button', { name: 'User menu' }).click()
  await page.getByRole('menuitem', { name: 'Logout' }).click()
  await expect.poll(() => logoutCalled).toBe(true)
  await expect(page).toHaveURL('http://localhost:3102/')
})

test('opens the user menu and navigates a seller to the portal', async ({ page }) => {
  await page.route('http://localhost:8000/api/**', async (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          id: 1,
          username: 'seller',
          email: 'seller@example.com',
          first_name: 'Seller',
          last_name: 'User',
          avatar_url: '',
          is_seller: true,
        },
      })
    } else if (url.endsWith('/seller/dashboard/')) {
      await route.fulfill({
        json: {
          total_products: 2,
          active_products: 2,
          pending_orders: 1,
          completed_orders: 3,
          today_sales: '10.00',
          month_sales: '50.00',
          low_stock_products: 0,
        },
      })
    } else {
      await route.continue()
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'User menu' }).click()
  await expect(page.getByRole('menuitem', { name: 'Seller Portal' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Seller Portal' }).click()
  await expect(page).toHaveURL('http://localhost:3102/seller')
  await expect(page.getByRole('heading', { name: 'Shop overview' })).toBeVisible()
})

test('proceeds from cart and submits an order request without payment', async ({ page }) => {
  await page.goto('/shop/rishikitchen/products/masala-01')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('link', { name: /cart/i }).click()
  await page.getByRole('link', { name: 'Proceed to checkout' }).click()
  await expect(page).toHaveURL('http://localhost:3102/checkout')

  await page.getByLabel('Full name').fill('Playwright Buyer')
  await page.getByLabel('Email').fill('buyer@example.com')
  await page.getByLabel('Phone').fill('+31612345678')
  await page.getByLabel(/i confirm these order details/i).check()
  await page.getByRole('button', { name: 'Submit order request' }).click()

  await expect(
    page.getByRole('heading', { name: 'Your order request has been sent to the seller.' }),
  ).toBeVisible()
  await expect(page.getByText(/no payment was collected/i)).toBeVisible()
})

test('switches theme and keeps the preference after reload', async ({ page }) => {
  await page.goto('/')
  const initialTheme = await page.locator('html').getAttribute('data-theme')
  const nextTheme = initialTheme === 'dark' ? 'light' : 'dark'
  await page.getByRole('button', { name: `Switch to ${nextTheme} mode` }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme)
  await expect(
    page.getByRole('button', {
      name: `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} mode`,
    }),
  ).toBeVisible()
})
