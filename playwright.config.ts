import { defineConfig, devices } from '@playwright/test'

const e2ePort = 3102

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `VITE_APP_ENV=local VITE_API_BASE_URL=http://localhost:8000 VITE_MAIN_FRONTEND_URL=http://localhost:3000 VITE_MARKETPLACE_URL=http://localhost:${e2ePort} VITE_USE_MOCK_API=true npm run dev -- --port ${e2ePort}`,
    url: `http://localhost:${e2ePort}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
