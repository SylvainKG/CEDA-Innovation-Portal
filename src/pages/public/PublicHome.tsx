import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronDown, FileClock, ListChecks, Lock, PenLine, Route, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BRANDS, brand } from '@/brand'
import { SunriseJourney } from '@/brand/Horizon'
import { ButtonLink, PlainMarkdown } from '@/components'
import { buttonClassName } from '@/components/button-styles'
import { useChallenges } from '@/features/submission/queries'
import { api } from '@/lib/api'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming } from '@/lib/form-check'
import { PUBLIC_STAGES } from '@/lib/status'
import { ChallengeList } from './ChallengeList'

/** One line per stage, as in Sandra's home page reference (ceda site homepage.pdf, 20 Nov). */
const STEP_TEXT: Record<string, string> = {
  submission: 'Share your idea',
  review: 'CEDA assesses it',
  feedback: 'Respond if needed',
  approval: 'Receive a decision',
  award: 'Approved support recorded',
}

/** Each stage takes a colour from CEDA's sunrise, in order; the label colour keeps 4.5:1 or more on it. */
const STEP_TONE = [
  'bg-[var(--ceda-maroon)] text-white',
  'bg-[var(--ceda-orange)] text-[#1f1f1f]',
  'bg-[var(--ceda-amber)] text-[#1f1f1f]',
  'bg-[var(--ceda-gold)] text-[#1f1f1f]',
  'bg-white text-[var(--ceda-maroon)]',
]

/** What the portal does for applicants. Each line is true of the system as built (see the judge guide). */
const PROMISES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: 'Independent reviewers', text: 'At least two reviewers score each idea, and each declares any conflict of interest before opening it.' },
  { icon: ListChecks, title: 'Criteria you can see', text: 'Every challenge publishes its criteria and their weights before you apply.' },
  { icon: PenLine, title: 'A reason for every score', text: 'Reviewers explain each score in writing, so every decision rests on evidence.' },
  { icon: Route, title: 'Follow every stage', text: 'See where your idea is, from submission to award, and answer CEDA’s questions in the portal.' },
  { icon: Lock, title: 'Your idea stays private', text: 'Only you and the CEDA staff assigned to your case can see it.' },
  { icon: FileClock, title: 'Every step recorded', text: 'Each action on a case is written to an audit log that can’t be edited.' },
]

const Eyebrow = ({ children, onDark = false }: { children: string; onDark?: boolean }) => (
  // On the dark band: CEDA gold on the night brown is well above 4.5:1.
  <p className={`text-xs font-bold uppercase tracking-wider ${onDark ? 'text-[var(--ceda-gold)]' : 'text-brand-text'}`}>{children}</p>
)

/**
 * T01 public home (spec §7 T01). Post-freeze design (ABM, 22 Nov; not the judged build), on CEDA's sunrise and
 * Peolwane's swallow:
 * hero with the drawn sunrise and the swallow's flight through the five stages, and a live card for the open
 * challenge; the challenges; "From submission to award"; why submit here; questions; and a closing call to act.
 * Every control is at least 44 × 44 px; the artwork is decorative and still for people who reduce motion.
 */
export function PublicHome() {
  return (
    <div className="flex flex-col">
      <Hero />
      <WhyPeolwane />

      <section aria-labelledby="challenges-heading" className="bg-surface-sunken">
        <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end">
            <div className="flex flex-col gap-2">
              <Eyebrow>Open challenges</Eyebrow>
              <h2 id="challenges-heading" className="text-[2rem] font-normal leading-tight">
                Find a problem worth solving
              </h2>
            </div>
            <p className="text-ink-muted md:max-w-sm md:justify-self-end">Each challenge sets out a clear need, who can participate and how ideas are assessed.</p>
          </div>
          <ChallengeList />
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        // Always dark (CEDA's night brown), in light and dark themes alike; white on it is above 15:1.
        className="bg-[var(--ceda-night)] text-white"
      >
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-8 px-4 py-12 md:py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <Eyebrow onDark>A clear, transparent process</Eyebrow>
            <h2 id="how-heading" className="text-[2rem] font-normal leading-tight">
              From submission to award
            </h2>
          </div>
          <ol className="relative grid w-full grid-cols-1 gap-6 md:grid-cols-5 md:gap-2">
            {/* The swallow's dotted flight joining the steps (desktop only; decorative). */}
            <span aria-hidden className="absolute left-[10%] right-[10%] top-6 hidden border-t-2 border-dotted border-white/50 md:block" />
            {PUBLIC_STAGES.map((s, i) => (
              <li key={s.id} className="relative flex items-center gap-3 md:flex-col md:gap-2 md:text-center">
                <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-4 ring-[var(--ceda-night)] ${STEP_TONE[i] ?? STEP_TONE[0]}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex flex-col">
                  <h3 className="font-semibold">{s.label}</h3>
                  <span className="text-sm opacity-80">{STEP_TEXT[s.id]}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="bg-surface-card">
        <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-12 md:py-16">
          <div className="flex max-w-2xl flex-col gap-2">
            <Eyebrow>Fair and transparent</Eyebrow>
            <h2 id="why-heading" className="text-[2rem] font-normal leading-tight">
              Why submit through {brand.header.title}
            </h2>
            <p className="text-ink-muted">Your idea is judged on its merits, by people who explain their scores, in a process you can follow.</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-md border border-line bg-surface-page p-5 transition-shadow hover:shadow-1">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(253,200,13,0.25)] text-[var(--ceda-maroon)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col gap-1">
                  <h3 className="font-semibold">{title}</h3>
                  <span className="text-sm text-ink-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Questions />
      <ClosingBand />
    </div>
  )
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-surface-card">
      {/* A soft glow of the sun behind the hero (decorative). */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(253,200,13,0.22),transparent_65%)]" />
      <section aria-labelledby="intro" className="relative mx-auto grid w-full max-w-content grid-cols-1 items-center gap-12 px-4 pb-16 pt-10 md:grid-cols-2 md:pb-20 md:pt-16">
        <div className="flex flex-col gap-5">
          <Eyebrow>A new season for innovation</Eyebrow>
          <h1 id="intro" className="text-[2.5rem] font-normal leading-tight md:text-[3.25rem]">
            A new dawn for innovation in Botswana
          </h1>
          <p className="max-w-form text-lg text-ink-muted">
            Like the swallow that brings the rains, {brand.header.title} opens a new season for ideas. Answer a CEDA challenge, get constructive feedback, and
            watch your idea take flight.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/challenges" className="!rounded-full">
              Submit an innovation <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
            <a href="#how-it-works" className={buttonClassName('secondary', 'md', '!rounded-full')}>
              How it works
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            {['Two independent reviewers', 'A reason for every score', 'Follow every stage'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--ceda-orange)]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="overflow-hidden rounded-[2rem] shadow-2 ring-1 ring-black/5">
            <SunriseJourney className="block aspect-[600/440] h-auto w-full" />
          </div>
          <OpenChallengeCard />
        </div>
      </section>
    </div>
  )
}

/**
 * Why the portal is called Peolwane, from the team's brand concept (CEDA Innovation Portal / Brand concepts, Option 1,
 * 21 Nov 2026), beside CEDA's own words on where Botswana's economy is going.
 */
function WhyPeolwane() {
  return (
    <section aria-labelledby="why-peolwane-heading" className="bg-[linear-gradient(180deg,#fff8ef,var(--surface-page))]">
      <div className="mx-auto grid w-full max-w-content grid-cols-1 items-center gap-10 px-4 py-12 md:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Eyebrow>{`Why ${brand.header.title}`}</Eyebrow>
          <h2 id="why-peolwane-heading" className="text-[2rem] font-normal leading-tight">
            The swallow that brings the rains
          </h2>
          <p className="text-lg text-ink-muted">
            In Botswana, the swallow, <em lang="tn">peolwane</em>, is a sign that the rainy season is coming. Rain carries the promise of life, renewal and
            prosperity: it lets seeds take root and grow.
          </p>
          <p className="text-ink-muted">
            This portal does the same for ideas. It gives innovators a place to present them, receive constructive feedback, refine them and grow them into
            enterprises. The swallow and its raindrops in our emblem stand for movement, fresh beginnings and the promise of growth.
          </p>
          <ul className="flex flex-wrap gap-2">
            {['Hope', 'Renewal', 'New opportunities'].map((v) => (
              <li key={v} className="rounded-full border border-[var(--ceda-amber)] bg-white px-4 py-1.5 text-sm font-semibold text-[var(--ceda-brown)]">
                {v}
              </li>
            ))}
          </ul>
        </div>
        <CedaVoice />
      </div>
    </section>
  )
}

/**
 * CEDA in its own words. Quoted exactly from Botswana Daily News, "CEDA embraces value chain funding" (10 Aug 2026,
 * https://dailynews.gov.bw/news-detail/92627): Mr Khalala Mokefane, CEDA caretaker chief executive officer, at the
 * Northern Business Leadership Expo 2026 in Francistown. Keep the wording and attribution exactly as published.
 */
function CedaVoice() {
  return (
    <figure className="relative flex flex-col gap-5 overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] p-8 text-white shadow-1 md:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(253,200,13,0.35),transparent_65%)]" />
      <span aria-hidden className="relative h-10 font-['Georgia',serif] text-[5.5rem] leading-[1] text-[var(--ceda-gold)]">
        &ldquo;
      </span>
      <blockquote className="relative text-[1.5rem] font-normal leading-snug md:text-[1.75rem]">
        <p>Together, let us build an economy driven by citizen enterprise, innovation and resilience.</p>
      </blockquote>
      <figcaption className="relative flex items-center gap-4 border-t border-white/15 pt-5">
        <span className="shrink-0 rounded-md bg-white p-2">
          <img src={BRANDS.ceda.logo.src} alt="CEDA" width={BRANDS.ceda.logo.width} height={BRANDS.ceda.logo.height} className="h-9 w-auto" />
        </span>
        <span className="flex flex-col text-sm">
          <span className="font-semibold">Khalala Mokefane</span>
          <span className="text-white/80">CEDA caretaker Chief Executive Officer, Northern Business Leadership Expo, Francistown, 2026</span>
          <a
            href="https://dailynews.gov.bw/news-detail/92627"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center gap-1 self-start text-[var(--ceda-gold)] underline-offset-2 hover:underline"
          >
            Source: Botswana Daily News, 10 Aug 2026<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </span>
      </figcaption>
    </figure>
  )
}

/** The challenge open now (the one closing soonest), live from the challenge list; nothing when none is open. */
function OpenChallengeCard() {
  const challenges = useChallenges()
  const open = (challenges.data ?? [])
    .filter((c) => {
      const t = challengeTiming(c)
      return t === 'open' || t === 'closing_soon'
    })
    .sort((a, b) => a.closes_at.localeCompare(b.closes_at))[0]
  if (!open) return null
  return (
    <div className="relative -mt-8 ml-4 mr-4 flex flex-col gap-1 rounded-md border border-line bg-surface-card p-4 shadow-1 lg:absolute lg:-bottom-8 lg:right-6 lg:mx-0 lg:mt-0 lg:max-w-xs">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text">
        <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-[var(--ceda-orange)]" />
        Open now
      </p>
      <p className="font-semibold leading-snug">{open.title}</p>
      <p className="text-sm text-ink-muted">
        Closes {formatDateTimeCAT(open.closes_at)} ({relativeDays(open.closes_at)})
      </p>
      <Link to={`/challenges/${open.slug}`} className="inline-flex min-h-touch items-center gap-1 self-start font-semibold">
        Read the brief<span className="sr-only">: {open.title}</span> <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>
  )
}

/** The first questions from the FAQs (the same content and cache as the FAQ page), and where to ask more. */
function Questions() {
  const faqs = useQuery({ queryKey: ['content', 'faq'], queryFn: () => api.content.list('faq'), staleTime: 5 * 60_000 })
  const top = (faqs.data ?? []).slice(0, 4)
  return (
    <section aria-labelledby="questions-heading" className="bg-surface-sunken">
      <div className="mx-auto grid w-full max-w-content grid-cols-1 gap-8 px-4 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow>Help</Eyebrow>
            <h2 id="questions-heading" className="text-[2rem] font-normal leading-tight">
              Questions before you apply
            </h2>
          </div>
          {top.length ? (
            <ul className="flex flex-col gap-2">
              {top.map((faq) => (
                <li key={faq.slug}>
                  <details className="group rounded-md bg-surface-card shadow-1">
                    <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold">
                      <span>{faq.title}</span>
                      <ChevronDown aria-hidden className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4 text-ink-muted">
                      <PlainMarkdown source={faq.body_md} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : null}
          <Link to="/help/faqs" className="inline-flex min-h-touch items-center gap-1 self-start font-semibold">
            All questions <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <aside aria-labelledby="ask-heading" className="flex flex-col gap-3 self-start rounded-md bg-[var(--ceda-night)] p-6 text-white">
          {/* The mark is dark navy, so it sits on a white tile to stay visible on the brown. */}
          <span className="self-start rounded-md bg-white p-2 shadow-1">
            <img src={brand.mark.src} alt="" width={brand.mark.width} height={brand.mark.height} className="h-10 w-auto" />
          </span>
          <h3 id="ask-heading" className="text-h2 font-semibold">
            Still unsure?
          </h3>
          <p className="text-white/85">Ask Peolwane AI, the assistant at the bottom right of every page, or contact CEDA directly.</p>
          <Link to="/help/contacts" className={buttonClassName('primary', 'md', 'self-start !rounded-full')}>
            Contact CEDA
          </Link>
        </aside>
      </div>
    </section>
  )
}

/** The last word before the footer: the same sunrise, one sentence, one action. */
function ClosingBand() {
  return (
    <section aria-labelledby="closing-heading" className="px-4 pt-12 md:pt-16">
      <div className="relative mx-auto flex max-w-content flex-col items-start gap-4 overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#fff3e2,#ffe0b8)] px-6 py-10 md:flex-row md:items-center md:justify-between md:px-12">
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--ceda-gold),var(--ceda-amber)_60%,transparent_72%)] opacity-60" />
        <div className="relative flex flex-col gap-2">
          <h2 id="closing-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">
            Have an idea that can grow Botswana?
          </h2>
          <p className="text-ink-muted">Pick a challenge, start your idea, and save it as you go.</p>
        </div>
        <ButtonLink to="/challenges" className="relative !rounded-full">
          Submit an innovation <ArrowRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </div>
    </section>
  )
}

/** `/challenges`: the same list with its own page heading. */
export function ChallengesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-bold">Challenges</h1>
      <ChallengeList />
    </div>
  )
}
