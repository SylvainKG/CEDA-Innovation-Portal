import { expect, test } from '@playwright/test'

/**
 * Hosting checks for a deployed site (SEC-02 "HTTPS only", OPS-01; customHttp.yml; hosting guide §3).
 *
 * The security headers and the single-page-app rewrite are configured on AWS Amplify, not in the app,
 * so the local `vite preview` server has neither. These checks therefore run only when the suite targets
 * a deployed site: `E2E_BASE_URL=https://… npm run test:e2e`, or the E2E workflow's `base_url` input.
 * They are header checks, not browser checks, so they run once (desktop project only).
 */
const deployed = !!process.env.E2E_BASE_URL

test.describe('deployed site: security headers and rewrites', () => {
  test.skip(!deployed, 'Headers and rewrites are set by AWS Amplify; run with E2E_BASE_URL against a deployed site.')
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop-1280', 'Header checks run once, on the desktop project.')
  })

  const expected: Record<string, RegExp> = {
    'strict-transport-security': /max-age=31536000/,
    'x-content-type-options': /^nosniff$/,
    'x-frame-options': /^DENY$/,
    'referrer-policy': /^strict-origin-when-cross-origin$/,
    'permissions-policy': /camera=\(\)/,
    'content-security-policy': /default-src 'self'.*frame-ancestors 'none'/,
  }

  for (const path of ['/', '/staff', '/ideas/123']) {
    test(`${path} answers 200 with HTML and every security header`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), 'deep links must be rewritten to the app, not redirected or 404').toBe(200)
      expect(response.headers()['content-type']).toMatch(/text\/html/)
      for (const [name, pattern] of Object.entries(expected)) {
        expect(response.headers()[name] ?? '(missing)', `${name} on ${path}`).toMatch(pattern)
      }
    })
  }

  test('the site is served over HTTPS', async ({ baseURL }) => {
    expect(baseURL).toMatch(/^https:\/\//)
  })
})
