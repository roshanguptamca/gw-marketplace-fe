import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: 'shop-pages.spec.ts',
  testIgnore: [],
  outputDir: 'test-results/shop-pages',
  use: {
    ...base.use,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    ...base.webServer,
    command:
      'VITE_APP_ENV=local VITE_API_BASE_URL=http://localhost:8000 VITE_MAIN_FRONTEND_URL=http://localhost:3000 VITE_MARKETPLACE_URL=http://localhost:3102 VITE_USE_MOCK_API=false npm run dev -- --host 127.0.0.1 --port 3102',
    url: 'http://localhost:3102',
  },
})
