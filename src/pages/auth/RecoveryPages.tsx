import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner, Button, TextField } from '@/components'
import { api } from '@/lib/api'
import type { AuthRefusal } from '@/lib/api/types'
import { useSignOut } from '@/lib/session'
import { AuthCard, FormErrorSummary, type FieldError } from './auth-ui'
import { isEmail, PASSWORD_MIN, REFUSAL_TEXT, RESEND_WAIT_S } from './auth-text'


/** T02 Verify: "Check your email", with a resend link that waits 60 s between sends. */
export function VerifyEmailPage() {
  const location = useLocation()
  // Known only right after registering (navigation state). After a refresh, ask for it (Sandra's #47 review).
  const known = (location.state as { email?: string } | null)?.email
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState<string | undefined>()
  const email = known ?? typed.trim()
  // Right after registering a link was just sent, so the first resend waits; otherwise it may go at once.
  const [wait, setWait] = useState(known ? RESEND_WAIT_S : 0)
  const [status, setStatus] = useState<'idle' | 'sent' | AuthRefusal>('idle')

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((w) => w - 1), 1_000)
    return () => clearTimeout(t)
  }, [wait])

  async function resend() {
    if (!known) {
      if (!email) return setTypedError('Enter your email address')
      if (!isEmail(email)) return setTypedError('Enter an email address like name@example.com')
      setTypedError(undefined)
    }
    const outcome = await api.session.resendVerification(email)
    setStatus(outcome.kind === 'ok' ? 'sent' : outcome.reason)
    setWait(RESEND_WAIT_S)
  }

  return (
    <div className="py-6">
      <AuthCard title="Check your email">
        <p>
          We've sent a verification link to {known ? <strong>{known}</strong> : 'your email address'}. Open it, then sign in. It can
          take a few minutes; check your spam folder too.
        </p>
        <p className="text-sm text-ink-muted">
          Already have an account with this address? <Link to="/auth/sign-in">Sign in</Link> or{' '}
          <Link to="/auth/forgot">reset your password</Link>.
        </p>
        {status === 'sent' ? <Banner kind="success">We sent a new link.</Banner> : null}
        {status !== 'idle' && status !== 'sent' ? <Banner kind="error">{REFUSAL_TEXT[status]}</Banner> : null}
        {known ? null : (
          <TextField
            id="verify-email"
            label="Email address"
            type="email"
            autoComplete="email"
            help="Enter the address you registered with to get a new link."
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={typedError}
          />
        )}
        <Button variant="secondary" onClick={() => void resend()} disabled={wait > 0} disabledReason={`You can resend in ${wait} s`}>
          Resend the link
        </Button>
        <p>
          <Link to="/auth/sign-in">Go to sign in</Link>
        </p>
      </AuthCard>
    </div>
  )
}

/** T02 Forgot password: the same neutral answer whether or not an account exists. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldError[]>([])
  const [result, setResult] = useState<'idle' | 'sent' | AuthRefusal>('idle')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found: FieldError[] = []
    if (!email.trim()) found.push({ id: 'forgot-email', message: 'Enter your email address' })
    else if (!isEmail(email)) found.push({ id: 'forgot-email', message: 'Enter an email address like name@example.com' })
    setErrors(found)
    if (found.length > 0) return
    setBusy(true)
    const outcome = await api.session.requestPasswordReset(email)
    setBusy(false)
    setResult(outcome.kind === 'ok' ? 'sent' : outcome.reason)
  }

  return (
    <div className="py-6">
      <AuthCard title="Forgot your password?" intro="Enter your email address and we'll send you a link to choose a new password.">
        <FormErrorSummary errors={errors} />
        {result === 'sent' ? (
          <Banner kind="success">If an account exists for that email, we've sent a reset link.</Banner>
        ) : result !== 'idle' ? (
          <Banner kind="error">{REFUSAL_TEXT[result]}</Banner>
        ) : null}
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <TextField
            id="forgot-email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.find((e) => e.id === 'forgot-email')?.message}
          />
          <Button type="submit" loading={busy} loadingLabel="Sending…">
            Send the reset link
          </Button>
        </form>
        <p>
          <Link to="/auth/sign-in">Back to sign in</Link>
        </p>
      </AuthCard>
    </div>
  )
}

/**
 * T02 Reset password: opened from the email link, which gives a short recovery session. After the change the
 * person is signed out here and signs in again with the new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const signOut = useSignOut()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldError[]>([])
  const [refusal, setRefusal] = useState<AuthRefusal | null>(null)
  const [busy, setBusy] = useState(false)
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found: FieldError[] = []
    if ([...password].length < PASSWORD_MIN) found.push({ id: 'reset-password', message: `Use at least ${PASSWORD_MIN} characters for your password` })
    else if (confirm !== password) found.push({ id: 'reset-confirm', message: 'The two passwords do not match' })
    setErrors(found)
    setRefusal(null)
    if (found.length > 0) return
    setBusy(true)
    const outcome = await api.session.updatePassword(password)
    setBusy(false)
    if (outcome.kind === 'refused') {
      setRefusal(outcome.reason)
      return
    }
    await signOut.mutateAsync().catch(() => undefined)
    navigate('/auth/sign-in?reset=1')
  }

  return (
    <div className="py-6">
      <AuthCard title="Choose a new password">
        <FormErrorSummary errors={errors} />
        {refusal ? (
          <Banner kind="error" action={refusal === 'invalid_link' ? <Link to="/auth/forgot">Ask for a new link</Link> : undefined}>
            {REFUSAL_TEXT[refusal]}
          </Banner>
        ) : null}
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <TextField
            id="reset-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            help={`At least ${PASSWORD_MIN} characters. Don't reuse a password from another site.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errorFor('reset-password')}
          />
          <TextField
            id="reset-confirm"
            label="Confirm the new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errorFor('reset-confirm')}
          />
          <Button type="submit" loading={busy} loadingLabel="Saving…">
            Save the new password
          </Button>
        </form>
      </AuthCard>
    </div>
  )
}
