import { ArrowRight, FileClock, ListChecks, Lock, PenLine, Route, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { brand } from '@/brand'
import { SunriseJourney } from '@/brand/Horizon'
import { PHOTOS, type Photo } from '@/brand/photos'
import { ButtonLink } from '@/components'
import { buttonClassName } from '@/components/button-styles'
import { useChallenges } from '@/features/submission/queries'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming } from '@/lib/form-check'

/** What the portal does for applicants. Each line is true of the system as built (see the judge guide). */
const PROMISES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: 'Independent reviewers', text: 'At least two reviewers score each idea, and each declares any conflict of interest before opening it.' },
  { icon: ListChecks, title: 'Criteria you can see', text: 'Every challenge publishes its criteria and their weights before you apply.' },
  { icon: PenLine, title: 'A reason for every score', text: 'Reviewers explain each score in writing, so every decision rests on evidence.' },
  { icon: Route, title: 'Follow every stage', text: 'See where your idea is, from submission to award, and answer CEDA’s questions in the portal.' },
  { icon: Lock, title: 'Your idea stays private', text: 'Only you and the CEDA staff assigned to your case can see it.' },
  { icon: FileClock, title: 'Every step recorded', text: 'Each action on a case is written to an audit log that can’t be edited.' },
]

/** The five stages, as on the How it works page, in a line across the dark band. */
const STAGES = [
  { title: 'Choose a challenge', who: 'You' },
  { title: 'Prepare your idea', who: 'You' },
  { title: 'Submit it', who: 'You' },
  { title: 'Independent review', who: 'CEDA' },
  { title: 'Decision and support', who: 'CEDA and you' },
]

/** The photo mosaic: one large tile and three smaller ones, each a sector where ideas grow. */
const SECTORS: { photo: Photo; className: string }[] = [
  { photo: PHOTOS.techStand, className: 'col-span-2 aspect-[16/10] lg:row-span-2 lg:aspect-auto' },
  { photo: PHOTOS.farmer, className: 'col-span-2 aspect-[16/9] lg:aspect-auto' },
  { photo: PHOTOS.dressmaker, className: 'aspect-[4/5] lg:aspect-auto' },
  { photo: PHOTOS.mainMall, className: 'aspect-[4/5] lg:aspect-auto' },
]

const Eyebrow = ({ children, onDark = false }: { children: string; onDark?: boolean }) => (
  // On the dark band: CEDA gold on the night brown is well above 4.5:1.
  <p className={`text-sm font-bold uppercase tracking-wider ${onDark ? 'text-[var(--ceda-gold)]' : 'text-brand-text'}`}>{children}</p>
)

/**
 * T01 public home (spec §7 T01). Post-freeze design (ABM, 22 Nov; not the judged build), on CEDA's sunrise, Peolwane's
 * swallow and photographs of Botswana (src/brand/photos.ts, credited on the About page):
 * hero with the drawn sunrise and one live challenge preview; the Peolwane story beside a photo of a swallow, and CEDA
 * in its own words; the sectors ideas come from, as a photo mosaic, with the way to the challenges; the five stages on
 * a dark band; why submit here; help; and a closing call to act on a photo of Gaborone.
 * Every control is at least 44 × 44 px; the artwork is decorative and still for people who reduce motion.
 */
export function PublicHome() {
  return (
    // overflow-x-clip: the decorative sun-glows bleed a few px past the viewport at 360 px (e.g. WhyPeolwane's
    // -inset-6 halo). Clip horizontal bleed only — vertical scroll and the shell's sticky navbar are unaffected.
    <div className="flex flex-col overflow-x-clip">
      <Hero />
      <WhyPeolwane />
      <Sectors />
      <ProcessBand />
      <Promises />
      <HelpLinks />
      <ClosingBand />
    </div>
  )
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-surface-card">
      {/* A soft glow of the sun behind the hero (decorative). */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_22%,transparent),transparent_65%)]" />
      <section aria-labelledby="intro" className="relative mx-auto grid w-full max-w-content grid-cols-1 items-center gap-12 px-4 pb-16 pt-10 md:grid-cols-2 md:pb-20 md:pt-16">
        <div className="flex flex-col gap-5">
          <Eyebrow>A new season for innovation</Eyebrow>
          <h1 id="intro" className="text-[2.5rem] font-normal leading-tight md:text-[3.25rem]">
            A new dawn for innovation in Botswana
          </h1>
          <p className="max-w-form text-[1.0625rem] text-ink-muted md:text-[1.125rem]">
            Like the swallow that brings the rains, {brand.header.title} opens a new season for ideas. Answer a CEDA challenge, get constructive feedback, and
            watch your idea take flight.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/challenges" className="!rounded-full">
              Browse challenges <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
            <Link to="/how-it-works" className={buttonClassName('secondary', 'md', '!rounded-full')}>
              How it works
            </Link>
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
 * 21 Nov 2026), beside a photograph of a barn swallow, then CEDA's own words on where Botswana's economy is going.
 */
function WhyPeolwane() {
  return (
    <section aria-labelledby="why-peolwane-heading" className="bg-[linear-gradient(180deg,var(--ceda-surface-warm),var(--surface-page))]">
      <div className="mx-auto flex w-full max-w-content flex-col gap-12 px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <figure className="relative mx-auto w-full max-w-md">
            {/* The sun behind the swallow (decorative). */}
            <div aria-hidden className="absolute -inset-6 -z-0 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_45%,transparent),transparent_68%)]" />
            <div className="relative overflow-hidden rounded-[2rem] shadow-2 ring-4 ring-white">
              <img
                src={PHOTOS.swallow.src}
                alt={PHOTOS.swallow.alt}
                width={PHOTOS.swallow.width}
                height={PHOTOS.swallow.height}
                loading="lazy"
                decoding="async"
                className="aspect-square h-auto w-full object-cover"
              />
            </div>
            <figcaption className="relative -mt-6 ml-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ceda-brown)] shadow-1">
              <img src={brand.mark.src} alt="" width={brand.mark.width} height={brand.mark.height} className="h-5 w-auto" />
              <span>
                <span lang="tn">Peolwane</span>, the barn swallow: a summer visitor to Botswana
              </span>
            </figcaption>
          </figure>
          <div className="flex flex-col gap-4">
            <Eyebrow>{`Why ${brand.header.title}`}</Eyebrow>
            <h2 id="why-peolwane-heading" className="text-[2rem] font-normal leading-tight">
              The swallow that brings the rains
            </h2>
            <p className="text-[1.0625rem] text-ink-muted">
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
        </div>
        <CedaVoice />
      </div>
    </section>
  )
}

/**
 * CEDA in its own words. Quoted exactly from Botswana Daily News, "CEDA embraces value chain funding" (10 Aug 2026,
 * https://dailynews.gov.bw/news-detail/92627): Mr Khalala Mokefane, CEDA caretaker chief executive officer, at the
 * Northern Business Leadership Expo 2026 in Francistown. His portrait is from CEDA's executive-management page.
 * Keep the wording and attribution exactly as published.
 */
function CedaVoice() {
  return (
    <figure className="relative grid grid-cols-1 items-center gap-6 overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] p-8 text-white shadow-1 md:p-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_35%,transparent),transparent_65%)]" />
      <div className="relative flex flex-col gap-2">
        <span aria-hidden className="h-10 font-['Georgia',serif] text-[5.5rem] leading-[1] text-[var(--ceda-gold)]">
          &ldquo;
        </span>
        <blockquote className="text-[1.5rem] font-normal leading-snug md:text-[1.875rem]">
          <p>Together, let us build an economy driven by citizen enterprise, innovation and resilience.</p>
        </blockquote>
      </div>
      <figcaption className="relative flex items-center gap-4 border-t border-white/15 pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <img
          src="https://www.ceda.co.bw/sites/default/files/styles/board/public/2026-03/CEDA%20CEO%20Mkefane-7193.jpg?itok=E421nsnh"
          alt="Portrait of Mr. Khalala A. Mokefane"
          width={400}
          height={395}
          loading="lazy"
          decoding="async"
          className="h-20 w-20 shrink-0 rounded-full border-2 border-[var(--ceda-gold)] object-cover shadow-1"
        />
        <span className="flex flex-col text-sm">
          <span className="font-semibold">Mr. Khalala A. Mokefane</span>
          <span className="text-white/80">CEDA caretaker Chief Executive Officer, Northern Business Leadership Expo, Francistown, 2026</span>
          <a
            href="https://dailynews.gov.bw/news-detail/92627"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center gap-1 self-start text-[var(--ceda-gold)] underline-offset-2 hover:underline"
          >
            Source: Botswana Daily News, 10 Aug 2026<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a
            href="https://www.ceda.co.bw/executive-management"
            target="_blank"
            rel="noopener noreferrer"
            className="-mt-2 inline-flex min-h-touch items-center gap-1 self-start text-[var(--ceda-gold)] underline-offset-2 hover:underline"
          >
            Portrait and role: CEDA Executive Management<span className="sr-only"> (opens in a new tab)</span>
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
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-text">
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

/** Where ideas come from: four photographs of Botswana at work, and the way to the open challenges. */
function Sectors() {
  return (
    <section aria-labelledby="challenges-heading" className="bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-12 md:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <Eyebrow>Open challenges</Eyebrow>
            <h2 id="challenges-heading" className="text-[2rem] font-normal leading-tight">
              Find a problem worth solving
            </h2>
            <p className="text-ink-muted">
              CEDA&apos;s challenges look for ideas wherever enterprise grows: in labs and on farms, at sewing machines and market stalls. Each brief sets
              out the need, who can apply, the deadline and how ideas are assessed.
            </p>
          </div>
          <Link
            to="/challenges"
            className="inline-flex min-h-touch items-center gap-2 self-start rounded-full border border-[var(--ceda-brown)] bg-white px-5 font-semibold text-ink no-underline hover:bg-surface-card md:shrink-0 md:self-auto"
          >
            Browse all challenges <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:h-[30rem] lg:grid-cols-4 lg:grid-rows-2">
          {SECTORS.map(({ photo, className }) => {
            const [sector, place] = photo.caption.split(' · ')
            return (
              <li key={photo.src} className={cn('group relative isolate overflow-hidden rounded-[1.25rem] bg-[var(--ceda-night)] shadow-1', className)}>
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 -z-10 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"
                />
                <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_45%,rgba(43,29,25,0.88))]" />
                <p className="absolute inset-x-0 bottom-0 flex flex-col p-4 text-white">
                  <span className="font-semibold md:text-[1.0625rem]">{sector}</span>
                  {place ? <span className="text-sm text-white/85">{place}</span> : null}
                </p>
              </li>
            )
          })}
        </ul>
        <p className="text-sm text-ink-muted">
          Photographs of Botswana from Wikimedia Commons contributors.{' '}
          <Link to="/about#photo-credits" className="inline-flex min-h-touch items-center font-semibold text-brand-text underline-offset-4 hover:underline">
            Photo credits
          </Link>
        </p>
      </div>
    </section>
  )
}

/** The five stages on CEDA's night brown, joined by the swallow's dotted flight. */
function ProcessBand() {
  return (
    <section aria-labelledby="how-heading" className="relative overflow-hidden bg-[var(--ceda-night)] text-white">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-orange)_30%,transparent),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-content flex-col gap-10 px-4 py-12 md:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <Eyebrow onDark>A clear, transparent process</Eyebrow>
            <h2 id="how-heading" className="text-[2rem] font-normal leading-tight">
              From your first idea to a decision
            </h2>
            <p className="text-white/85">Submit against a challenge, follow the review in your account, and respond if CEDA asks for more information.</p>
          </div>
          <Link
            to="/how-it-works"
            className="inline-flex min-h-touch items-center gap-2 self-start rounded-full border border-white/60 px-5 font-semibold text-white no-underline hover:bg-white/10 md:shrink-0 md:self-auto"
          >
            See each step <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ol className="process-rail grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
          {STAGES.map((s, i) => (
            <li key={s.title} className="process-rail__stage relative flex items-center gap-4 lg:flex-col lg:items-start">
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ceda-gold)] bg-[var(--ceda-night)] text-[1.125rem] font-semibold text-[var(--ceda-gold)]">
                {i + 1}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{s.title}</span>
                <span className="text-sm text-white/75">{s.who}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Promises() {
  return (
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
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ceda-gold)_25%,transparent)] text-[var(--ceda-maroon)]">
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
  )
}

/** Direct routes keep Home useful without repeating FAQ answers or the contact directory. */
function HelpLinks() {
  const card = 'group flex min-h-32 items-center justify-between gap-4 rounded-md border border-line bg-surface-card p-6 text-ink no-underline shadow-1 transition-shadow hover:shadow-2'
  const arrow = 'h-5 w-5 shrink-0 text-brand-text motion-safe:transition-transform motion-safe:group-hover:translate-x-1'
  return (
    <section aria-labelledby="questions-heading" className="bg-surface-sunken">
      <div className="mx-auto grid w-full max-w-content grid-cols-1 gap-4 px-4 py-10 md:grid-cols-2 md:py-12">
        <Link to="/help/faqs" className={card}>
          <span className="flex flex-col gap-2">
            <Eyebrow>Help</Eyebrow>
            <h2 id="questions-heading" className="text-h2 font-semibold">
              Frequently asked questions
            </h2>
            <span className="text-ink-muted">Find answers about applying, reviews and your data.</span>
          </span>
          <ArrowRight aria-hidden className={arrow} />
        </Link>
        <Link to="/help/contacts" className={card}>
          <span className="flex flex-col gap-2">
            <Eyebrow>CEDA across Botswana</Eyebrow>
            <span className="text-h2 font-semibold">Contact and branch network</span>
            <span className="text-ink-muted">Find CEDA’s regional branch list and official map.</span>
          </span>
          <ArrowRight aria-hidden className={arrow} />
        </Link>
      </div>
    </section>
  )
}

/** The last word before the footer, on a photo of Gaborone: one sentence, one action. */
function ClosingBand() {
  const photo = PHOTOS.gaboroneCbd
  return (
    <section aria-labelledby="closing-heading" className="px-4 pt-12 md:pt-16">
      <div className="relative isolate mx-auto flex max-w-content flex-col items-start gap-5 overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] px-6 py-12 text-white shadow-2 md:flex-row md:items-center md:justify-between md:px-12 md:py-14">
        <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(43,29,25,0.95)_0%,rgba(43,29,25,0.85)_50%,rgba(158,36,32,0.55)_100%)]" />
        <div className="flex max-w-xl flex-col gap-2">
          <h2 id="closing-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2.25rem]">
            Have an idea that can grow Botswana?
          </h2>
          <p className="text-white/85">Pick a challenge, start your idea, and save it as you go.</p>
        </div>
        <ButtonLink to="/challenges" className="!rounded-full">
          Browse challenges <ArrowRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </div>
    </section>
  )
}
