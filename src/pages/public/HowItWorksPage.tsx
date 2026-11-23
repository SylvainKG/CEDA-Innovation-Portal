import { ArrowDown, ArrowRight, ClipboardCheck, FileText, LifeBuoy, MessageSquareText, Save, SearchCheck, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { brand } from '@/brand'
import { PHOTOS } from '@/brand/photos'
import { cn } from '@/lib/cn'
import { StepJourney } from './StepJourney'

const STEPS = [
  {
    icon: SearchCheck,
    title: 'Choose a challenge',
    actor: 'Start here',
    text: 'Read the challenge brief to understand the problem, eligibility rules, closing date, required information and scoring criteria.',
    link: { to: '/challenges', label: 'Explore challenges' },
  },
  {
    icon: FileText,
    title: 'Prepare your idea',
    actor: 'You',
    text: 'Create an account, verify your email and answer the proposal questions. Save a draft and return to it any time before submitting.',
    link: { to: '/auth/register', label: 'Create an account' },
  },
  {
    icon: ClipboardCheck,
    title: 'Submit and keep your reference',
    actor: 'You',
    text: 'Check your answers and submit before the challenge closes. Your receipt has a case reference; follow the proposal in My ideas.',
    link: { to: '/auth/sign-in', label: 'Sign in to your account' },
  },
  {
    icon: ShieldCheck,
    title: 'CEDA reviews your proposal',
    actor: 'CEDA',
    text: 'CEDA checks the proposal against the challenge. At least two assigned reviewers score it against the published criteria and record reasons for their scores.',
  },
  {
    icon: MessageSquareText,
    title: 'Respond and follow the decision',
    actor: 'Together',
    text: 'If CEDA asks for clarification or a revision, the request and tasks appear in your account. Reply there, then follow your case for its decision and any approved support.',
    link: { to: '/help/faqs', label: 'Read the FAQs' },
  },
]

/** Who acts at each step, in CEDA's sunrise colours (dark text on the light tints, white on maroon). */
const ACTOR_TONE: Record<string, string> = {
  'Start here': 'bg-[var(--ceda-gold)] text-ink',
  You: 'bg-[var(--ceda-band-start)] text-[var(--ceda-brown)]',
  CEDA: 'bg-[var(--ceda-maroon)] text-white',
  Together: 'bg-[var(--ceda-band-end)] text-[var(--ceda-brown)]',
}

const BEFORE_YOU_START = [
  {
    icon: UserRoundCheck,
    title: 'What you’ll need',
    text: 'An account with a verified email address, and the answers the challenge asks for. Some briefs include templates to download.',
  },
  {
    icon: Save,
    title: 'Work at your own pace',
    text: 'Your draft is saved in your account, so you can come back to it any time before the challenge closes.',
  },
  {
    icon: LifeBuoy,
    title: 'Help when you need it',
    text: 'Read the FAQs, ask Peolwane AI at the bottom of any page, or report a fault to CEDA support.',
  },
]

/**
 * `/how-it-works` (post-freeze, ABM 22 Nov): the process guide, on CEDA's sunrise. A hero with a photo from a
 * Botswana science festival; the five steps as a timeline, with a list beside it (from 1024 px, staying in view) to
 * jump to any step; what to have ready; and a closing call to act on a photo of Gaborone's Main Mall.
 */
export function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-12 py-2 md:gap-16">
      <Hero />

      <section id="process-steps" aria-labelledby="steps-heading" className="grid scroll-mt-28 gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
        <div>
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-text">From brief to outcome</p>
            <h2 id="steps-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">
              Five steps, with a clear hand-off
            </h2>
          </div>
          <ol className="how-it-works-steps flex flex-col gap-4">
            {STEPS.map(({ icon: Icon, title, actor, text, link }, index) => (
              <li key={title} id={`step-${index + 1}`} className="how-it-works-step relative flex scroll-mt-28 gap-4 sm:gap-5">
                <span aria-hidden className="how-it-works-step-marker z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[var(--surface-page)] bg-[var(--ceda-maroon)] text-white shadow-1">
                  <Icon className="h-5 w-5" />
                </span>
                <article className="relative mb-1 flex min-w-0 flex-1 flex-col items-start gap-2 overflow-hidden rounded-md border border-line bg-surface-card p-4 shadow-1 transition-shadow hover:shadow-2 sm:p-5">
                  {/* The step number, large and faint, in the corner (decorative). */}
                  <span aria-hidden className="pointer-events-none absolute right-3 top-1 select-none text-[4.5rem] font-semibold leading-none text-[color-mix(in_srgb,var(--ceda-amber)_16%,transparent)]">
                    {index + 1}
                  </span>
                  <div className="relative flex w-full flex-wrap items-center gap-3">
                    <p className="text-sm font-bold uppercase tracking-wider text-ink-muted">Step {index + 1}</p>
                    <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', ACTOR_TONE[actor])}>{actor}</span>
                  </div>
                  <h3 className="relative text-h3 font-semibold">{title}</h3>
                  <p className="relative text-ink-muted">{text}</p>
                  {link ? (
                    <Link to={link.to} className="relative inline-flex min-h-touch items-center gap-2 font-semibold text-brand-text underline-offset-4 hover:underline">
                      {link.label} <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-28">
          <nav aria-labelledby="jump-heading" className="hidden flex-col gap-2 rounded-md border border-line bg-surface-card p-5 shadow-1 lg:flex">
            <h2 id="jump-heading" className="text-sm font-bold uppercase tracking-wider text-ink-muted">
              Jump to a step
            </h2>
            <ol className="flex flex-col">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <a href={`#step-${i + 1}`} className="group flex min-h-touch items-center gap-3 rounded-md px-1 text-ink no-underline hover:bg-surface-sunken">
                    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ceda-orange)] text-sm font-semibold text-[var(--ceda-maroon)] group-hover:bg-[var(--ceda-orange)] group-hover:text-ink">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="relative flex flex-col gap-4 overflow-hidden rounded-md bg-[var(--ceda-night)] p-5 text-white md:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_35%,transparent),transparent_65%)]" />
            <div aria-hidden className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[var(--ceda-gold)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="relative text-h3 font-semibold">Your proposal stays private</h2>
            <p className="relative text-white/85">Only you and CEDA staff assigned to your case can see your proposal. The portal keeps your updates and next steps together.</p>
            <Link to="/privacy" className="relative inline-flex min-h-touch items-center gap-2 self-start font-semibold text-white underline-offset-4 hover:underline">
              Read the privacy notice <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>

      <section aria-labelledby="before-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-text">Before you start</p>
          <h2 id="before-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">
            Good to know
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {BEFORE_YOU_START.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3 rounded-md border border-line bg-surface-card p-5 shadow-1">
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ceda-gold)_25%,transparent)] text-[var(--ceda-maroon)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-h3 font-semibold">{title}</h3>
              <p className="text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <ClosingCta />

      <p className="border-t border-line pt-5 text-sm text-ink-muted">
        {brand.header.title} is a demonstration prototype. Challenge information and example cases are fictional unless a page links to CEDA’s official website.
      </p>
    </div>
  )
}

/** Where the stars sit in the hero's sky (left %, top %, twinkle delay in s); decorative. */
const STARS: [number, number, number][] = [
  [6, 12, 0], [14, 34, 1.2], [22, 8, 2.1], [31, 22, 0.6], [38, 6, 1.8], [46, 16, 2.7], [53, 30, 0.9], [58, 9, 1.5],
  [64, 20, 2.4], [71, 5, 0.3], [78, 14, 1.1], [86, 28, 2.0], [92, 9, 0.7], [97, 22, 1.6], [3, 52, 2.5], [49, 4, 1.3],
]

/**
 * The hero (23 Nov, after the team asked for "a touch of magic"): one panel in CEDA's night brown, like the home and
 * About heroes, under a sky of faint stars that twinkle, with the sun's glow at the top right and an ember glow at the
 * bottom left. "innovation process" is in the sunrise; the swallow's journey sits in the same panel as a glass card.
 * The stars, the pulsing dot and the journey's own motion stop for people who reduce motion.
 */
function Hero() {
  return (
    <div className="relative isolate grid grid-cols-1 items-center gap-10 overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] px-5 py-8 text-white shadow-2 sm:px-8 md:px-12 md:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div aria-hidden className="absolute -right-24 -top-32 -z-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_38%,transparent),transparent_65%)]" />
      <div aria-hidden className="absolute -bottom-44 -left-28 -z-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-maroon)_55%,transparent),transparent_68%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {STARS.map(([x, y, delay]) => (
          <span key={`${x}-${y}`} className="hiw-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
        ))}
      </div>
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-[var(--ceda-gold)]">
          <span aria-hidden className="hiw-pulse h-2 w-2 rounded-full bg-[var(--ceda-gold)]" />
          A clear path for every idea
        </p>
        <h1 className="text-[2.25rem] font-semibold leading-tight tracking-tight md:text-[3rem]">
          How the CEDA{' '}
          <span className="bg-[linear-gradient(100deg,var(--ceda-gold),var(--ceda-orange))] bg-clip-text text-transparent forced-colors:text-[CanvasText]">
            innovation process
          </span>{' '}
          works
        </h1>
        <p className="text-[1.0625rem] leading-relaxed text-white/85 md:text-[1.125rem]">
          {brand.header.title} gives you one place to find a challenge, submit an idea and follow CEDA’s review. Each challenge has its own eligibility rules
          and deadline, so begin with its brief.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/challenges" className="inline-flex min-h-touch items-center justify-center gap-2 rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)]">
            Find a challenge <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <a href="#process-steps" className="inline-flex min-h-touch items-center gap-2 font-semibold text-white underline-offset-4 hover:underline">
            Follow the five steps <ArrowDown aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </div>
      <StepJourney steps={STEPS} glass />
    </div>
  )
}

/** The last word on the page, on a photo of Gaborone's Main Mall. */
function ClosingCta() {
  const photo = PHOTOS.mainMall
  return (
    <section
      aria-labelledby="ready-heading"
      className="relative isolate flex flex-col items-start gap-5 overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] px-6 py-10 text-white shadow-2 md:flex-row md:items-center md:justify-between md:px-12 md:py-12"
    >
      <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(43,29,25,0.95)_0%,rgba(43,29,25,0.86)_55%,rgba(158,36,32,0.6)_100%)]" />
      <div className="flex max-w-xl flex-col gap-2">
        <h2 id="ready-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2.25rem]">
          Ready to take part?
        </h2>
        <p className="text-white/85">Open challenges list who can apply and when they close. Start with the one that fits your idea.</p>
      </div>
      <Link to="/challenges" className="inline-flex min-h-touch items-center gap-2 rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)]">
        See open challenges <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  )
}
