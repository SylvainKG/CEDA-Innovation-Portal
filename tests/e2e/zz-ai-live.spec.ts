import { test } from '@playwright/test'

// TEMPORARY diagnostic (never merged): is Peolwane AI in the deployed build, and does the engine answer?
test('Peolwane AI on the deployed site', async ({ page, request }) => {
  test.skip(!process.env.E2E_BASE_URL || test.info().project.name !== 'desktop-1280', 'deployed site only')
  const html = await (await request.get('/')).text()
  for (const s of [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1])) {
    const js = await (await request.get(s)).text()
    console.log(`DIAG bundle ${s}: hasLesedingHost=${js.includes('lesedingaiengine')} hasSupabase=${js.includes('.supabase.co')}`)
  }
  const failed: string[] = []
  page.on('requestfailed', (r) => failed.push(`${r.url().slice(0, 80)} ${r.failure()?.errorText}`))
  page.on('console', (m) => { if (m.type() === 'error') failed.push('console: ' + m.text().slice(0, 160)) })
  await page.goto('/')
  await page.waitForTimeout(2500)
  const btn = page.getByRole('button', { name: 'Peolwane AI' })
  console.log('DIAG launcher visible:', await btn.isVisible().catch(() => false))
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.getByRole('button', { name: 'Text' }).click()
    await page.getByRole('textbox', { name: 'Your question' }).fill('How do I submit an idea?')
    const resp = page.waitForResponse((r) => r.url().includes('/api/chat'), { timeout: 30_000 }).catch(() => null)
    await page.getByRole('button', { name: 'Send' }).click()
    const r = await resp
    console.log('DIAG /api/chat status:', r ? r.status() : 'no response')
    await page.waitForTimeout(8000)
    const log = await page.getByRole('log').innerText().catch(() => '')
    console.log('DIAG conversation:', log.replace(/\s+/g, ' ').slice(0, 500))
    console.log('DIAG alert:', await page.getByRole('alert').innerText().catch(() => 'none'))
  }
  console.log('DIAG failures:', JSON.stringify(failed.slice(0, 8)))
})
