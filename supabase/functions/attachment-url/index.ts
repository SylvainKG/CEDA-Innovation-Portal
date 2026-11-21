// attachment-url — APP-02, N2, N3, N10.
//
// POST { "attachment_id": "<uuid>" } with the user's access token.
// 1. Asks the database, *as the user*, whether they may read the file
//    (public.authorize_attachment_download: RLS rules + audit row).
// 2. Only then signs a 60-second download URL with the service role.
// Browsers cannot sign URLs themselves: proposal-files has no SELECT policy.
//
// Logs carry outcome codes only: no tokens, paths, file names or proposal content.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SIGNED_URL_SECONDS = 60
const REMOTE_TIMEOUT_MS = 8000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Comma-separated list of allowed browser origins; unset means same-origin callers only.
const ALLOWED_ORIGINS = (Deno.env.get('APP_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

const timedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS) })

function corsHeaders(origin: string | null): Record<string, string> {
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
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  })
}

function log(outcome: string, requestId: string | null, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn: 'attachment-url', outcome, request_id: requestId, ...extra }))
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const requestId = req.headers.get('x-request-id')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return reply(405, { code: 'METHOD_NOT_ALLOWED' }, origin)

  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    log('UNAUTHENTICATED', requestId)
    return reply(401, { code: 'UNAUTHENTICATED' }, origin)
  }

  let attachmentId: unknown
  try {
    attachmentId = (await req.json())?.attachment_id
  } catch {
    attachmentId = undefined
  }
  if (typeof attachmentId !== 'string' || !UUID.test(attachmentId)) {
    return reply(422, { code: 'VALIDATION', message: 'attachment_id must be a UUID' }, origin)
  }

  // Step 1: decide before disclosing — as the caller, never as the service role.
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization }, fetch: timedFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: grant, error: denied } = await asUser.rpc('authorize_attachment_download', {
    p_attachment_id: attachmentId,
  })
  if (denied || !grant?.storage_path) {
    const code = denied?.message === 'FORBIDDEN' ? 'FORBIDDEN' : 'UNAVAILABLE'
    log(code, requestId)
    // Same answer whether the file is missing or not yours.
    return code === 'FORBIDDEN'
      ? reply(403, { code: 'FORBIDDEN', message: "You don't have access to this file." }, origin)
      : reply(503, { code: 'UNAVAILABLE', message: 'Try again in a moment.' }, origin)
  }

  // Step 2: sign for 60 seconds, download only.
  const asService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { fetch: timedFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signed, error: signError } = await asService.storage
    .from('proposal-files')
    .createSignedUrl(grant.storage_path, SIGNED_URL_SECONDS, { download: grant.filename })
  if (signError || !signed?.signedUrl) {
    log('SIGN_FAILED', requestId)
    return reply(503, { code: 'UNAVAILABLE', message: 'Try again in a moment.' }, origin)
  }

  log('OK', requestId)
  return reply(200, { url: signed.signedUrl, expires_in: SIGNED_URL_SECONDS, filename: grant.filename }, origin)
})
