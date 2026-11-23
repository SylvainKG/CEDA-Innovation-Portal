import { expect, test, type Page } from '@playwright/test'

/**
 * Shell smoke tests on the frontend in mock mode (no backend yet).
 * Covers what exists today: DEMO labelling, skip link, layout at 360/1280 px, route guards and the
 * Forbidden / Not-found states. The workflow journeys (blueprint §3.2) and the negative suite N1–N11
 * (§3.3) are added as each slice's screens and RPCs are connected.
 *
 * Note: the route guard is a UI convenience. These tests do NOT prove access control; the server
 * (RLS + RPC checks) does, and the N-tests against the real backend are the evidence for it.
 */

const MOCK_ROLE_KEY = 'ceda.mock.role'

/**
 * Signed-in pages here use the mock session (a role in local storage), which exists only in a mock-mode build.
 * Against a deployed site (E2E_BASE_URL), staging runs in Supabase mode, so those checks are skipped there; the
 * real-backend journey (hosted-journey.spec.ts, `journey` input) covers signed-in pages on the deployed site.
 */
const deployed = !!process.env.E2E_BASE_URL
const MOCK_ONLY = 'Needs the mock session (mock-mode build). On a deployed site, hosted-journey.spec.ts covers signed-in pages.'

async function asRole(page: Page, role: string) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [MOCK_ROLE_KEY, role])
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

const pages: { name: string; role?: string; path: string; heading: string | RegExp }[] = [
  { name: 'public home', path: '/', heading: 'A new dawn for innovation in Botswana' }, // T01 built from spec (was the placeholder title)
  { name: 'how it works', path: '/how-it-works', heading: 'How the CEDA innovation process works' },
  { name: 'about us', path: '/about', heading: 'About Us' },
  { name: 'CEDA branch network', path: '/help/contacts', heading: 'Contact and branch network' },
  { name: 'sign-in', path: '/auth/sign-in', heading: 'Sign in' },
  { name: 'applicant home', role: 'applicant', path: '/ideas', heading: /^Welcome, / }, // T06 to Sandra's frame: greets the applicant
  { name: 'staff home', role: 'admin', path: '/staff', heading: /^Good (morning|afternoon|evening), / }, // T06 to Sandra's frames: greets the signed-in person
  { name: 'reviewer queue', role: 'reviewer', path: '/staff/reviews', heading: 'My reviews' },
]

for (const p of pages) {
  test(`${p.name}: one h1, DEMO label, no horizontal scroll`, async ({ page }) => {
    test.skip(deployed && !!p.role, MOCK_ONLY)
    if (p.role) await asRole(page, p.role)
    await page.goto(p.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.heading)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    // The header no longer carries a DEMO pill (team lead, 22 Nov); every page's footer says it is a demonstration.
    await expect(page.getByRole('contentinfo').getByText(/Demo prototype with fictional data/)).toBeVisible()
    expect(await horizontalOverflow(page)).toBe(0)
  })
}

test('public navigation links to standalone information pages', async ({ page }) => {
  await page.goto('/')
  if ((page.viewportSize()?.width ?? 1280) < 1024) await page.getByRole('button', { name: 'Open menu' }).click()
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link', { name: 'Challenges' })).toHaveAttribute('href', '/challenges')
  await expect(nav.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/how-it-works')
  await expect(nav.getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/about')
  await expect(nav.getByRole('link', { name: 'FAQs' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/help/contacts')
  await expect(page.getByRole('link', { name: 'Peolwane · CEDA Innovation Portal' })).toHaveAttribute('href', '/')
  await nav.getByRole('link', { name: 'How it works' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How the CEDA innovation process works')
})

test('first Tab press focuses the skip link, which is visibly outlined', async ({ page }) => {
  await page.goto('/')
  // The app shell loads asynchronously; wait until it has rendered before pressing Tab.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText(/skip to main content/i)
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(outline).not.toBe('none')
})

test('a signed-out visitor is sent to sign-in from an applicant page', async ({ page }) => {
  await page.goto('/ideas')
  await expect(page).toHaveURL(/\/auth\/sign-in/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in')
})

test('an applicant sees the Forbidden state on the audit log, without confirming anything exists', async ({ page }) => {
  test.skip(deployed, MOCK_ONLY)
  await asRole(page, 'applicant')
  await page.goto('/audit')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("You don't have access to this page")
  await expect(page.getByText('contact the portal administrator')).toBeVisible()
  await expect(page.getByText('Audit log', { exact: true })).toHaveCount(0)
})

test('an unknown address shows the Not-found state', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("We can't find this page")
})

test('interactive elements on the public home are at least 44 × 44 px', async ({ page }) => {
  await page.goto('/')
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('a, button, input, select, textarea'))
      .filter((el) => el.offsetParent !== null && !/skip/i.test(el.textContent ?? ''))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
      .map(({ el, r }) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`),
  )
  expect(small).toEqual([])
})
