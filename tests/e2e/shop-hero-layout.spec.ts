import { expect, test } from '@playwright/test'

for (const width of [320, 390, 600, 601, 768, 1152, 1440]) {
  test(`shop hero contains its content and leaves navigation clickable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/shop/rishikitchen')
    const hero = page.locator('.shop-hero')
    await expect(hero.getByRole('heading', { level: 1 })).toBeVisible()
    if (width <= 600) {
      expect((await hero.boundingBox())!.height).toBeLessThan(160)
    }

    // Stress the real storefront with a long seller description, as in production.
    await hero.locator('.shop-hero__tagline').evaluate((element) => {
      element.textContent =
        'Homemade Indian snacks, sweets and traditional food prepared with care using authentic recipes. Freshly prepared for pickup or delivery. Note: Please place your order at least 24 hours in advance. '.repeat(
          3,
        )
    })

    const bounds = await hero.evaluate((element) => {
      const banner = element.getBoundingClientRect()
      const content = element.querySelector('.shop-hero__content')!.getBoundingClientRect()
      const navigation = document
        .querySelector('.shop-storefront__navigation')!
        .getBoundingClientRect()
      return {
        bannerTop: banner.top,
        bannerBottom: banner.bottom,
        contentTop: content.top,
        contentBottom: content.bottom,
        navigationBottom: navigation.bottom,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }
    })
    expect(bounds.contentTop).toBeGreaterThanOrEqual(bounds.bannerTop)
    expect(bounds.contentBottom).toBeLessThanOrEqual(bounds.bannerBottom)
    expect(bounds.bannerTop).toBeGreaterThanOrEqual(bounds.navigationBottom)
    expect(bounds.overflow).toBe(false)
    await testInfo.attach('storefront-layout', {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
    if (width > 600) {
      await page
        .getByRole('navigation', { name: 'Breadcrumb' })
        .getByRole('link', { name: 'All Shops', exact: true })
        .click({ trial: true })
    }

    const details = hero.getByRole('button', { name: 'More details about shop' })
    await details.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const back = page.locator('.shop-storefront__navigation .back-link')
    // Exercise both ends: the reported overlap blocked only part of this link.
    await back.click({ position: { x: 8, y: 12 }, trial: true })
    const box = await back.boundingBox()
    await back.click({ position: { x: box!.width - 8, y: 12 } })
    await expect(page).toHaveURL(/\/#shops$/)
  })
}
