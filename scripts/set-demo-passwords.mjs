#!/usr/bin/env node
// Sets the password of every seeded demo account (blueprint D-17).
// The seed creates accounts with an unusable password; this script sets
// DEMO_PASSWORD through the Auth admin API, so no password is ever in the repo.
//
// Usage (Node 20+, no dependencies):
//   node --env-file=.env scripts/set-demo-passwords.mjs
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
// Touches only users whose email ends with @demo.ceda-portal.test.
// Never prints the password or the key.

const DEMO_DOMAIN = '@demo.ceda-portal.test'
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD } = process.env

function fail(message) {
  console.error(`set-demo-passwords: ${message}`)
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 10) fail('DEMO_PASSWORD must be set and at least 10 characters long.')

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function call(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) fail(`${init.method ?? 'GET'} ${path.split('?')[0]} returned HTTP ${res.status}`)
  return res.json()
}

const users = []
for (let page = 1; page <= 10; page++) {
  const body = await call(`/admin/users?page=${page}&per_page=100`)
  const batch = body.users ?? []
  users.push(...batch)
  if (batch.length < 100) break
}

const demo = users.filter((u) => typeof u.email === 'string' && u.email.endsWith(DEMO_DOMAIN))
if (demo.length === 0) fail('no demo accounts found. Run the seed first (supabase db reset).')

for (const u of demo) {
  await call(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ password: DEMO_PASSWORD }) })
}
console.log(`set-demo-passwords: updated ${demo.length} demo accounts.`)
