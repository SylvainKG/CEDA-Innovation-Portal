// invite-staff — IAM-01: the administrator invites staff by email and grants a role.
//
// POST { "email": string, "full_name": string, "role_key": string } with the admin's access token.
// 1. Checks, as the caller, that they hold role.manage (my_access).
// 2. Sends a Supabase Auth invite (service role). An existing account is not re-invited.
// 3. Grants the role by calling grant_role *as the caller*, so the database applies
//    the same rules and audit as the admin screen (no self-grant, N8).
// 4. A newly invited staff account loses the default applicant role.
//
// Logs carry outcome codes only: no emails, names or tokens.
import { createClient } from 'npm:@supabase/supabase-js@2'

const TIMEOUT_MS = 10000
const env = (k: string) => Deno.env.get(k) ?? ''
const SUPABASE_URL = env('SUPABASE_URL')
const ANON_KEY = env('SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
const PORTAL_URL = env('PORTAL_URL').replace(/\/$/, '')
const ALLOWED_ORIGINS = env('APP_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean)
const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,63}$/
const ROLE = /^[a-z][a-z0-9_]{1,40}$/

const timedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    ...(allow ? { 'Access-Control-Allow-Origin': allow, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function reply(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) },
  })
}

const log = (outcome: string) => console.log(JSON.stringify({ fn: 'invite-staff', outcome }))

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return reply(405, { code: 'METHOD_NOT_ALLOWED' }, origin)

  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return reply(401, { code: 'UNAUTHENTICATED' }, origin)

  let body: { email?: unknown; full_name?: unknown; role_key?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 200) : ''
  const roleKey = typeof body.role_key === 'string' ? body.role_key : ''
  const fields: Record<string, string> = {}
  if (!EMAIL.test(email)) fields.email = 'Enter a valid email address'
  if (!fullName) fields.full_name = 'Enter the person’s name'
  if (!ROLE.test(roleKey) || roleKey === 'applicant') fields.role_key = 'Choose a staff role'
  if (Object.keys(fields).length) return reply(422, { code: 'VALIDATION', fields }, origin)

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization }, fetch: timedFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const asService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { fetch: timedFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. Decide before acting: the caller must hold role.manage (MFA rule included).
  const { data: access, error: accessError } = await asUser.rpc('my_access')
  if (accessError || !access?.permissions?.includes('role.manage')) {
    log('FORBIDDEN')
    return reply(403, { code: 'FORBIDDEN', message: "You don't have access to this action." }, origin)
  }

  // 2. Invite, or find the existing account (the admin can read profiles through RLS).
  let userId: string | null = null
  let invited = false
  const { data: inv, error: invError } = await asService.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: PORTAL_URL || undefined,
  })
  if (!invError && inv?.user?.id) {
    userId = inv.user.id
    invited = true
  } else {
    const { data: existing } = await asUser.from('profiles').select('id').eq('email', email).maybeSingle()
    userId = existing?.id ?? null
  }
  if (!userId) {
    log('INVITE_FAILED')
    return reply(503, { code: 'UNAVAILABLE', message: 'The invitation could not be sent. Try again.' }, origin)
  }

  // 3. Grant through the database rules, as the admin.
  const { data: grant, error: grantError } = await asUser.rpc('grant_role', {
    p_user_id: userId, p_role_key: roleKey, p_reason: 'Staff invitation',
  })
  if (grantError) {
    log('GRANT_REFUSED')
    return reply(grantError.message === 'VALIDATION' ? 422 : 403,
      { code: grantError.message, message: grantError.hint || 'The role could not be granted.' }, origin)
  }
  if (grant?.ok === false) {
    log('GRANT_REFUSED')
    return reply(403, { code: grant.code, message: grant.message }, origin)
  }

  // 4. A brand-new staff account is not an applicant.
  if (invited) {
    await asUser.rpc('revoke_role', { p_user_id: userId, p_role_key: 'applicant', p_reason: 'Staff account (invited)' })
  }

  log(invited ? 'INVITED' : 'ROLE_ADDED_TO_EXISTING')
  return reply(200, { user_id: userId, invited, role_key: roleKey, already_had_role: grant?.already === true }, origin)
})
