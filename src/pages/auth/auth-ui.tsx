import { useEffect, useRef, type ReactNode } from 'react'
import { CircleCheck } from 'lucide-react'
import { BRANDS, brand } from '@/brand'
import { PHOTOS } from '@/brand/photos'
import { ErrorSummary } from '@/components/ErrorSummary'

/**
 * Shared pieces of the T02 auth card (spec T02; layout from Sandra's sign-in and create-account frames,
 * 21 Nov, #100): a card at most 440 px wide with the logo, title and intro centred (the DEMO pill is in the page header, so the card doesn't repeat it; team lead, 22 Nov), an error
 * summary that links to each field, and the wording for each refusal. Messages never say which of email or
 * password was wrong, nor whether an account exists.
 */

const AUTH_POINTS = ['Two independent reviewers score every idea', 'A written reason for every score', 'Follow every stage in your account']

/**
 * The auth card (post-freeze, ABM 22 Nov): from 1024 px, a story panel on the left (the swallow photo on CEDA's night
 * brown, the tagline and three promises, as on the home page) beside the form; below that, the form card alone with a
 * thin sunrise line on top. The form column stays at most 400 px wide, as in Sandra's frames.
 */
export function AuthCard({ title, children, intro }: { title: string; intro?: ReactNode; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  // A new auth step is a new page: move focus to its heading so screen readers announce it.
  useEffect(() => heading.current?.focus(), [title])
  return (
    <div className="mx-auto grid w-full max-w-[440px] overflow-hidden rounded-[1.5rem] bg-surface-card shadow-2 ring-1 ring-black/5 lg:max-w-[1040px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:rounded-[2rem]">
      <AuthStory />
      <div className="relative flex flex-col justify-center p-6 pt-8 sm:p-8 lg:px-12 lg:py-12">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))] lg:hidden" />
        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Spec T02: logo above the title. Decorative here: the header's logo link already names the portal. */}
            <img src={brand.mark.src} alt="" width={brand.mark.width} height={brand.mark.height} className="h-14 w-auto" />
            <h1 ref={heading} tabIndex={-1} className="text-[1.75rem] font-semibold leading-tight outline-none">
              {title}
            </h1>
            {intro ? <div className="text-ink-muted">{intro}</div> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/** The left half of the auth card from 1024 px. Decorative photo; the text repeats what the home page promises. */
function AuthStory() {
  const photo = PHOTOS.swallow
  return (
    <div className="relative isolate hidden flex-col overflow-hidden bg-[var(--ceda-night)] text-white lg:flex">
      {/* The swallow at a fixed height, fading into the night brown, so long forms don't stretch it. */}
      <div className="relative h-[19rem] shrink-0">
        <img src={photo.src} alt="" width={photo.width} height={photo.height} decoding="async" className="absolute inset-0 h-full w-full object-cover object-[center_42%]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,29,25,0.6)_0%,rgba(43,29,25,0)_32%,rgba(43,29,25,0)_62%,rgba(43,29,25,1)_100%)]" />
        <div className="absolute left-10 top-8 flex items-center gap-3">
          <span className="rounded-full bg-white p-1.5 shadow-1">
            <img src={brand.mark.src} alt="" width={brand.mark.width} height={brand.mark.height} className="h-8 w-auto" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold">{brand.header.title}</span>
            {brand.header.subtitle ? <span className="text-sm text-white/80">{brand.header.subtitle}</span> : null}
          </span>
        </div>
      </div>
      <div className="relative -mt-4 flex flex-col gap-4 px-10 pb-8">
        <p className="text-[2rem] font-normal leading-tight">{brand.tagline}</p>
        <p className="text-white/85">Answer CEDA&apos;s challenges with your ideas, get constructive feedback, and follow each idea from submission to award.</p>
        <ul className="flex flex-col gap-2">
          {AUTH_POINTS.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <CircleCheck aria-hidden className="h-5 w-5 shrink-0 text-[var(--ceda-gold)]" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-10 py-6 text-sm text-white/80">
        <span className="rounded-md bg-white p-1">
          <img src={BRANDS.ceda.logo.src} alt="" width={BRANDS.ceda.logo.width} height={BRANDS.ceda.logo.height} className="h-7 w-auto" />
        </span>
        {brand.header.title} · a CEDA product
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))]" />
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
    <ErrorSummary boxRef={box} title={title}>
      <ul>
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
    </ErrorSummary>
  )
}
