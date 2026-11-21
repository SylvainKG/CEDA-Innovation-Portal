import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Banner, Button, TextField } from '@/components'
import { api, apiMode } from '@/lib/api'
import type { AuthRefusal, Role } from '@/lib/api/types'
import { MOCK_ROLE_OPTIONS } from '@/lib/api/mock/session'
import { safeNextPath } from '@/lib/safe-redirect'
import { useAdoptSession, useSwitchDemoRole } from '@/lib/session'
import { homeFor } from '@/navigation/nav-config'
import { roleLabel } from '@/navigation/role-labels'
import { AuthCard, FormErrorSummary, type FieldError } from './auth-ui'
import { isEmail, REFUSAL_TEXT } from './auth-text'

/**
 * The demo accounts the picker offers (#100 decision 1; D-17): the seven accounts of the main journey, by
 * role. The picker fills in the email address only. No password is ever in the site: judges type the one
 * given with the submission.
 */
const DEMO_ACCOUNTS: readonly { label: string; email: string }[] = [
  { label: 'Demo Applicant A', email: 'applicant.a@demo.ceda-portal.test' },
  { label: 'Screening officer', email: 'screening@demo.ceda-portal.test' },
  { label: 'Reviewer 1', email: 'reviewer.1@demo.ceda-portal.test' },
  { label: 'Adjudicator', email: 'adjudicator@demo.ceda-portal.test' },
  { label: 'Administrator', email: 'admin@demo.ceda-portal.test' },
  { label: 'Support consultant', email: 'consultant@demo.ceda-portal.test' },
  { label: 'Committee member (external)', email: 'committee.ext@demo.ceda-portal.test' },
]

/** T02 Sign in (spec T02; laid out to Sandra's sign-in frame, 21 Nov, #100). */
export function SignInPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const adopt = useAdoptSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldError[]>([])
  const [refusal, setRefusal] = useState<AuthRefusal | null>(null)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState<'idle' | 'sent' | AuthRefusal>('idle')
  const next = safeNextPath(params.get('next'))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found: FieldError[] = []
    if (!email.trim()) found.push({ id: 'signin-email', message: 'Enter your email address' })
    else if (!isEmail(email)) found.push({ id: 'signin-email', message: 'Enter an email address like name@example.com' })
    if (!password) found.push({ id: 'signin-password', message: 'Enter your password' })
    setErrors(found)
    setRefusal(null)
    if (found.length > 0) return
    setBusy(true)
    const outcome = await api.session.signIn({ email, password })
    setBusy(false)
    if (outcome.kind === 'refused') {
      setRefusal(outcome.reason)
      setPassword('')
      return
    }
    await adopt(outcome.data)
    const target = next ?? homeFor(outcome.data.roles)
    // D-07: staff whose roles need a second step go through it first; the server withholds their access until then.
    if (outcome.data.roles.some((r) => r !== 'applicant')) {
      const mfa = await api.mfa.status().catch(() => null)
      if (mfa?.required) {
        navigate(`/auth/mfa?next=${encodeURIComponent(target)}`)
        return
      }
    }
    navigate(target)
  }

  async function resend() {
    const outcome = await api.session.resendVerification(email)
    setResent(outcome.kind === 'ok' ? 'sent' : outcome.reason)
  }

  /** Demo picker: fill in the email only, then let the person type the password. Never submits by itself. */
  function pickDemoAccount(address: string) {
    setEmail(address)
    setErrors([])
    setRefusal(null)
    document.getElementById('signin-password')?.focus()
  }

  // The frame shows a refused sign-in in the same "There is a problem" box as a missing field. Wrong
  // credentials link to the email field to try again; an unverified address keeps its own banner below.
  const problems: FieldError[] =
    refusal && refusal !== 'email_not_confirmed'
      ? [{ id: refusal === 'invalid_credentials' ? 'signin-email' : undefined, message: REFUSAL_TEXT[refusal] }]
      : errors

  return (
    <div className="flex flex-col gap-6 py-6">
      <AuthCard title="Sign in" intro="Access your ideas or staff workspace.">
        {params.get('verified') === '1' ? <Banner kind="success">Your email is verified. Sign in to continue.</Banner> : null}
        {params.get('reset') === '1' ? <Banner kind="success">Your password was changed. Sign in with the new one.</Banner> : null}
        <FormErrorSummary errors={problems} />
        {refusal === 'email_not_confirmed' ? (
          <Banner
            kind="action"
            title="Verify your email address"
            action={
              <Button variant="secondary" size="sm" onClick={() => void resend()} disabled={resent === 'sent'}>
                Resend the link
              </Button>
            }
          >
            {resent === 'sent'
              ? 'We sent a new link. Check your inbox and spam folder.'
              : resent !== 'idle'
                ? REFUSAL_TEXT[resent]
                : 'Open the link we sent when you registered, then sign in.'}
          </Banner>
        ) : null}
        <Banner kind="demo">Demo accounts are available: choose one below to fill in its email address.</Banner>
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <TextField
            id="signin-email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.find((e) => e.id === 'signin-email')?.message}
          />
          <TextField
            id="signin-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.find((e) => e.id === 'signin-password')?.message}
          />
          <p className="-mt-3 text-right">
            <Link to="/auth/forgot" className="inline-flex min-h-touch items-center">Forgot password?</Link>
          </p>
          <Button type="submit" loading={busy} loadingLabel="Signing in…" className="w-full">
            Sign in
          </Button>
        </form>
        <p className="text-center">
          New to the portal? <Link to="/auth/register" className="inline-flex min-h-touch items-center">Register</Link>
        </p>
        <DemoAccountPicker onPick={pickDemoAccount} />
      </AuthCard>
      {apiMode === 'mock' ? <MockSessionPicker next={next} /> : null}
    </div>
  )
}

/** "Choose a demo portal" (Sandra's frame): one row per demo account; choosing one fills in its email address. */
function DemoAccountPicker({ onPick }: { onPick: (email: string) => void }) {
  return (
    <section aria-labelledby="demo-accounts-heading" className="flex flex-col gap-2 border-t border-line pt-4">
      <h2 id="demo-accounts-heading" className="text-h3 font-semibold">
        Choose a demo portal
      </h2>
      <p id="demo-accounts-help" className="text-sm text-ink-muted">
        Demo environment only. Choosing an account fills in its email address; then type the demo password you were given.
      </p>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              aria-describedby="demo-accounts-help"
              onClick={() => onPick(account.email)}
              className="flex min-h-touch w-full items-center justify-between gap-2 px-2 text-left hover:bg-surface-sunken"
            >
              {account.label}
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Development only: preview a role without a backend. Clearly labelled; it is not authentication. */
function MockSessionPicker({ next }: { next: string | null }) {
  const navigate = useNavigate()
  const switchRole = useSwitchDemoRole()
  async function choose(role: Role) {
    const user = await switchRole.mutateAsync(role)
    navigate(next ?? homeFor(user?.roles ?? [role]))
  }
  return (
    <section aria-labelledby="mock-heading" className="mx-auto w-full max-w-[440px] rounded-md bg-demo-subtle p-4">
      <h2 id="mock-heading" className="text-h3 font-semibold text-demo">
        Mock session (development only)
      </h2>
      <p className="mb-3 text-sm text-ink">
        Preview a role with a fictional demo persona, or sign in above with a demo email such as applicant.a@demo.ceda-portal.test.
        This is not authentication and grants no access to data.
      </p>
      <div className="flex flex-wrap gap-2">
        {MOCK_ROLE_OPTIONS.map((r) => (
          <Button key={r} variant="secondary" size="sm" onClick={() => void choose(r)}>
            {roleLabel(r)}
          </Button>
        ))}
      </div>
    </section>
  )
}
