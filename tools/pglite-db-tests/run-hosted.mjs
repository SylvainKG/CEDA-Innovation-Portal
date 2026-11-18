// Runs every pgTAP file in supabase/tests/database/ against a hosted Supabase database
// (staging or judging), without Docker. Each test file wraps itself in begin ... rollback,
// so it leaves no rows behind. The one thing a rollback cannot undo is a sequence, so the
// case-reference sequence is recorded first and restored afterwards (the next demo
// reference stays CEDA-2026-0009).
//
//   SUPABASE_DB_URL=postgresql://...  node run-hosted.mjs [filter]
//   (from the repo root: node --env-file=.env tools/pglite-db-tests/run-hosted.mjs)
//
// Use the session-pooler URL from the dashboard (Connect > Session pooler). Never commit it.
// TLS is verified: download the project's CA certificate (Dashboard > Database settings >
// SSL configuration), keep it outside the repository and set SUPABASE_CA_CERT to its path.
//
// Rules: staging only, when nobody is using it. Never against the judging project after
// code freeze (22 Nov 2026, 18:00 CAT); for judging use health() and read-only checks.
// Record the output as "hosted", with the commit, the UTC time and the summary line.
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Set SUPABASE_DB_URL (session pooler URL of the hosted project).')
  process.exit(2)
}
const caPath = process.env.SUPABASE_CA_CERT
if (!caPath || !fs.existsSync(caPath)) {
  console.error('Set SUPABASE_CA_CERT to the Supabase CA certificate file (Dashboard > Database settings > SSL configuration).')
  console.error('The connection carries the database password, so the server certificate is always verified.')
  process.exit(2)
}
const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(here, '../../supabase/tests/database')
const filter = process.argv[2] ?? ''
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql') && f.includes(filter)).sort()

const client = new pg.Client({ connectionString: url, ssl: { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true } })
await client.connect()
const started = new Date()
const info = (await client.query(
  `select current_setting('server_version') as version,
          (select max(version) from supabase_migrations.schema_migrations) as migration`)).rows[0]
console.log(`hosted run started ${started.toISOString()} · Postgres ${info.version} · latest migration ${info.migration}`)

const seq = (await client.query('select last_value, is_called from private.proposal_reference_seq')).rows[0]
let total = 0
let failed = 0
try {
  for (const f of files) {
    let res
    try {
      res = await client.query(fs.readFileSync(path.join(dir, f), 'utf8'))
    } catch (e) {
      console.log(`FAIL ${f}: ${e.message}`)
      failed++
      try { await client.query('rollback') } catch { /* already rolled back */ }
      continue
    }
    const lines = [].concat(res)
      .flatMap((r) => (r.rows || []).map((row) => Object.values(row)[0]))
      .filter((v) => typeof v === 'string')
      .flatMap((v) => v.split('\n'))
    const bad = lines.filter((l) => l.startsWith('not ok') || /Looks like you planned/.test(l))
    const good = lines.filter((l) => /^ok /.test(l))
    total += good.length + bad.length
    failed += bad.length
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${f}: ${good.length} passed, ${bad.length} failed`)
    for (const l of lines) if (l.startsWith('not ok') || l.startsWith('#')) console.log('     ' + l)
  }
} finally {
  // Restore, but never below a reference that really exists: if someone submitted during the
  // run, the next reference must still be new (references are unique).
  const used = (await client.query(
    `select coalesce(max(substring(reference from 11)::bigint), 0) as n from public.proposals where reference is not null`)).rows[0]
  const target = Math.max(Number(seq.last_value), Number(used.n))
  await client.query('select setval($1::regclass, $2, $3)',
    ['private.proposal_reference_seq', target, target === Number(seq.last_value) ? seq.is_called : true])
  const after = (await client.query('select last_value from private.proposal_reference_seq')).rows[0]
  console.log(`reference sequence ${seq.last_value} -> restored to ${after.last_value} (highest existing reference ${used.n})`)
  await client.end()
}
console.log(`\nTOTAL ${total} assertions, ${failed} failed (hosted, ${((Date.now() - started) / 1000).toFixed(1)} s)`)
process.exit(failed ? 1 : 0)
