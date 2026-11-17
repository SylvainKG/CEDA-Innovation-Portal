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
const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(here, '../../supabase/tests/database')
const filter = process.argv[2] ?? ''
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql') && f.includes(filter)).sort()

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
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
  await client.query('select setval($1::regclass, $2, $3)', ['private.proposal_reference_seq', seq.last_value, seq.is_called])
  const after = (await client.query('select last_value from private.proposal_reference_seq')).rows[0]
  console.log(`reference sequence ${seq.last_value} -> restored to ${after.last_value}`)
  await client.end()
}
console.log(`\nTOTAL ${total} assertions, ${failed} failed (hosted, ${((Date.now() - started) / 1000).toFixed(1)} s)`)
process.exit(failed ? 1 : 0)
