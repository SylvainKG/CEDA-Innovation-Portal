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

async function asRole(page: Page, role: string) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [MOCK_ROLE_KEY, role])
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

const pages: { name: string; role?: string; path: string; heading: string | RegExp }[] = [
  { name: 'public home', path: '/', heading: 'Submit your innovation to CEDA' }, // T01 built from spec (was the placeholder title)
  { name: 'sign-in', path: '/auth/sign-in', heading: 'Sign in' },
  { name: 'applicant home', role: 'applicant', path: '/ideas', heading: /^Welcome, / }, // T06 to Sandra's frame: greets the applicant
  { name: 'staff home', role: 'admin', path: '/staff', heading: /^Welcome, / }, // T06 built (#78): greets the signed-in person
  { name: 'reviewer queue', role: 'reviewer', path: '/staff/reviews', heading: 'My reviews' },
]

for (const p of pages) {
  test(`${p.name}: one h1, DEMO label, no horizontal scroll`, async ({ page }) => {
    if (p.role) await asRole(page, p.role)
    await page.goto(p.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.heading)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByText('DEMO', { exact: false }).first()).toBeVisible()
    expect(await horizontalOverflow(page)).toBe(0)
  })
}

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
