import { ArrowRight, FileSearch, MessageCircleQuestionMark, PenLine, Route, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PHOTOS } from '@/brand/photos'
import { useChallenges } from '@/features/submission/queries'
import { challengeTiming } from '@/lib/form-check'
import { ChallengeList } from './ChallengeList'
import { PhotoBanner } from './PhotoBanner'

const TAKE_PART: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileSearch, title: 'Read the brief', text: 'See the need, who can apply, the closing date, and the criteria and weights used to score ideas.' },
  { icon: PenLine, title: 'Start your idea', text: 'Answer the questions in your account. Your draft is saved as you go, so you can return to it.' },
  { icon: Route, title: 'Submit and follow it', text: 'Submit before the deadline, keep your case reference, and follow each stage to a decision.' },
]

/**
 * `/challenges` (post-freeze, ABM 22 Nov): a header on a photo of Gaborone with how many challenges are open, the
 * challenge cards (with cover photos), three short steps to take part, and where to get help. Shared by visitors and
 * signed-in people (SiteShell), so the wording speaks to both.
 */
export function ChallengesPage() {
  const challenges = useChallenges()
  const timings = (challenges.data ?? []).map((c) => challengeTiming(c))
  const open = timings.filter((t) => t === 'open' || t === 'closing_soon').length
  const closed = timings.filter((t) => t === 'closed').length
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <PhotoBanner photo={PHOTOS.gaboroneCbd} eyebrow="CEDA innovation challenges" title="Challenges">
        <p className="text-white/90 md:text-[1.0625rem]">
          Each challenge sets out a real need in Botswana&apos;s economy. Read a brief, check who can apply and how ideas are scored, then start your
          idea before it closes.
        </p>
        {challenges.data ? (
          <ul className="flex flex-wrap gap-2 text-sm font-semibold" aria-label="Challenges at a glance">
            <li className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-ink">
              <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-[var(--ceda-orange)]" />
              {open} open now
            </li>
            <li className="rounded-full border border-white/40 px-3 py-1.5 text-white">{closed} closed</li>
          </ul>
        ) : null}
      </PhotoBanner>

      <section aria-labelledby="list-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="list-heading" className="text-[1.75rem] font-normal leading-tight">
            Open and recent challenges
          </h2>
          <Link to="/how-it-works" className="inline-flex min-h-touch items-center gap-2 font-semibold text-brand-text underline-offset-4 hover:underline">
            How the process works <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ChallengeList />
      </section>

      <section aria-labelledby="take-part-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-text">Taking part</p>
          <h2 id="take-part-heading" className="text-[1.75rem] font-normal leading-tight">
            Three steps from brief to decision
          </h2>
        </div>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TAKE_PART.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex flex-col gap-3 rounded-md border border-line bg-surface-card p-5 shadow-1">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ceda-maroon)] text-white shadow-1">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold uppercase tracking-wider text-ink-muted">Step {i + 1}</span>
              </div>
              <h3 className="text-h3 font-semibold">{title}</h3>
              <p className="text-ink-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="challenge-help-heading"
        className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,var(--ceda-band-start),var(--ceda-band-end))] px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10"
      >
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-16 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--ceda-gold),var(--ceda-amber)_60%,transparent_72%)] opacity-50" />
        <div className="flex items-start gap-4">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ceda-maroon)] shadow-1">
            <MessageCircleQuestionMark className="h-6 w-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="challenge-help-heading" className="text-h2 font-semibold">
              Questions before you apply?
            </h2>
            <p className="text-ink-muted">Read the FAQs, ask Peolwane AI at the bottom of the page, or contact your nearest CEDA branch.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link to="/help/faqs" className="inline-flex min-h-touch items-center rounded-full bg-[var(--ceda-night)] px-5 font-semibold text-white no-underline hover:bg-black">
            Read the FAQs
          </Link>
          <Link to="/help/contacts" className="inline-flex min-h-touch items-center rounded-full border border-[var(--ceda-brown)] bg-white px-5 font-semibold text-ink no-underline hover:bg-surface-sunken">
            Contact CEDA
          </Link>
        </div>
      </section>
    </div>
  )
}
