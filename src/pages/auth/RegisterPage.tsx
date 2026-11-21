import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle } from 'lucide-react'
import { Banner, Button, PlainMarkdown, SampleLabel, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AuthRefusal } from '@/lib/api/types'
import { AuthCard, FormErrorSummary, type FieldError } from './auth-ui'
import { isEmail, PASSWORD_MIN, REFUSAL_TEXT } from './auth-text'

/**
 * T02 Register, "Create your account" (spec T02, IAM-02; laid out to Sandra's create-account frame, 21 Nov,
 * #100). Everyone who registers is an applicant; staff roles are granted by an administrator. Consent is
 * recorded with the privacy notice version by the server (handle_new_user), only if it is the current version,
 * so the full notice stays one tap away from the compact summary.
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const notice = useQuery({ queryKey: ['privacy-notice'], queryFn: () => api.session.getPrivacyNotice(), staleTime: 5 * 60_000 })
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [refusal, setRefusal] = useState<AuthRefusal | null>(null)
  const [busy, setBusy] = useState(false)
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message
  const longEnough = [...password].length >= PASSWORD_MIN

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found: FieldError[] = []
    if (!fullName.trim()) found.push({ id: 'reg-name', message: 'Enter your full name' })
    if (!email.trim()) found.push({ id: 'reg-email', message: 'Enter your email address' })
    else if (!isEmail(email)) found.push({ id: 'reg-email', message: 'Enter an email address like name@example.com' })
    if ([...password].length < PASSWORD_MIN) found.push({ id: 'reg-password', message: `Use at least ${PASSWORD_MIN} characters for your password` })
    if (!consent) found.push({ id: 'reg-consent', message: 'Accept the privacy notice to register' })
    setErrors(found)
    setRefusal(null)
    if (found.length > 0 || !notice.data) return
    setBusy(true)
    const outcome = await api.session.register({ fullName, email, organisation, password, consentVersion: notice.data.version })
    setBusy(false)
    if (outcome.kind === 'refused') {
      setRefusal(outcome.reason)
      return
    }
    // The address goes in navigation state, never in the URL (it would end up in history and logs).
    navigate('/auth/verify', { state: { email: email.trim() } })
  }

  return (
    <div className="py-6">
      <AuthCard title="Create your account" intro="Register to submit and track ideas.">
        <FormErrorSummary errors={errors} />
        {refusal ? <Banner kind="error">{REFUSAL_TEXT[refusal]}</Banner> : null}
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <TextField id="reg-name" label="Full name" autoComplete="name" required maxLength={200} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errorFor('reg-name')} />
          <TextField id="reg-email" label="Email address" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} error={errorFor('reg-email')} />
          <TextField
            id="reg-org"
            label="Organisation (optional)"
            autoComplete="organization"
            maxLength={200}
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
          />
          <TextField
            id="reg-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errorFor('reg-password')}
            aria-describedby={['reg-password-rules', errorFor('reg-password') ? 'reg-password-error' : null].filter(Boolean).join(' ')}
          />
          {/* Spec T02: the rules are shown in advance; the frame ticks each one off as the person types. */}
          <div id="reg-password-rules" className="-mt-2 flex flex-col gap-1 rounded-md bg-surface-sunken p-3 text-sm">
            <p className="font-semibold">Your password must have:</p>
            <p className={longEnough ? 'flex items-center gap-2 text-success' : 'flex items-center gap-2 text-ink-muted'}>
              {longEnough ? <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0" /> : <Circle aria-hidden className="h-4 w-4 shrink-0" />}
              <span>
                At least {PASSWORD_MIN} characters
                <span className="sr-only" aria-live="polite">
                  {longEnough ? ': done' : ': not yet'}
                </span>
              </span>
            </p>
          </div>

          <section aria-labelledby="privacy-heading" className="flex flex-col gap-2 rounded-md bg-surface-sunken p-4">
            {notice.isPending ? (
              <LoadingState what="the privacy notice" lines={2} />
            ) : notice.isError || !notice.data ? (
              <ErrorState level="h2" message="We couldn't load the privacy notice. You need it to register." onRetry={() => void notice.refetch()} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="privacy-heading" className="text-h3 font-semibold">
                    How we use your information
                  </h2>
                  {notice.data.is_sample ? <SampleLabel /> : null}
                </div>
                {/* Spec T02 privacy panel: purpose, who can see it, proposed retention and contact (frame wording). */}
                <p className="text-sm">
                  <strong>Purpose:</strong> manage your account and ideas. <strong>Who can see it:</strong> assigned CEDA staff.{' '}
                  <strong>Proposed retention:</strong> awaiting policy confirmation. <strong>Contact:</strong> portal privacy contact.
                </p>
                <details className="text-sm">
                  <summary className="inline-flex min-h-touch cursor-pointer items-center font-semibold text-brand-text underline underline-offset-2">
                    Read the full {notice.data.title.toLowerCase()}
                  </summary>
                  <div className="pb-2">
                    <PlainMarkdown source={notice.data.body_md} />
                  </div>
                </details>
                {/* The whole row is the target, and the box is 24 px (Sandra's #47 review). */}
                <label htmlFor="reg-consent" className="-mx-2 flex min-h-touch cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-card">
                  <input
                    id="reg-consent"
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-invalid={errorFor('reg-consent') ? true : undefined}
                    aria-describedby={errorFor('reg-consent') ? 'reg-consent-error' : undefined}
                    className="mt-0.5 h-6 w-6 shrink-0"
                  />
                  {/* Reversed so the accessible name reads "I agree … Required", like the text fields. */}
                  <span className="flex flex-col-reverse">
                    <span>I agree to the privacy notice.</span>
                    <span className="text-sm text-ink-muted">Required</span>
                  </span>
                </label>
                {errorFor('reg-consent') ? (
                  <p id="reg-consent-error" className="text-sm text-error">
                    {errorFor('reg-consent')}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <Button
            type="submit"
            loading={busy}
            loadingLabel="Creating your account…"
            disabled={!notice.data}
            disabledReason="The privacy notice must load first."
            className="w-full"
          >
            Create account
          </Button>
        </form>
        <p className="text-center">
          Already registered? <Link to="/auth/sign-in" className="inline-flex min-h-touch items-center">Sign in</Link>
        </p>
      </AuthCard>
    </div>
  )
}
