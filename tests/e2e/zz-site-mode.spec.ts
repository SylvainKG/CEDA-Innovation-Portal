import { test } from '@playwright/test'

// TEMPORARY diagnostic (removed before merge): which API mode is the deployed bundle in?
test('deployed bundle mode', async ({ page, request }) => {
  test.skip(!process.env.E2E_BASE_URL || test.info().project.name !== 'desktop-1280', 'deployed site only')
  const html = await (await request.get('/')).text()
  const srcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1])
  for (const s of srcs) {
    const js = await (await request.get(s)).text()
    console.log(`DIAG bundle ${s}: bytes=${js.length} hasProjectRef=${js.includes('hncwpxyuolfxafbemapb')} hasSupabaseCo=${js.includes('.supabase.co')}`)
  }
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('requestfailed', (r) => errors.push(`requestfailed ${r.url().slice(0, 120)} ${r.failure()?.errorText}`))
  await page.goto('/auth/sign-in')
  await page.waitForTimeout(2000)
  console.log('DIAG sign-in page text:', (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600))
  const email = page.getByLabel('Email address')
  if (await email.count()) {
    await email.fill('applicant.a@demo.example')
    const pw = page.getByLabel(/^Password/)
    if (await pw.count()) await pw.fill('definitely-wrong-password-123')
    await page.getByRole('button', { name: 'Sign in' }).click().catch((e) => console.log('DIAG click', String(e).slice(0, 200)))
    await page.waitForTimeout(6000)
    console.log('DIAG after wrong sign-in, url:', page.url())
    console.log('DIAG after wrong sign-in text:', (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600))
  }
  console.log('DIAG errors:', JSON.stringify(errors.slice(0, 10)))
})
