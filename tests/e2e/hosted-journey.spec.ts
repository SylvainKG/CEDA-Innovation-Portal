import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Issue #61, browser half: the real screens against the real backend (test plan §2 and §4).
 * Stacey's #65 proved each step through the REST API; this suite proves the screens do the same.
 *
 * Runs only when asked:
 * - real backend: E2E_JOURNEY=1 and DEMO_PASSWORD=<from the GitHub Actions secret>, against either a deployed
 *            real-backend build (E2E_BASE_URL) or a local build of this checkout in Supabase mode (E2E_LOCAL_SUPABASE=1);
 *            the E2E workflow's "journey" input sets these; the password never appears in the repo or the logs;
 * - writes:  the submit test (one new case) runs only with E2E_JOURNEY_WRITE=1, after a snapshot (#65, #68);
 * - mock:    E2E_JOURNEY=1 E2E_JOURNEY_MOCK=1 against a mock-mode build, to check the selectors locally.
 *
 * It CHANGES DATA on hosted (one new case, CEDA-2026-0009 on fresh demo data). Ask the backend lead for a
 * snapshot before the run and the exact reset after it (runbook; #65). Never run it against the judging project.
 * Desktop only and in order: the steps build on each other.
 */

const journey = process.env.E2E_JOURNEY === '1'
const mock = process.env.E2E_JOURNEY_MOCK === '1'
const password = process.env.DEMO_PASSWORD ?? ''
const realBackend = !!process.env.E2E_BASE_URL || process.env.E2E_LOCAL_SUPABASE === '1'
const hosted = journey && !mock && realBackend && password.length >= 12
const writes = mock || process.env.E2E_JOURNEY_WRITE === '1'

const DOMAIN = '@demo.ceda-portal.test'
type Account = { email: string; role: string }
const ACCOUNTS: Record<string, Account> = {
  applicantA: { email: `applicant.a${DOMAIN}`, role: 'applicant' },
  applicantB: { email: `applicant.b${DOMAIN}`, role: 'applicant' },
  screening: { email: `screening${DOMAIN}`, role: 'screening_officer' },
  reviewer1: { email: `reviewer.1${DOMAIN}`, role: 'reviewer' },
  adjudicator: { email: `adjudicator${DOMAIN}`, role: 'adjudicator' },
  admin: { email: `admin${DOMAIN}`, role: 'admin' },
  consultant: { email: `consultant${DOMAIN}`, role: 'support_consultant' },
}
const FORBIDDEN = "You don't have access to this page"
const NOT_FOUND = "We can't find this page"
const REFERENCE = /CEDA-\d{4}-\d{4}/

test.describe.configure({ mode: 'serial' })
test.skip(!journey || (!mock && !hosted), 'Journey suite: set E2E_JOURNEY=1 with DEMO_PASSWORD (12+) and a real backend (E2E_BASE_URL or E2E_LOCAL_SUPABASE=1), or E2E_JOURNEY_MOCK=1')
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop-1280', 'The journey runs once, on desktop')
})

async function signIn(page: Page, account: Account) {
  if (mock) {
    await page.addInitScript((role) => window.localStorage.setItem('ceda.mock.role', role), account.role)
    await page.goto('/')
    return
  }
  await page.goto('/auth/sign-in')
  await page.getByLabel('Email address').fill(account.email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 20_000 })
}

async function asAccount(browser: Browser, account: Account): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await signIn(page, account)
  return page
}

/** Fills every visible empty control of the current form section with valid answers. */
async function fillSection(page: Page) {
  const section = page.locator('section[aria-labelledby="step-heading"]')
  for (const field of await section.locator('input[type="text"], input:not([type]), textarea').all()) {
    if (!(await field.isVisible()) || (await field.inputValue())) continue
    const max = Number((await field.getAttribute('maxlength')) ?? '200')
    await field.fill('Browser test answer (issue #61)'.slice(0, Math.max(1, max)))
  }
  for (const field of await section.locator('input[type="email"]').all()) {
    if ((await field.isVisible()) && !(await field.inputValue())) await field.fill(ACCOUNTS.applicantA.email)
  }
  for (const select of await section.locator('select').all()) {
    if (!(await select.isVisible()) || (await select.inputValue())) continue
    const values = await select.locator('option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value).filter(Boolean))
    if (values[0]) await select.selectOption(values[0])
  }
  for (const input of await section.locator('input[type="file"]').all()) {
    const id = await input.getAttribute('id')
    const label = id ? await page.locator(`label[for="${id}"]`).innerText() : ''
    if (/optional/i.test(label)) continue
    await input.setInputFiles({ name: 'business-plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% Browser test file (issue #61)\n%%EOF\n') })
    // Wait until the upload has finished, as a person would: "Uploading business-plan.pdf" also contains the name.
    await expect(section.getByText('Uploading business-plan.pdf')).toHaveCount(0, { timeout: 30_000 })
    await expect(section.getByText('business-plan.pdf').first()).toBeVisible()
  }
}

test('each demo account signs in and lands on its own home, never on Forbidden', async ({ browser }) => {
  for (const account of Object.values(ACCOUNTS)) {
    const page = await asAccount(browser, account)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(FORBIDDEN)
    expect(page.url(), account.email).not.toContain('/auth/sign-in')
    await page.context().close()
  }
})

test('a wrong password is refused without saying which part was wrong', async ({ page }) => {
  test.skip(mock, 'The mock has no passwords')
  await page.goto('/auth/sign-in')
  await page.getByLabel('Email address').fill(ACCOUNTS.applicantA.email)
  await page.getByLabel(/^Password/).fill('not-the-demo-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/sign-in/)
})

test('staff screens show Forbidden to roles that may not use them', async ({ browser }) => {
  const checks: [Account, string][] = [
    [ACCOUNTS.applicantA, '/staff/queue/screening'],
    [ACCOUNTS.applicantA, '/staff/queue/decision'],
    [ACCOUNTS.reviewer1, '/admin/users'],
    [ACCOUNTS.consultant, '/staff/cases'],
    [ACCOUNTS.screening, '/staff/queue/decision'],
  ]
  for (const [account, path] of checks) {
    const page = await asAccount(browser, account)
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }), `${account.email} on ${path}`).toHaveText(FORBIDDEN)
    await page.context().close()
  }
})

test("N-a: Applicant B cannot open Applicant A's idea or receipt (Not found, no leak)", async ({ browser }) => {
  test.skip(mock, 'The mock has one applicant')
  const a = await asAccount(browser, ACCOUNTS.applicantA)
  await a.goto('/ideas')
  const view = a.getByRole('link', { name: /^View idea/ }).first()
  await expect(view).toBeVisible({ timeout: 20_000 })
  const href = await view.getAttribute('href')
  const title = (await a.getByRole('heading', { level: 3 }).first().innerText()).trim()
  expect(href).toMatch(/^\/ideas\/[0-9a-f-]{36}$/)
  await a.context().close()

  const b = await asAccount(browser, ACCOUNTS.applicantB)
  for (const path of [href!, `${href}/receipt`]) {
    await b.goto(path)
    await expect(b.getByRole('heading', { level: 1 }), path).toHaveText(NOT_FOUND, { timeout: 20_000 })
    await expect(b.getByText(title), `${path} must not show A's title`).toHaveCount(0)
  }
  await b.context().close()
})

test('Applicant A submits an idea; a lost reply is recovered without a second case (N-k)', async ({ browser }) => {
  test.skip(!writes, 'Writes one case: run with E2E_JOURNEY_WRITE=1 after a snapshot of staging (#65, #68)')
  test.setTimeout(180_000)
  const page = await asAccount(browser, ACCOUNTS.applicantA)
  await page.goto('/ideas')
  const start = page.locator('a[href^="/ideas/new?challenge="]').first()
  await expect(start).toBeVisible({ timeout: 20_000 })
  await start.click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Walk the sections, filling each, until the review step.
  const stepHeading = page.locator('#step-heading')
  for (let step = 0; step < 12; step++) {
    await expect(stepHeading).toBeVisible()
    await fillSection(page)
    const next = page.getByRole('button', { name: /^Continue: / })
    if ((await next.count()) === 0) break // the review step has no Continue button
    const target = (await next.innerText()).replace(/^Continue:\s*/, '').trim()
    await next.click()
    await expect(stepHeading).toHaveText(target)
  }
  await page.getByLabel('I have read and accept the declaration above.').check()

  if (hosted) {
    // N-k: the server receives and applies the submission, but the reply never reaches the browser.
    let lost = 0
    await page.route('**/rest/v1/rpc/submit_proposal', async (route) => {
      if (lost > 0) return route.continue()
      lost++
      await route.fetch() // reaches the server
      await route.abort('connectionreset') // the reply is lost
    })
    await page.getByRole('button', { name: 'Submit idea' }).click()
    await expect(page.getByText('Not confirmed yet.')).toBeVisible({ timeout: 30_000 })
    await page.unroute('**/rest/v1/rpc/submit_proposal')
    expect(lost).toBe(1)
    await page.getByRole('button', { name: 'Check status' }).click()
  } else {
    await page.getByRole('button', { name: 'Submit idea' }).click()
  }

  await expect(page).toHaveURL(/\/ideas\/[0-9a-f-]{36}\/receipt$/, { timeout: 30_000 })
  const reference = (await page.getByText(REFERENCE).first().innerText()).match(REFERENCE)![0]

  // Exactly one case with this reference: the recovery replayed the receipt rather than submitting twice.
  // Through the app's own navigation, as a person would (a reload would also empty the mock's in-memory data).
  await page.getByRole('link', { name: 'My ideas' }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My ideas')
  await expect(page.getByText(reference, { exact: true })).toHaveCount(1, { timeout: 20_000 })
  test.info().annotations.push({ type: 'reference', description: reference })
  await page.context().close()
})
