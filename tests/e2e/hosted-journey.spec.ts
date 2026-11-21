import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

/**
 * Issue #61, browser half: the real screens against the real backend (test plan §2 and §4).
 * Stacey's #65 proved each step through the REST API; this suite proves the screens do the same.
 *
 * Runs only when asked:
 * - real backend: E2E_JOURNEY=1 and DEMO_PASSWORD=<from the GitHub Actions secret>, against either a deployed
 *            real-backend build (E2E_BASE_URL) or a local build of this checkout in Supabase mode (E2E_LOCAL_SUPABASE=1);
 *            the E2E workflow's "journey" input sets these; the password never appears in the repo or the logs;
 * - writes:  the submit test (one new case) and the steps 5-17 test (that case through screening, a revision,
 *            decision, award, chat and oversight) run only with E2E_JOURNEY_WRITE=1, after a snapshot (#65, #68);
 * - rehearsal: the E2E workflow's "journey_local" input runs everything, writes included, against a throwaway
 *            Supabase stack started in the job (no secrets, no staging data). Rehearse there before a staging run;
 * - mock:    E2E_JOURNEY=1 E2E_JOURNEY_MOCK=1 against a mock-mode build, to check the selectors locally.
 *
 * It CHANGES DATA on hosted (one new case, CEDA-2026-0009 on fresh demo data, taken to award; chat is opened with
 * the demo override and put back). Ask the backend lead for a
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

/** Extra staff accounts used only by the lifecycle test (steps 5-17). */
const STAFF = {
  reviewer2: { email: `reviewer.2${DOMAIN}`, role: 'reviewer' },
  reviewer3: { email: `reviewer.3${DOMAIN}`, role: 'reviewer' },
} satisfies Record<string, Account>
const REASON = 'Browser test reason, long enough to save (issue #61).'

/** The case test 5 submits; the lifecycle test carries it through steps 5-17. */
let submitted: { id: string; reference: string } | undefined

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

/**
 * Each account signs in once per run and keeps its session, as a person keeps one tab signed in. Supabase Auth
 * allows 30 sign-ins per 5 minutes per IP address, and the full journey would pass that if every step signed in
 * again. Each call opens a fresh page in that account's signed-in browser context; close the page, not the context.
 */
const sessions = new Map<string, BrowserContext>()
async function asAccount(browser: Browser, account: Account): Promise<Page> {
  const known = mock ? undefined : sessions.get(account.email)
  if (known) return known.newPage()
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await signIn(page, account)
  if (!mock) sessions.set(account.email, context)
  return page
}
test.afterAll(async () => {
  for (const context of sessions.values()) await context.close()
  sessions.clear()
})

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
    await page.close()
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
    await page.close()
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
  await a.close()

  const b = await asAccount(browser, ACCOUNTS.applicantB)
  for (const path of [href!, `${href}/receipt`]) {
    await b.goto(path)
    await expect(b.getByRole('heading', { level: 1 }), path).toHaveText(NOT_FOUND, { timeout: 20_000 })
    await expect(b.getByText(title), `${path} must not show A's title`).toHaveCount(0)
  }
  await b.close()
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
  submitted = { id: new URL(page.url()).pathname.split('/')[2]!, reference }

  // Exactly one case with this reference: the recovery replayed the receipt rather than submitting twice.
  // Through the app's own navigation, as a person would (a reload would also empty the mock's in-memory data).
  await page.getByRole('link', { name: 'My ideas' }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My ideas')
  await expect(page.getByText(reference, { exact: true })).toHaveCount(1, { timeout: 20_000 })
  test.info().annotations.push({ type: 'reference', description: reference })
  await page.close()
})

/** Declares no conflict and opens the scorecard (D-19: the proposal stays closed until then). */
async function declareNoConflict(page: Page) {
  await page.getByRole('radio', { name: /I have no conflict of interest/ }).check()
  await page.getByRole('button', { name: 'Continue to proposal' }).click()
  await expect(page.getByRole('heading', { name: 'Your scorecard' })).toBeVisible({ timeout: 20_000 })
}

/** Scores every criterion the rubric shows (names come from the seeded rubric) and submits the scorecard. */
async function scoreAndSubmit(page: Page, score: string) {
  const groups = page.getByRole('radiogroup', { name: / score$/ })
  await expect(groups.first()).toBeVisible()
  for (const group of await groups.all()) await group.getByText(score, { exact: true }).click()
  for (const reason of await page.getByLabel(/^Reason for your .* score/).all()) await reason.fill(REASON)
  await page.getByRole('button', { name: 'Submit scorecard' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit scorecard' }).click()
  await expect(page.getByText(/^Submitted .* · read only$/)).toBeVisible({ timeout: 20_000 })
}

/** Opens a staff case page and waits for its title. */
async function openCase(page: Page, id: string) {
  await page.goto(`/staff/cases/${id}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
}

test('Steps 5-17: the case goes from screening through revision, decision and award to chat and oversight', async ({ browser }) => {
  test.skip(!writes || mock, 'Writes many rows on staging: run with E2E_JOURNEY_WRITE=1 after a snapshot (#65, #68); needs the real backend')
  test.skip(!submitted, 'Needs the case created by the submit test in the same run')
  test.setTimeout(15 * 60_000)
  const { id, reference } = submitted!

  await test.step('5: screening asks a clarification; the applicant replies; screening records Eligible', async () => {
    const s = await asAccount(browser, ACCOUNTS.screening)
    await openCase(s, id)
    await s.getByRole('button', { name: 'Request clarification' }).click()
    const ask = s.getByRole('dialog')
    await ask.getByLabel(/^Question/).fill('Please confirm the pilot site (browser test).')
    await ask.getByRole('button', { name: 'Send question' }).click()
    await expect(s.getByText('Question sent. The case now waits on the applicant, who must reply in writing.')).toBeVisible({ timeout: 20_000 })

    const a = await asAccount(browser, ACCOUNTS.applicantA)
    await a.goto(`/ideas/${id}`)
    await expect(a.getByText('CEDA has a question for you')).toBeVisible({ timeout: 20_000 })
    await a.getByLabel(/^Your reply/).fill('The pilot site is in Kweneng (browser test).')
    await a.getByRole('button', { name: 'Send reply' }).click()
    await expect(a.getByText('Answered')).toBeVisible({ timeout: 20_000 })
    await a.close()

    await openCase(s, id)
    await s.getByRole('button', { name: 'Record screening' }).click()
    const screen = s.getByRole('dialog')
    await screen.getByRole('radio', { name: 'Eligible', exact: true }).check()
    await screen.getByLabel(/^Reason/).fill('Fits the challenge (browser test).')
    await screen.getByRole('button', { name: 'Record result' }).click()
    await expect(s.getByText('Recorded as eligible. The case moved to evaluation.')).toBeVisible({ timeout: 20_000 })
    await s.close()
  })

  await test.step('6: the admin assigns Reviewer 1 and Reviewer 2; Reviewer 3 still sees nothing (N3)', async () => {
    const adm = await asAccount(browser, ACCOUNTS.admin)
    await openCase(adm, id)
    await adm.getByRole('button', { name: 'Assign reviewers' }).click()
    const dialog = adm.getByRole('dialog')
    await dialog.getByRole('checkbox', { name: 'Demo Reviewer 1' }).check()
    await dialog.getByRole('checkbox', { name: 'Demo Reviewer 2' }).check()
    await dialog.getByRole('button', { name: 'Assign 2 reviewers' }).click()
    await expect(adm.getByText(/^Assigned Demo Reviewer/)).toBeVisible({ timeout: 20_000 })
    await adm.close()

    const r3 = await asAccount(browser, STAFF.reviewer3)
    await r3.goto('/staff/reviews')
    await expect(r3.getByRole('heading', { level: 1 })).toHaveText('My reviews', { timeout: 20_000 })
    await expect(r3.getByText(reference)).toHaveCount(0)
    await r3.goto(`/staff/cases/${id}/score`)
    await expect(r3.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`${NOT_FOUND}|${FORBIDDEN}`), { timeout: 20_000 })
    await expect(r3.getByText(reference)).toHaveCount(0)
    await r3.close()
  })

  await test.step('7: Reviewer 1 declares no conflict, then scores version 1 and submits', async () => {
    const r1 = await asAccount(browser, ACCOUNTS.reviewer1)
    await r1.goto(`/staff/cases/${id}/score`)
    await expect(r1.getByText('The proposal and its files open only after you declare any conflict of interest.', { exact: false })).toBeVisible({ timeout: 20_000 })
    await declareNoConflict(r1)
    await scoreAndSubmit(r1, '4')
    await r1.close()
  })

  await test.step("8: Reviewer 2 declares; before scoring, other reviewers' scores stay hidden", async () => {
    const r2 = await asAccount(browser, STAFF.reviewer2)
    await r2.goto(`/staff/cases/${id}/score`)
    await declareNoConflict(r2)
    await expect(r2.getByText("Other reviewers' scores appear after you submit yours.")).toBeVisible()
    await r2.close()
  })

  await test.step('9: a revision with three roadmap tasks is requested; the applicant sees the roadmap', async () => {
    // The screen offers "Request revision" to the screening officer and adjudicator, not to reviewers (discrepancy logged).
    const s = await asAccount(browser, ACCOUNTS.screening)
    await openCase(s, id)
    await s.getByRole('button', { name: 'Request revision' }).click()
    const dialog = s.getByRole('dialog')
    await dialog.getByLabel(/^Message/).fill('Please strengthen the plan (browser test).')
    const tasks = ['Add a line-item budget.', 'Name the pilot site.', 'Describe the maintenance plan.']
    for (const [i, t] of tasks.entries()) {
      if (i > 0) await dialog.getByRole('button', { name: 'Add a task' }).click()
      await dialog.getByLabel(`Task ${i + 1}`, { exact: true }).fill(t)
    }
    await dialog.getByRole('button', { name: 'Send revision request' }).click()
    await expect(s.getByText(/Revision request sent/)).toBeVisible({ timeout: 20_000 })
    await s.close()

    const a = await asAccount(browser, ACCOUNTS.applicantA)
    await a.goto(`/ideas/${id}`)
    await expect(a.getByText('CEDA asks you to revise your idea')).toBeVisible({ timeout: 20_000 })
    await expect(a.getByText('Roadmap · 0 of 3 tasks addressed')).toBeVisible()
    await a.close()
  })

  await test.step('10: the applicant answers every task and submits version 2', async () => {
    const a = await asAccount(browser, ACCOUNTS.applicantA)
    await a.goto(`/ideas/${id}/revise`)
    await expect(a.getByRole('heading', { level: 1, name: 'Revise your idea' })).toBeVisible({ timeout: 20_000 })
    const roadmap = a.getByRole('region', { name: 'Roadmap' })
    for (const task of await roadmap.getByRole('group').all()) {
      await task.getByRole('radio', { name: 'Addressed', exact: true }).check()
      await task.getByLabel('What did you change?').fill('Done in version 2 (browser test).')
    }
    await a.getByLabel(/^What changed\?/).fill('Added a budget, the site and a maintenance plan (browser test).')
    await a.getByRole('checkbox', { name: /accept the declaration/i }).check()
    await a.getByRole('button', { name: 'Submit Version 2' }).click()
    await expect(a.getByRole('heading', { level: 1, name: 'Version 2 submitted' })).toBeVisible({ timeout: 30_000 })
    await expect(a.getByText(reference).first()).toBeVisible()
    await a.close()
  })

  await test.step('11: both reviewers verify every task and score version 2; quorum moves the case to adjudication', async () => {
    for (const account of [ACCOUNTS.reviewer1, STAFF.reviewer2]) {
      const r = await asAccount(browser, account)
      await r.goto(`/staff/cases/${id}/score`)
      await expect(r.getByText('What changed in version 2')).toBeVisible({ timeout: 20_000 })
      const tasks = r.getByRole('group', { name: /^Task \d+:/ })
      const n = await tasks.count()
      expect(n).toBe(3)
      for (let i = 0; i < n; i++) {
        const task = tasks.nth(i)
        await task.getByRole('radio', { name: 'Verified', exact: true }).check()
        await task.getByRole('button', { name: 'Save check' }).click()
        await expect(r.getByText(`${i + 1} of ${n} tasks verified`)).toBeVisible({ timeout: 20_000 })
      }
      await scoreAndSubmit(r, '4')
      await r.close()
    }
  })

  await test.step('12: the adjudicator records Approved; the applicant still sees no outcome (N4)', async () => {
    const adj = await asAccount(browser, ACCOUNTS.adjudicator)
    await openCase(adj, id)
    await adj.getByRole('button', { name: 'Record decision' }).click()
    const dialog = adj.getByRole('dialog')
    await dialog.getByRole('radio', { name: 'Approved', exact: true }).check()
    await dialog.getByLabel(/^Reason/).fill('Strong scores and a credible pilot plan (browser test).')
    await dialog.getByRole('button', { name: 'Save decision (not published)' }).click()
    await expect(adj.getByText(/Decision saved as Approved\. It is not published/)).toBeVisible({ timeout: 20_000 })
    await adj.close()

    const a = await asAccount(browser, ACCOUNTS.applicantA)
    await a.goto(`/ideas/${id}`)
    await expect(a.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(a.getByText('Strong scores and a credible pilot plan (browser test).')).toHaveCount(0)
    await expect(a.getByText('Approved', { exact: true })).toHaveCount(0)
    await a.close()
  })

  await test.step('13: the adjudicator publishes the decision', async () => {
    const adj = await asAccount(browser, ACCOUNTS.adjudicator)
    await openCase(adj, id)
    await adj.getByRole('tab', { name: 'Decision' }).click()
    await adj.getByRole('button', { name: 'Publish decision' }).click()
    await adj.getByRole('dialog').getByRole('button', { name: 'Publish to applicant' }).click()
    await expect(adj.getByText('Decision published. The applicant is notified.')).toBeVisible({ timeout: 20_000 })
    await adj.close()
  })

  await test.step('14: the admin records the award', async () => {
    const adm = await asAccount(browser, ACCOUNTS.admin)
    await openCase(adm, id)
    await adm.getByRole('button', { name: 'Record award' }).click()
    const dialog = adm.getByRole('dialog')
    await dialog.getByLabel(/^Amount \(BWP\)/).fill('250,000.00')
    await dialog.getByLabel(/^Description/).fill('Seed grant for the pilot (DEMO, browser test).')
    await dialog.getByRole('button', { name: 'Record award' }).click()
    await expect(adm.getByText(/^Award of BWP 250,000\.00 recorded/)).toBeVisible({ timeout: 20_000 })
    await adm.close()
  })

  await test.step('15: the applicant sees the decision, the award and notifications; never internal notes', async () => {
    const a = await asAccount(browser, ACCOUNTS.applicantA)
    await a.goto(`/ideas/${id}`)
    await expect(a.getByText('Awarded BWP 250,000.00.')).toBeVisible({ timeout: 20_000 })
    await expect(a.getByText('Fits the challenge (browser test).')).toHaveCount(0) // the screening reason is a staff note
    await a.goto('/notifications')
    await expect(a.getByText(reference).first()).toBeVisible({ timeout: 20_000 })
    await a.close()
  })

  await test.step('16: chat, with the demo override on; the consultant answers; the override is put back', async () => {
    const adm = await asAccount(browser, ACCOUNTS.admin)
    await adm.goto('/admin/settings/chat')
    await adm.getByRole('radio', { name: 'Always open' }).check()
    await expect(adm.getByText('Chat set to: always open.')).toBeVisible({ timeout: 20_000 })

    const a = await asAccount(browser, ACCOUNTS.applicantA)
    await a.goto('/support/chat')
    await a.getByLabel(/^How can we help\?/).fill('How do I add a budget (browser test)?')
    await a.getByRole('button', { name: 'Start chat' }).click()
    await expect(a.getByText('A consultant will join shortly.')).toBeVisible({ timeout: 20_000 })

    const c = await asAccount(browser, ACCOUNTS.consultant)
    await c.goto('/support/inbox')
    await c.getByRole('button', { name: 'Accept' }).first().click()
    await expect(c.getByRole('heading', { name: 'Chat with Demo Applicant A' })).toBeVisible({ timeout: 20_000 })
    await c.getByLabel('Your message').fill('Use the Documents step of the form (browser test).')
    await c.getByRole('button', { name: 'Send' }).click()
    await c.close()

    await expect(a.getByText('Use the Documents step of the form (browser test).')).toBeVisible({ timeout: 30_000 })
    await a.getByRole('button', { name: 'End chat' }).click()
    await expect(a.getByText('Your last chat has ended.')).toBeVisible({ timeout: 20_000 })
    await a.close()

    await adm.getByRole('radio', { name: 'Follow the opening hours' }).check()
    await expect(adm.getByText('Chat set to: follow the opening hours.')).toBeVisible({ timeout: 20_000 })
    await adm.close()
  })

  await test.step('17: reports export a CSV that includes the case; the audit log shows the whole journey', async () => {
    const adm = await asAccount(browser, ACCOUNTS.admin)
    await adm.goto('/reports')
    await expect(adm.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible({ timeout: 20_000 })
    const [download] = await Promise.all([adm.waitForEvent('download'), adm.getByRole('button', { name: 'Export CSV' }).click()])
    const csv = (await (await download.createReadStream()).toArray()).join('')
    expect(csv).toContain(reference)

    await adm.goto('/audit')
    await adm.getByLabel('Case reference').fill(reference)
    await adm.getByRole('button', { name: 'Apply filters' }).click()
    for (const action of ['proposal.submitted', 'feedback.requested', 'case.screened', 'assignment.created', 'scorecard.submitted',
      'proposal.revised', 'task.verified', 'decision.recorded', 'decision.published', 'award.recorded']) {
      await expect(adm.getByText(action, { exact: true }).first(), action).toBeVisible({ timeout: 20_000 })
    }
    await adm.close()
  })
})
