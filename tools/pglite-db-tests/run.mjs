// Local stand-in runner for machines without Docker.
// Loads a minimal Supabase platform stub, then supabase/migrations/*.sql in order,
// then supabase/seed.sql, then runs every supabase/tests/database/*.sql pgTAP file,
// all inside PGlite (Postgres compiled to WebAssembly).
//
// This is NOT the Supabase stack: Auth, Storage, PostgREST and Realtime are stubbed.
// The authoritative check is `supabase test db` (CI stage 3). See README.md.
//
// Usage:  npm test             all test files
//         npm test -- 002      only files whose name contains "002"
//         MUTATE="<sql>" npm test   apply extra SQL after the seed (mutation checks)
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pgtap } from '@electric-sql/pglite-pgtap'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const only = process.argv[2]

const db = new PGlite({ extensions: { pgcrypto, pgtap } })

async function load(label, sql) {
  try {
    await db.exec(sql)
    console.log(`ok   ${label}`)
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message}${e.hint ? ' | hint: ' + e.hint : ''}${e.where ? '\n  where: ' + e.where : ''}`)
    process.exit(1)
  }
}

await load('platform stub', fs.readFileSync(path.join(here, 'supabase-stub.sql'), 'utf8'))
const migrations = path.join(root, 'supabase/migrations')
for (const f of fs.readdirSync(migrations).filter((f) => f.endsWith('.sql')).sort()) {
  await load(f, fs.readFileSync(path.join(migrations, f), 'utf8'))
}
await load('seed.sql', fs.readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8'))
if (process.env.MUTATE) await load('MUTATION', process.env.MUTATE)

const testDir = path.join(root, 'supabase/tests/database')
let failed = 0
let total = 0
for (const f of fs.readdirSync(testDir).filter((f) => f.endsWith('.sql')).sort()) {
  if (only && !f.includes(only)) continue
  let results
  try {
    results = await db.exec(fs.readFileSync(path.join(testDir, f), 'utf8'))
  } catch (e) {
    console.log(`FAIL ${f}: ${e.message} ${e.hint || ''}${e.where ? '\n  where: ' + e.where : ''}`)
    failed++
    try { await db.exec('rollback') } catch {}
    continue
  }
  const lines = results
    .flatMap((r) => r.rows.map((row) => Object.values(row)[0]))
    .filter((v) => typeof v === 'string')
    .flatMap((v) => v.split('\n'))
  const bad = lines.filter((l) => l.startsWith('not ok') || /Looks like you planned/.test(l))
  const good = lines.filter((l) => /^ok /.test(l))
  total += good.length + bad.length
  failed += bad.length
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${f}: ${good.length} passed, ${bad.length} failed`)
  for (const l of lines) if (l.startsWith('not ok') || l.startsWith('#')) console.log('     ' + l)
}
console.log(`\nTOTAL ${total} assertions, ${failed} failed`)
process.exit(failed ? 1 : 0)
