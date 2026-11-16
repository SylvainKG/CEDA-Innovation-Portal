// email-relay — NTF-02. The single retry owner for public.email_outbox.
//
// Invoked on a schedule (or manually) with header `x-relay-secret: <RELAY_SECRET>`.
// 1. Claims due rows (claim_outbox_batch: leased, so a crash never loses a row).
// 2. Sends each through SMTP with a timeout.
// 3. Records what was observed (record_outbox_result), BCR-001 B4:
//      accepted        the SMTP server accepted the message (not "delivered")
//      rejected        permanent failure (5xx)
//      retryable       temporary failure before the message was handed over (4xx, connection refused)
//      unknown_outcome timeout or dropped connection after sending started; retried (at-least-once)
// If SMTP is not configured, nothing is claimed and rows stay `pending`: the admin
// outbox viewer then labels email as Simulated (blueprint NTF-02).
//
// Emails never contain proposal content: only the reference, status and a link.
// Logs carry outcome codes and row ids only.
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const SEND_TIMEOUT_MS = 15000
const BATCH = 10

const env = (k: string) => Deno.env.get(k) ?? ''
const SUPABASE_URL = env('SUPABASE_URL')
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
const RELAY_SECRET = env('RELAY_SECRET')
const PORTAL_URL = env('PORTAL_URL').replace(/\/$/, '')
const SMTP = {
  host: env('SMTP_HOST'),
  port: Number(env('SMTP_PORT') || '587'),
  user: env('SMTP_USER'),
  pass: env('SMTP_PASSWORD'),
  from: env('SMTP_FROM'),
}

type Row = { id: string; template: string; payload: Record<string, unknown>; to_email: string; attempts: number }
type Outcome = 'accepted' | 'rejected' | 'retryable' | 'unknown_outcome'

const DEMO_NOTE = '\n\nThis is a demonstration portal with fictional data.'

function render(row: Row): { subject: string; text: string } {
  const ref = String(row.payload.reference ?? 'your idea')
  const link = PORTAL_URL ? `\n\nOpen the portal: ${PORTAL_URL}` : ''
  const t: Record<string, { subject: string; text: string }> = {
    proposal_submitted: { subject: `Idea received: ${ref}`, text: `Your idea was received. Reference ${ref}.` },
    case_under_review: { subject: `${ref} is under review`, text: `${ref} passed screening and is now being reviewed.` },
    case_closed: { subject: `Update on ${ref}`, text: `${ref} was not taken forward. Sign in to see the reason.` },
    assignment_created: { subject: `New case to review: ${ref}`, text: `${ref} has been assigned to you. Declare any conflict before opening it.` },
    feedback_requested: {
      subject: `Action required: ${ref}`,
      text: `CEDA has ${row.payload.kind === 'revision' ? 'asked you to revise your idea' : 'a question about your idea'} (${ref}). Sign in to respond.`,
    },
    proposal_revised: { subject: `Version ${row.payload.version_no ?? ''} received: ${ref}`, text: `Your revised idea was received. Reference ${ref}.` },
    // The outcome is not put in the email: the applicant reads it after signing in.
    decision_published: { subject: `Decision on ${ref}`, text: `A decision on ${ref} has been published. Sign in to read it.` },
    award_recorded: { subject: `Award recorded: ${ref}`, text: `An award has been recorded for ${ref}. Sign in for details.` },
  }
  const m = t[row.template] ?? { subject: `Update on ${ref}`, text: `There is an update on ${ref}. Sign in to see it.` }
  return { subject: `[DEMO] ${m.subject}`, text: m.text + link + DEMO_NOTE }
}

function classify(err: unknown): Outcome {
  const e = err as { responseCode?: number; code?: string; command?: string }
  if (typeof e?.responseCode === 'number') return e.responseCode >= 500 ? 'rejected' : 'retryable'
  // Failed before any message data was sent: safe to retry.
  if (e?.code === 'ECONNREFUSED' || e?.code === 'EDNS' || e?.command === 'CONN') return 'retryable'
  // Timeout or dropped connection mid-send: the server may have accepted it.
  return 'unknown_outcome'
}

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const log = (outcome: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ fn: 'email-relay', outcome, ...extra }))

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  if (!safeEqual(req.headers.get('x-relay-secret') ?? '', RELAY_SECRET)) {
    log('UNAUTHORISED')
    return Response.json({ code: 'FORBIDDEN' }, { status: 403 })
  }
  if (!SMTP.host || !SMTP.from) {
    log('SKIPPED_NO_SMTP')
    return Response.json({ skipped: true, reason: 'SMTP not configured; email is Simulated' })
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: rows, error } = await db.rpc('claim_outbox_batch', { p_limit: BATCH })
  if (error) {
    log('CLAIM_FAILED')
    return Response.json({ code: 'UNAVAILABLE' }, { status: 503 })
  }

  const transport = nodemailer.createTransport({
    host: SMTP.host,
    port: SMTP.port,
    secure: SMTP.port === 465,
    auth: SMTP.user ? { user: SMTP.user, pass: SMTP.pass } : undefined,
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  })

  const counts: Record<Outcome, number> = { accepted: 0, rejected: 0, retryable: 0, unknown_outcome: 0 }
  for (const row of (rows ?? []) as Row[]) {
    let outcome: Outcome
    let providerId: string | null = null
    let errorText: string | null = null
    if (!row.to_email) {
      outcome = 'rejected'
      errorText = 'No email address on the profile'
    } else {
      try {
        const { subject, text } = render(row)
        const info = await transport.sendMail({ from: SMTP.from, to: row.to_email, subject, text })
        outcome = 'accepted'
        providerId = info?.messageId ?? null
      } catch (err) {
        outcome = classify(err)
        errorText = String((err as Error)?.message ?? 'send failed').slice(0, 300)
      }
    }
    const { error: recErr } = await db.rpc('record_outbox_result', {
      p_id: row.id, p_outcome: outcome, p_provider_message_id: providerId, p_error: errorText,
    })
    // If recording fails the lease expires and the row is retried later (at-least-once).
    log(recErr ? 'RECORD_FAILED' : outcome, { outbox_id: row.id, attempt: row.attempts })
    counts[outcome]++
  }
  return Response.json({ processed: (rows ?? []).length, ...counts })
})
