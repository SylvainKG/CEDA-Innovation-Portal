// Concurrent submits (claim C-11, APP-03): two connections submit the same draft at the same time.
// Needs a real Postgres with the Supabase stack (two connections; PGlite has one), so it runs in CI
// against the disposable local stack, never against a hosted project:
//
//   LOCAL_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node concurrency.mjs
//
// The first connection submits inside an open transaction (holding the case's row lock); the second
// submits while that transaction is still open, so it must wait. Expected (migration 002/011):
//   same request key       -> the second call waits, then replays the same receipt; 1 case, 1 version
//   different request keys -> the second call waits, then is refused INVALID_STATE; 1 case, 1 version
import pg from 'pg'
import { randomUUID } from 'node:crypto'

const url = process.env.LOCAL_DB_URL
if (!url || !/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
  console.error('Set LOCAL_DB_URL to the LOCAL stack (it creates cases): postgresql://postgres:postgres@127.0.0.1:54322/postgres')
  process.exit(2)
}
const APPLICANT = '00000000-0000-4000-8000-0000000000a1' // seed: Applicant A (verified, consented)
const CHALLENGE = '20000000-0000-4000-8000-000000000001' // seed: Water-Smart (open)
const FORM = {
  applicant_name: 'Concurrency test (DEMO)', contact_email: 'demo@example.test', title: 'Concurrent submit test (DEMO)',
  summary: 'Fictional test idea (DEMO).', sector: 'Crops', problem: 'Fictional problem (DEMO).',
  solution: 'Fictional solution (DEMO).', impact: 'Fictional impact (DEMO).',
}

const admin = new pg.Client({ connectionString: url })
await admin.connect()
async function asApplicant() {
  const c = new pg.Client({ connectionString: url })
  await c.connect()
  await c.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: APPLICANT, role: 'authenticated' })])
  await c.query('set role authenticated')
  return c
}
const c1 = await asApplicant()
const c2 = await asApplicant()
const decl = (await admin.query(`select private.current_notice_version('declaration') v`)).rows[0].v
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function readyDraft() {
  const id = (await c1.query(`select public.save_draft($1::jsonb, null, $2) r`, [JSON.stringify(FORM), CHALLENGE])).rows[0].r.proposal_id
  const name = `${id}/${randomUUID()}.pdf`
  await c1.query(`insert into storage.objects (bucket_id, name, owner_id, metadata)
    values ('proposal-files', $1, $2, '{"size":2048,"mimetype":"application/pdf"}')`, [name, APPLICANT])
  await c1.query(`select public.register_attachment($1, $2, 'business-plan.pdf', 'business_plan')`, [id, name])
  return id
}
const submit = (c, id, key) => c.query(`select public.submit_proposal($1, $2, $3) r`, [id, key, decl]).then((x) => x.rows[0].r)

async function race(label, sameKey) {
  const id = await readyDraft()
  const k1 = randomUUID()
  const k2 = sameKey ? k1 : randomUUID()
  await c1.query('begin')
  const first = await submit(c1, id, k1) // holds the row lock until commit
  let settled = false
  const second = submit(c2, id, k2).then((r) => ({ ok: r }), (e) => ({ err: e })).finally(() => { settled = true })
  await sleep(700)
  const waited = !settled // the second call must still be blocked behind the open transaction
  await c1.query('commit')
  const out = await second
  const counts = (await admin.query(`select (select count(*) from public.proposal_versions where proposal_id = $1)::int versions,
      (select count(*) from public.proposals where id = $1 and reference is not null)::int submitted,
      (select reference from public.proposals where id = $1) reference`, [id])).rows[0]
  let pass, observed
  if (sameKey) {
    pass = waited && out.ok?.replayed === true && first.replayed === false && out.ok.reference === first.reference
      && counts.versions === 1 && counts.submitted === 1
    observed = `waited=${waited}; first ${first.reference} replayed=${first.replayed}; second ${out.ok?.reference ?? out.err?.message} replayed=${out.ok?.replayed}`
  } else {
    pass = waited && out.err?.message === 'INVALID_STATE' && counts.versions === 1 && counts.submitted === 1
    observed = `waited=${waited}; first ${first.reference}; second ${out.err ? `${out.err.code} ${out.err.message}` : 'ACCEPTED'}`
  }
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}: ${observed}; ${counts.versions} version, ${counts.submitted} submitted case (${counts.reference})`)
  return pass
}

let ok = true
try {
  ok = (await race('same request key, two connections at once', true)) && ok
  ok = (await race('different request keys, two connections at once', false)) && ok
} finally {
  await Promise.all([c1.end(), c2.end(), admin.end()])
}
console.log(ok ? 'RESULT PASSED' : 'RESULT FAILED')
process.exit(ok ? 0 : 1)
