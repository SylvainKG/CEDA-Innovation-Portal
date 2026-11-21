// Restore drill (OPS-01, runbook §6) for a Supabase Free-plan project, without Docker.
//
//   node --env-file=.env tools/pglite-db-tests/restore-drill.mjs [backup-dir]
//
// 1. BACKUP  Read-only, one consistent snapshot (repeatable read) of every table in
//            `public`, the Auth accounts (no password hashes or tokens) and the case-
//            reference sequence, over a TLS-verified connection. Written as JSON to
//            backup-dir (default: the OS temp folder), never into the repository.
// 2. RESTORE Into a brand-new, empty Postgres (PGlite): the platform stub, then
//            supabase/migrations/*.sql from this checkout (no seed), then the backup.
// 3. VERIFY  Row counts per table equal the backup; no orphaned foreign keys; health();
//            the sequence matches; then every pgTAP suite runs against the restored data.
// It prints the recovery point (snapshot time) and the recovery time (restore + verify).
//
// Needs SUPABASE_DB_URL (session pooler) and SUPABASE_CA_CERT (see run-hosted.mjs).
// What it does not cover: Storage objects (files), which are not in database backups,
// and a restore into a real Supabase project (Auth, Storage, PostgREST services).
import pg from 'pg'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pgtap } from '@electric-sql/pglite-pgtap'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const url = process.env.SUPABASE_DB_URL
const caPath = process.env.SUPABASE_CA_CERT
if (!url || !caPath || !fs.existsSync(caPath)) {
  console.error('Set SUPABASE_DB_URL and SUPABASE_CA_CERT (CA certificate file; see run-hosted.mjs).')
  process.exit(2)
}
const outDir = path.resolve(process.argv[2] ?? os.tmpdir())
if (outDir.startsWith(root + path.sep) || outDir === root) {
  console.error('Write the backup outside the repository (it holds account e-mails).')
  process.exit(2)
}

// Auth columns kept: identity and confirmation state. No encrypted_password or tokens.
const AUTH_COLUMNS = ['instance_id', 'id', 'aud', 'role', 'email', 'email_confirmed_at', 'raw_app_meta_data',
  'raw_user_meta_data', 'created_at', 'updated_at', 'last_sign_in_at']

// ---------------------------------------------------------------- 1. backup
const src = new pg.Client({ connectionString: url, ssl: { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true } })
await src.connect()
const backup = { tables: {}, counts: {} }
try {
  await src.query('begin isolation level repeatable read read only')
  const meta = (await src.query(`select now() as snapshot_at,
      (select max(version) from supabase_migrations.schema_migrations) as migration,
      (select last_value from private.proposal_reference_seq) as ref_last,
      (select is_called from private.proposal_reference_seq) as ref_called`)).rows[0]
  backup.snapshot_at = meta.snapshot_at
  backup.migration = meta.migration
  backup.reference_seq = { last_value: Number(meta.ref_last), is_called: meta.ref_called }
  const tables = (await src.query(`select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`)).rows.map((r) => r.table_name)
  for (const t of tables) {
    // Each row in Postgres's own row text form, so every value round-trips exactly
    // (JSON would turn a stored JSON null into SQL NULL, for example).
    const r = await src.query(`select coalesce(array_agg(x::text), '{}') as rows from public."${t}" x`)
    backup.tables[t] = r.rows[0].rows
    backup.counts[t] = r.rows[0].rows.length
  }
  const users = await src.query(`select coalesce(json_agg(x), '[]'::json) as rows
      from (select ${AUTH_COLUMNS.join(', ')} from auth.users) x`)
  backup.auth_users = users.rows[0].rows
  await src.query('commit')
} finally {
  await src.end()
}
const file = path.join(outDir, `ceda-backup-${new Date(backup.snapshot_at).toISOString().replace(/[:.]/g, '-')}.json`)
fs.writeFileSync(file, JSON.stringify(backup))
const totalRows = Object.values(backup.counts).reduce((a, b) => a + b, 0)
console.log(`backup   snapshot ${new Date(backup.snapshot_at).toISOString()} · migration ${backup.migration} · ` +
  `${Object.keys(backup.tables).length} tables, ${totalRows} rows, ${backup.auth_users.length} accounts · ` +
  `${(fs.statSync(file).size / 1024).toFixed(0)} KB -> ${file}`)

// ---------------------------------------------------------------- 2. restore
const t0 = Date.now()
const db = new PGlite({ extensions: { pgcrypto, pgtap } })
await db.exec(fs.readFileSync(path.join(here, 'supabase-stub.sql'), 'utf8'))
const migDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()
for (const f of migrations) await db.exec(fs.readFileSync(path.join(migDir, f), 'utf8'))
const restoredTo = migrations.at(-1)

// Load with triggers and foreign-key triggers off (as pg_restore does for data), then check
// the foreign keys explicitly below. Append-only triggers refuse only changes, not inserts.
await db.exec(`set session_replication_role = replica`)
// The migrations insert their own reference rows (settings, roles, permissions, notices).
// The backup holds the live version of every row, so start the data from empty.
await db.exec(`truncate table ${Object.keys(backup.tables).map((t) => `public."${t}"`).join(', ')} restart identity cascade`)
await db.query(`insert into auth.users (${AUTH_COLUMNS.join(', ')})
  select ${AUTH_COLUMNS.join(', ')} from json_populate_recordset(null::auth.users, $1::json)`, [JSON.stringify(backup.auth_users)])
const identity = new Set((await db.query(`select table_name from information_schema.columns
  where table_schema = 'public' and is_identity = 'YES' and identity_generation = 'ALWAYS'`)).rows.map((r) => r.table_name))
for (const [t, rows] of Object.entries(backup.tables)) {
  if (!rows.length) continue
  await db.query(`insert into public."${t}" ${identity.has(t) ? 'overriding system value' : ''}
    select (r::public."${t}").* from unnest($1::text[]) r`, [rows])
}
await db.exec(`set session_replication_role = origin`)
await db.query(`select setval('private.proposal_reference_seq', $1, $2)`,
  [backup.reference_seq.last_value, backup.reference_seq.is_called])
for (const t of identity) {
  await db.exec(`select setval(pg_get_serial_sequence('public."${t}"', 'id'),
    greatest((select coalesce(max(id), 0) from public."${t}"), 1), (select count(*) > 0 from public."${t}"))`)
}
const restoredMs = Date.now() - t0

// Self-test of the verification (DRILL_SELFTEST=1): damage the restored copy on purpose;
// the drill must then report FAILED.
if (process.env.DRILL_SELFTEST === '1') {
  await db.exec(`set session_replication_role = replica`)
  await db.exec(`delete from public.app_settings where key = 'review_quorum'`)
  await db.exec(`set session_replication_role = origin`)
  console.log('SELFTEST removed app_settings.review_quorum from the restored copy')
}

// ---------------------------------------------------------------- 3. verify
const problems = []
for (const [t, n] of Object.entries(backup.counts)) {
  const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  const got = (await db.query(`select coalesce(array_agg(x::text), '{}') as rows from public."${t}" x`)).rows[0].rows.sort(byCode)
  if (got.length !== n) problems.push(`${t}: ${got.length} rows restored, ${n} in the backup`)
  else if (JSON.stringify(got) !== JSON.stringify([...backup.tables[t]].sort(byCode)))
    problems.push(`${t}: same row count, but the row contents differ`)
}
const fks = (await db.query(`select c.conname, c.conrelid::regclass::text as child, a.attname as col,
    c.confrelid::regclass::text as parent, fa.attname as pcol
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
  join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
  where c.contype = 'f' and n.nspname = 'public' and array_length(c.conkey, 1) = 1`)).rows
for (const fk of fks) {
  const orphans = Number((await db.query(`select count(*)::int as n from ${fk.child} ch
    where ch."${fk.col}" is not null and not exists (select 1 from ${fk.parent} p where p."${fk.pcol}" = ch."${fk.col}")`)).rows[0].n)
  if (orphans) problems.push(`${fk.conname}: ${orphans} orphaned rows`)
}
const health = (await db.query(`select public.health()::text as h`)).rows[0].h
const seqNow = (await db.query(`select last_value::int as v from private.proposal_reference_seq`)).rows[0].v
if (seqNow !== backup.reference_seq.last_value) problems.push(`reference sequence ${seqNow}, backup ${backup.reference_seq.last_value}`)
console.log(`restore  ${migrations.length} migrations (to ${restoredTo}) + data in ${(restoredMs / 1000).toFixed(1)} s · ` +
  `${Object.keys(backup.counts).length} tables compared row by row, ${fks.length} foreign keys checked · reference sequence ${seqNow}`)
console.log(`health   ${health}`)

const testDir = path.join(root, 'supabase/tests/database')
let total = 0
let failed = 0
for (const f of fs.readdirSync(testDir).filter((f) => f.endsWith('.sql')).sort()) {
  let results
  try {
    results = await db.exec(fs.readFileSync(path.join(testDir, f), 'utf8'))
  } catch (e) {
    problems.push(`${f}: ${e.message}`)
    try { await db.exec('rollback') } catch { /* already rolled back */ }
    continue
  }
  const lines = results.flatMap((r) => r.rows.map((row) => Object.values(row)[0]))
    .filter((v) => typeof v === 'string').flatMap((v) => v.split('\n'))
  const bad = lines.filter((l) => l.startsWith('not ok') || /Looks like you planned/.test(l))
  total += lines.filter((l) => /^ok /.test(l)).length + bad.length
  failed += bad.length
  if (bad.length) problems.push(`${f}: ${bad.join('; ')}`)
}
const rto = (Date.now() - t0) / 1000
console.log(`pgTAP    on the restored data: ${total} assertions, ${failed} failed`)
for (const p of problems) console.log(`PROBLEM  ${p}`)
console.log(`\nRESULT   ${problems.length ? 'FAILED' : 'PASSED'} · recovery point ${new Date(backup.snapshot_at).toISOString()} · ` +
  `recovery time ${rto.toFixed(1)} s (restore + verify, excluding the backup itself)`)
process.exit(problems.length ? 1 : 0)
