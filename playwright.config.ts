import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests (docs/testing/test-plan.md §1, QA-01, SEC-02).
 *
 * - Default: builds the app in mock mode and serves the production build locally.
 * - E2E_BASE_URL=https://… runs the same tests against a deployed site (staging or judging) instead.
 *
 * Run with traces off unless debugging one failure: `npm run test:e2e -- --trace off`.
 */
const externalBaseURL = process.env.E2E_BASE_URL || undefined // empty means "not set" (CI passes an empty input)
const port = 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${port}`,
    trace: 'off',
  },
  // Spec §3.3 breakpoints: phone 360 px and desktop 1280 px. Further browsers (Edge, Firefox) join for QA-01.
  projects: [
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${port} --strictPort`,
        port,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { VITE_API_MODE: 'mock' },
      },
})
