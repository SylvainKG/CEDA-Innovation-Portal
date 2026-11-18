import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Banner, Button, PlainMarkdown, SampleLabel, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AuthRefusal } from '@/lib/api/types'
import { AuthCard, FormErrorSummary, type FieldError } from './auth-ui'
import { isEmail, PASSWORD_MIN, REFUSAL_TEXT } from './auth-text'

/**
 * T02 Register (spec T02, IAM-02; built from the written spec, BCR-003). Everyone who registers is an
 * applicant; staff roles are granted by an administrator. Consent is recorded with the privacy notice version
 * by the server (handle_new_user), only if it is the current version.
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
      <AuthCard title="Register" intro="Create an account to submit ideas to CEDA challenges.">
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
            help={`At least ${PASSWORD_MIN} characters. A short sentence you can remember works well. Don't reuse a password from another site.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errorFor('reg-password')}
          />

          <section aria-labelledby="privacy-heading" className="flex flex-col gap-2 rounded-md border border-line p-4">
            {notice.isPending ? (
              <LoadingState what="the privacy notice" lines={2} />
            ) : notice.isError || !notice.data ? (
              <ErrorState level="h2" message="We couldn't load the privacy notice. You need it to register." onRetry={() => void notice.refetch()} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="privacy-heading" className="text-h3 font-semibold">
                    {notice.data.title}
                  </h2>
                  {notice.data.is_sample ? <SampleLabel /> : null}
                </div>
                <div className="text-sm">
                  <PlainMarkdown source={notice.data.body_md} />
                </div>
                <div className="flex items-start gap-3">
                  <input
                    id="reg-consent"
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-invalid={errorFor('reg-consent') ? true : undefined}
                    aria-describedby={errorFor('reg-consent') ? 'reg-consent-error' : undefined}
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <label htmlFor="reg-consent">I have read the privacy notice and agree that CEDA may use my details to assess my ideas.</label>
                </div>
                {errorFor('reg-consent') ? (
                  <p id="reg-consent-error" className="text-sm text-error">
                    {errorFor('reg-consent')}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <Button type="submit" loading={busy} loadingLabel="Registering…" disabled={!notice.data} disabledReason="The privacy notice must load first.">
            Register
          </Button>
        </form>
        <p>
          Already registered? <Link to="/auth/sign-in">Sign in</Link>
        </p>
      </AuthCard>
    </div>
  )
}
