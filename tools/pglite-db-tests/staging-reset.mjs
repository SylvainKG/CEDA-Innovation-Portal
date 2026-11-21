// Snapshot and exact reset of the STAGING project around a test run that writes real data
// (for example the browser journey in issue #61), so the demo still starts at CEDA-2026-0009.
//
//   node --env-file=.env tools/pglite-db-tests/staging-reset.mjs snapshot <file-outside-the-repo>
//   ... run the tests ...
//   node --env-file=.env tools/pglite-db-tests/staging-reset.mjs reset <same-file> --confirm
//
// snapshot  Read-only, one consistent view (repeatable read): every `public` table in Postgres's row
//           text form with its primary keys, the case-reference sequence, and the Storage object names.
// reset     Removes every row and Storage object that is NOT in the snapshot, inside ONE transaction:
//           the protective triggers (append-only, guards) are paused, the extra rows deleted, the
//           sequence restored and the triggers re-enabled; then every table is compared row by row
//           with the snapshot and the transaction COMMITS only if all are identical (otherwise it
//           rolls back and nothing changes). Rows that existed in the snapshot are never touched, so
//           a change made by the system in between (for example a scheduled expiry) makes it roll back
//           rather than overwrite. Extra Storage objects are then removed through the Storage API.
//
// Needs SUPABASE_DB_URL and SUPABASE_CA_CERT (as run-hosted.mjs); for files also SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (the legacy JWT service-role key: the Storage API refuses the newer
// sb_secret_ key as a bearer token). Keep the snapshot outside the repo (it holds account e-mails)
// and delete it afterwards.
//
// Rules: staging only. Never against the judging project after code freeze (22 Nov 2026, 18:00 CAT).
// Enforced, not only written down:
//   * STAGING_PROJECT_REF is required and must match the project in SUPABASE_DB_URL (and SUPABASE_URL
//     if set); a ref listed in JUDGING_PROJECT_REFS (comma-separated) is refused outright;
//   * `reset` refuses after code freeze unless `--after-freeze-override` is given, which is logged.
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const [mode, file] = args
const flag = args.includes('--confirm') ? '--confirm' : undefined
const overrideFreeze = args.includes('--after-freeze-override')
const CODE_FREEZE = new Date('2026-11-22T16:00:00Z') // 22 Nov 2026, 18:00 CAT
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
if (!['snapshot', 'reset'].includes(mode) || !file) {
  console.error('usage: staging-reset.mjs snapshot <file> | reset <file> --confirm')
  process.exit(2)
}
if (path.resolve(file).startsWith(root + path.sep)) {
  console.error('Keep the snapshot outside the repository (it holds account e-mails).')
  process.exit(2)
}
const { SUPABASE_DB_URL: url, SUPABASE_CA_CERT: caPath } = process.env
if (!url || !caPath || !fs.existsSync(caPath)) {
  console.error('Set SUPABASE_DB_URL and SUPABASE_CA_CERT (see run-hosted.mjs).')
  process.exit(2)
}
// Which project this is: pooler URLs carry it in the user name (postgres.<ref>), direct URLs in the host (db.<ref>.supabase.co).
const ref = process.env.STAGING_PROJECT_REF?.trim()
const urlRef = (url.match(/\/\/postgres\.([a-z0-9]+)[:@]/) ?? url.match(/@db\.([a-z0-9]+)\.supabase\.co/))?.[1]
const apiRef = process.env.SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
const judging = (process.env.JUDGING_PROJECT_REFS ?? '').split(',').map((r) => r.trim()).filter(Boolean)
if (!ref) {
  console.error('Set STAGING_PROJECT_REF to the staging project ref; this tool refuses to guess which project it is on.')
  process.exit(2)
}
if (urlRef !== ref || (process.env.SUPABASE_URL && apiRef !== ref)) {
  console.error(`Project mismatch: STAGING_PROJECT_REF=${ref}, SUPABASE_DB_URL is ${urlRef ?? 'unknown'}, SUPABASE_URL is ${apiRef ?? 'not set'}.`)
  process.exit(2)
}
if (judging.includes(ref)) {
  console.error(`${ref} is listed in JUDGING_PROJECT_REFS: this tool never runs against the judging project.`)
  process.exit(2)
}
if (mode === 'reset' && new Date() >= CODE_FREEZE) {
  if (!overrideFreeze) {
    console.error('Code freeze (22 Nov 2026, 18:00 CAT) has passed: reset refuses. Add --after-freeze-override only if this is certainly not the judging project.')
    process.exit(2)
  }
  console.log(`AFTER-FREEZE OVERRIDE used at ${new Date().toISOString()} on project ${ref}: record this in the run record.`)
}
console.log(`project ${ref} (staging)`)
const db = new pg.Client({ connectionString: url, ssl: { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true } })
await db.connect()
const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

async function tableInfo() {
  const tables = (await db.query(`select table_name::text t from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`)).rows.map((r) => r.t)
  const pks = {}
  for (const r of (await db.query(`select c.conrelid::regclass::text t, array_agg(a.attname::text order by a.attnum) cols
      from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.contype = 'p' and c.connamespace = 'public'::regnamespace group by 1`)).rows) {
    pks[r.t.replace(/^public\./, '')] = r.cols
  }
  return { tables, pks }
}
const keyExpr = (pks, t) => `(${pks[t].map((c) => `x."${c}"::text`).join(` || '|' || `)})`
const rowsOf = async (t) => (await db.query(`select coalesce(array_agg(x::text), '{}') r from public."${t}" x`)).rows[0].r.sort(byCode)
const filesNow = async () => (await db.query(`select bucket_id || '/' || name f from storage.objects order by 1`)).rows.map((r) => r.f)

if (mode === 'snapshot') {
  await db.query('begin isolation level repeatable read read only')
  const { tables, pks } = await tableInfo()
  const snap = { at: new Date().toISOString(), tables: {}, pks, seq: null, files: [] }
  for (const t of tables) {
    const keys = (await db.query(`select coalesce(array_agg(${keyExpr(pks, t)}), '{}') k from public."${t}" x`)).rows[0].k
    snap.tables[t] = { rows: await rowsOf(t), keys }
  }
  snap.seq = (await db.query(`select last_value::int, is_called from private.proposal_reference_seq`)).rows[0]
  snap.files = await filesNow()
  await db.query('commit')
  fs.writeFileSync(file, JSON.stringify(snap))
  const n = Object.values(snap.tables).reduce((a, t) => a + t.rows.length, 0)
  console.log(`snapshot ${snap.at}: ${tables.length} tables, ${n} rows, sequence ${snap.seq.last_value}, ${snap.files.length} storage objects -> ${file}`)
}

if (mode === 'reset') {
  if (flag !== '--confirm') {
    console.error('reset changes the hosted database: add --confirm.')
    process.exit(2)
  }
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'))
  const { tables, pks } = await tableInfo()
  const extra = {}
  for (const t of tables) {
    const n = Number((await db.query(`select count(*) n from public."${t}" x where not (${keyExpr(pks, t)} = any($1::text[]))`,
      [snap.tables[t]?.keys ?? []])).rows[0].n)
    if (n) extra[t] = n
  }
  const seqNow = (await db.query(`select last_value::int v from private.proposal_reference_seq`)).rows[0].v
  console.log(`rows not in the snapshot: ${JSON.stringify(extra)}; sequence ${seqNow} (snapshot ${snap.seq.last_value})`)

  if (Object.keys(extra).length || seqNow !== snap.seq.last_value) {
    // Protective triggers are found by name. If a future one is named differently, it stays on, the
    // delete it blocks fails, and the whole reset rolls back: safe, but it would need adding here.
    const guarded = (await db.query(`select tgrelid::regclass::text t, tgname from pg_trigger where not tgisinternal
        and tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
        and tgname ~ '(append_only|no_truncate|_guard|require_approval)$'`)).rows
    await db.query('begin')
    try {
      for (const g of guarded) await db.query(`alter table ${g.t} disable trigger "${g.tgname}"`)
      // Break the two reference cycles (case <-> version, version <-> feedback request) for removed rows only.
      await db.query(`update public.proposals x set current_version_id = null where not (${keyExpr(pks, 'proposals')} = any($1::text[]))`,
        [snap.tables.proposals.keys])
      await db.query(`update public.proposal_versions x set responds_to_feedback_id = null where not (${keyExpr(pks, 'proposal_versions')} = any($1::text[]))`,
        [snap.tables.proposal_versions.keys])
      let pending = Object.keys(extra)
      for (let round = 1; pending.length && round <= 12; round++) {
        const next = []
        for (const t of pending) {
          await db.query('savepoint s')
          try {
            await db.query(`delete from public."${t}" x where not (${keyExpr(pks, t)} = any($1::text[]))`, [snap.tables[t]?.keys ?? []])
            await db.query('release savepoint s')
          } catch (e) {
            await db.query('rollback to savepoint s')
            if (e.code !== '23503') throw e // only "still referenced" is retried in the next round
            next.push(t)
          }
        }
        pending = next
      }
      if (pending.length) throw new Error(`could not delete from: ${pending.join(', ')}`)
      await db.query(`select setval('private.proposal_reference_seq', $1, $2)`, [snap.seq.last_value, snap.seq.is_called])
      for (const g of guarded) await db.query(`alter table ${g.t} enable trigger "${g.tgname}"`)
      await verifyOrThrow(snap, tables)
      await db.query('commit')
      console.log(`database reset COMMITTED: ${tables.length} tables identical to the snapshot; ${guarded.length} triggers paused and re-enabled`)
    } catch (e) {
      await db.query('rollback')
      console.log(`database reset ROLLED BACK, nothing changed: ${e.message}`)
      await db.end()
      process.exit(1)
    }
  } else {
    await verifyOrThrow(snap, tables).catch((e) => { console.log(`NOT identical, and no extra rows to remove: ${e.message}`); process.exitCode = 1 })
    if (!process.exitCode) console.log(`nothing to remove: ${tables.length} tables already identical to the snapshot`)
  }

  const extraFiles = (await db.query(`select bucket_id, name from storage.objects order by 1, 2`)).rows
    .filter((f) => !snap.files.includes(`${f.bucket_id}/${f.name}`))
  if (extraFiles.length) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!process.env.SUPABASE_URL || !key) {
      console.log(`${extraFiles.length} storage objects to remove, but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set: remove them before relying on the reset`)
      process.exitCode = 1
    }
    for (const bucket of key ? [...new Set(extraFiles.map((f) => f.bucket_id))] : []) {
      const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: extraFiles.filter((f) => f.bucket_id === bucket).map((f) => f.name) }),
      })
      console.log(`storage ${bucket}: delete HTTP ${r.status}`)
    }
  }
  const files = await filesNow()
  const same = JSON.stringify(files) === JSON.stringify(snap.files)
  console.log(`storage objects: ${files.length} now, ${snap.files.length} in snapshot, identical: ${same}`)
  if (!same) process.exitCode = 1
}
await db.end()

async function verifyOrThrow(snap, tables) {
  const diffs = []
  for (const t of tables) {
    const now = await rowsOf(t)
    if (JSON.stringify(now) !== JSON.stringify(snap.tables[t]?.rows ?? [])) diffs.push(`${t} (${now.length} rows now, ${snap.tables[t]?.rows.length ?? 0} in snapshot)`)
  }
  const off = Number((await db.query(`select count(*) n from pg_trigger where not tgisinternal and tgenabled = 'D'
      and tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)`)).rows[0].n)
  if (diffs.length || off) throw new Error(`differs: ${diffs.join('; ') || 'none'}; disabled triggers: ${off}`)
}
