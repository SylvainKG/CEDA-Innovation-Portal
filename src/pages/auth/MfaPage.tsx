import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Banner, Button, ButtonLink, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { MfaEnrolment } from '@/lib/api/mfa'
import { safeNextPath } from '@/lib/safe-redirect'
import { useSession } from '@/lib/session'
import { AuthCard } from './auth-ui'

const mfaKey = ['auth', 'mfa'] as const

/**
 * T02 two-step sign-in (D-07, IAM-02), Provisional UI built from the written spec (BCR-003; design review
 * pending). Staff enter the 6-digit code from an authenticator app (set it up first if needed). Seeded demo staff
 * accounts skip this and see "MFA not required for demo accounts". The server withholds staff permissions until
 * the session has passed this step; the screen is only the way through.
 */
export function MfaPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next')) ?? '/staff'
  const qc = useQueryClient()
  const { data: user, isPending: sessionPending } = useSession()
  const status = useQuery({ queryKey: mfaKey, queryFn: () => api.mfa.status(), enabled: Boolean(user) })
  const [enrolment, setEnrolment] = useState<MfaEnrolment | null>(null)
  const [enrolError, setEnrolError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (sessionPending || (user && status.isPending)) return <LoadingState what="your sign-in" />
  if (!user)
    return (
      <AuthCard title="Two-step sign-in">
        <p>Sign in first.</p>
        <ButtonLink to={`/auth/sign-in?next=${encodeURIComponent('/auth/mfa')}`}>Go to sign in</ButtonLink>
      </AuthCard>
    )
  if (status.isError || !status.data) return <ErrorState level="h1" message="We couldn't check your sign-in." onRetry={() => void status.refetch()} />
  const s = status.data

  if (!s.required)
    return (
      <AuthCard title="Two-step sign-in">
        {s.demoExempt ? <Banner kind="info">No authenticator code is needed for this account.</Banner> : <p>You&apos;re fully signed in. No code is needed.</p>}
        <ButtonLink to={next}>Continue</ButtonLink>
      </AuthCard>
    )

  async function startEnrol() {
    setEnrolError(null)
    try {
      setEnrolment(await api.mfa.enrol())
    } catch {
      setEnrolError("We couldn't start the set-up. Try again.")
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your app')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await api.mfa.verify({ factorId: enrolment?.factorId, code })
      if (r.kind === 'ok') {
        await qc.invalidateQueries()
        navigate(next)
        return
      }
      setError(r.kind === 'refused' ? (r.fields?.code ?? r.message ?? "That code didn't work") : "We couldn't confirm the code. Try the newest code.")
      setCode('')
    } catch {
      setError("We couldn't check the code. Try again with the newest code.")
    } finally {
      setBusy(false)
    }
  }

  const needsSetup = !s.enrolled && !enrolment
  return (
    <AuthCard title="Two-step sign-in">
      <p>Staff accounts need a second step. It protects applicants&apos; ideas if your password is ever stolen.</p>
      {needsSetup ? (
        <div className="flex flex-col gap-3">
          <p>Set up an authenticator app (for example on your phone) to get a new 6-digit code every 30 seconds.</p>
          {enrolError ? <Banner kind="error">{enrolError}</Banner> : null}
          <div>
            <Button onClick={() => void startEnrol()}>Set up my app</Button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
          {enrolment ? (
            <div className="flex flex-col gap-2">
              <p>Scan this code with your authenticator app, or type in the key below.</p>
              <img src={enrolment.qrCode} alt="QR code for your authenticator app" className="h-44 w-44 rounded-md bg-surface-card p-2" />
              <p className="text-sm">
                Key: <span className="break-all font-mono">{enrolment.secret}</span>
              </p>
            </div>
          ) : null}
          <TextField
            id="mfa-code"
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={error ?? undefined}
          />
          <div>
            <Button type="submit" loading={busy} loadingLabel="Checking…">
              Verify
            </Button>
          </div>
        </form>
      )}
      <p className="text-sm">
        Lost your phone? <Link to="/help/contacts">Contact the portal administrator</Link>.
      </p>
    </AuthCard>
  )
}
