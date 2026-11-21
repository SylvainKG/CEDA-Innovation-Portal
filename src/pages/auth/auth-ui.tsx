import { useEffect, useRef, type ReactNode } from 'react'
import cedaLogo from '@/assets/ceda-logo.png'
import { DemoBadge } from '@/components'

/**
 * Shared pieces of the T02 auth card (spec T02; layout from Sandra's sign-in and create-account frames,
 * 21 Nov, #100): a card at most 440 px wide with the logo, DEMO pill, title and intro centred, an error
 * summary that links to each field, and the wording for each refusal. Messages never say which of email or
 * password was wrong, nor whether an account exists.
 */

export function AuthCard({ title, children, intro }: { title: string; intro?: ReactNode; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  // A new auth step is a new page: move focus to its heading so screen readers announce it.
  useEffect(() => heading.current?.focus(), [title])
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-4 rounded-md bg-surface-card p-6 shadow-1">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Spec T02: logo above the title. Decorative here: the header's logo link already names CEDA. */}
        <img src={cedaLogo} alt="" width={1432} height={900} className="h-14 w-auto" />
        <DemoBadge />
        <h1 ref={heading} tabIndex={-1} className="text-h1 font-semibold outline-none">
          {title}
        </h1>
        {intro ? <div className="text-ink-muted">{intro}</div> : null}
      </div>
      {children}
    </div>
  )
}

export interface FieldError {
  /** The field's element id, so the link can move focus to it. Leave it out for a message about no one field. */
  id?: string
  message: string
}

/** Error summary at the top of the form; each entry focuses its field (spec T02 "Accept"). */
export function FormErrorSummary({ errors, title = 'There is a problem' }: { errors: FieldError[]; title?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const signature = errors.map((e) => `${e.id ?? ''}${e.message}`).join('|')
  useEffect(() => {
    if (signature) box.current?.focus()
  }, [signature])
  if (errors.length === 0) return null
  return (
    <div ref={box} id="error-summary" tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-md bg-error-subtle p-4 outline-none">
      <h2 className="text-h3 font-semibold">{title}</h2>
      <ul className="list-disc pl-6">
        {errors.map(({ id, message }) => (
          <li key={id ?? message}>
            {id ? (
              <a
                href={`#${id}`}
                onClick={(event) => {
                  event.preventDefault()
                  document.getElementById(id)?.focus()
                }}
              >
                {message}
              </a>
            ) : (
              message
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
