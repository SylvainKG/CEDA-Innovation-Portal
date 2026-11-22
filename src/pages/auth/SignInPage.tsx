import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
      </AuthCard>
      {apiMode === 'mock' ? <MockSessionPicker next={next} /> : null}
    </div>
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
