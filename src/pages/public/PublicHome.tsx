import { useState } from 'react'
import { ArrowRight, FileClock, ListChecks, Lock, PenLine, Route, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { brand } from '@/brand'
import { DawnFlight } from '@/brand/Horizon'
import { PHOTOS, type Photo } from '@/brand/photos'
import { ButtonLink } from '@/components'
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

/** The hero's three proofs, each true of the system as built (see PROMISES). */
const PROOFS: { icon: LucideIcon; text: string }[] = [
  { icon: ShieldCheck, text: 'Two independent reviewers' },
  { icon: PenLine, text: 'A reason for every score' },
  { icon: Route, text: 'Follow every stage' },
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

/**
 * The hero as one composition (ABM, 23 Nov; the team found the earlier split cold, the photo a separate card). One
 * panel in CEDA's night brown, edge to edge from 1024 px (its words still on the page's content edge) and a rounded
 * card on phones and tablets, like the About and How it works heroes: the words on the left; the Okavango sunrise
 * filling the right and fading into the brown, so there is no edge between them; the swallow's dotted flight rising
 * out of the dark into the sun; and the challenge open now as a glass card on the photo, inside the same panel. When
 * the swallow lands, a line of light runs along the card and its "Open now" dot pulses. On phones the photo sits at
 * the top of the panel (below 1024 px) and fades into the words below it. "new dawn" is in the sunrise (gold into orange, above 5:1 on
 * the brown).
 */
function Hero() {
  const [landed, setLanded] = useState(false)
  return (
    <div className="relative bg-[linear-gradient(180deg,var(--surface-card),var(--ceda-surface-warm))] px-4 pb-12 pt-6 md:pb-16 md:pt-10 lg:p-0">
      {/* The sun's glow behind the panel (decorative). */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_30%,transparent),transparent_65%)]" />
      <section
        aria-labelledby="intro"
        className={cn(
          'dawn-frame relative isolate mx-auto grid w-full max-w-content overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] text-white shadow-2 lg:min-h-[34rem] lg:max-w-none lg:grid-cols-2 lg:rounded-none lg:shadow-none xl:min-h-[38rem]',
          landed && 'is-landed',
        )}
      >
        <div className="relative z-10 flex flex-col gap-5 px-6 pb-8 md:px-10 lg:justify-center lg:py-14 lg:pl-[max(2.5rem,calc((100vw-75rem)/2+1rem))] lg:pr-2 xl:py-20 xl:pr-4">
          <Eyebrow onDark>A new season for innovation</Eyebrow>
          <h1 id="intro" className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight md:text-[3.5rem] lg:text-[2.75rem] xl:text-[3.5rem]">
            A{' '}
            <span className="bg-[linear-gradient(100deg,var(--ceda-gold),var(--ceda-orange))] bg-clip-text text-transparent forced-colors:text-[CanvasText]">
              new dawn
            </span>{' '}
            for innovation in Botswana
          </h1>
          <p className="max-w-form text-[1.0625rem] leading-relaxed text-white/85 md:text-[1.1875rem] lg:text-[1.0625rem] xl:text-[1.1875rem]">
            Like the swallow that brings the rains, {brand.header.title} opens a new season for ideas. Answer a CEDA challenge, get constructive feedback, and
            watch your idea take flight.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/challenges"
              className="inline-flex min-h-touch items-center gap-2 rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)]"
            >
              Browse challenges <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex min-h-touch items-center gap-2 rounded-full border border-white/40 px-5 font-semibold text-white no-underline hover:bg-white/10"
            >
              How it works
            </Link>
          </div>
          <ul className="flex flex-col gap-2.5">
            {PROOFS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-semibold text-white/90">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[var(--ceda-gold)] ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        {/* The sunrise and the swallow's flight. From 1024 px it fills the right of the panel and fades into the brown at
            its left edge; below that it heads the panel and fades at its foot. DawnFlight crops from the photo's left, so
            the tree, the sun and the swallow's landing stay to the right of the words at every width. */}
        <figure className="dawn-photo relative order-first aspect-[4/3] md:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:order-none lg:aspect-auto lg:w-[min(74%,62rem)]">
          <DawnFlight photo={PHOTOS.sunrise} onArrive={() => setLanded(true)} className="absolute inset-0 block h-full w-full" />
          <figcaption className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm lg:left-auto lg:right-4">
            {PHOTOS.sunrise.caption}
          </figcaption>
        </figure>
        <div className="relative z-10 px-4 pb-4 md:px-6 md:pb-6 lg:col-start-2 lg:self-end lg:pb-8 lg:pl-0 lg:pr-[max(1.5rem,calc((100vw-75rem)/2+1rem))]">
          <ChallengeStrip />
        </div>
        {/* From 1024 px the hero runs edge to edge and ends on a thin line of sunrise, as the workspace footer begins. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 hidden h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))] lg:block" />
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

/**
 * The hero's one piece: the sunrise and the swallow's flight above, and the challenge open now built into the frame's
 * base like the ground under the sky, never over the photo. When the swallow lands, a line of light runs along the
 * top of the strip and the "Open now" dot starts to pulse: the flight ends at the challenge.
 */
/** The challenge open now (the one closing soonest), live from the challenge list; a way to all challenges if none is open. */
function ChallengeStrip() {
  const challenges = useChallenges()
  const open = (challenges.data ?? [])
    .filter((c) => {
      const t = challengeTiming(c)
      return t === 'open' || t === 'closing_soon'
    })
    .sort((a, b) => a.closes_at.localeCompare(b.closes_at))[0]
  return (
    <div className="dawn-strip relative flex flex-col gap-3 overflow-hidden rounded-[1.25rem] border border-white/15 bg-[color-mix(in_srgb,var(--ceda-night)_74%,transparent)] px-5 py-4 text-white shadow-2 backdrop-blur-md md:flex-row md:items-center md:justify-between md:gap-5 md:px-6 lg:ml-auto lg:max-w-lg">
      {open ? (
        <>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--ceda-gold)]">
              <span aria-hidden className="dawn-dot h-2 w-2 rounded-full bg-[var(--ceda-gold)]" />
              Open now
            </p>
            <p className="font-semibold leading-snug">{open.title}</p>
            <p className="text-sm text-white/75">
              Closes {formatDateTimeCAT(open.closes_at)} ({relativeDays(open.closes_at)})
            </p>
          </div>
          <Link
            to={`/challenges/${open.slug}`}
            className="inline-flex min-h-touch shrink-0 items-center gap-2 self-start rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)] md:self-center"
          >
            Read the brief<span className="sr-only">: {open.title}</span> <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <>
          <p className="text-white/85">New challenges open here first.</p>
          <Link to="/challenges" className="inline-flex min-h-touch items-center gap-2 font-semibold text-[var(--ceda-gold)]">
            See all challenges <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </>
      )}
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

/**
 * Why submit here (restyled 23 Nov: the team found the grey card grid flat). The introduction sits on the left and
 * stays in view beside the promises from 1024 px, with the way to How it works; the six promises are white cards with
 * a line of sunrise along the top, the icon on a sunrise tile and a quiet number, lifting a little on hover.
 */
function Promises() {
  return (
    <section aria-labelledby="why-heading" className="relative overflow-hidden bg-surface-card">
      {/* A low sun behind the introduction (decorative). */}
      <div aria-hidden className="pointer-events-none absolute -left-48 top-0 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_20%,transparent),transparent_68%)]" />
      <div className="relative mx-auto grid w-full max-w-content grid-cols-1 gap-10 px-4 py-14 md:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:gap-14">
        <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>Fair and transparent</Eyebrow>
          <h2 id="why-heading" className="text-[2rem] font-semibold leading-tight tracking-tight text-[var(--ceda-night)] md:text-[2.5rem]">
            Why submit through {brand.header.title}
          </h2>
          <p className="text-[1.0625rem] leading-relaxed text-[var(--ceda-brown)]">
            Your idea is judged on its merits, by people who explain their scores, in a process you can follow.
          </p>
          <Link to="/how-it-works" className="mt-1 inline-flex min-h-touch items-center gap-2 self-start font-semibold text-brand-text underline-offset-4 hover:underline">
            See how ideas are reviewed <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PROMISES.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="relative flex flex-col gap-3 overflow-hidden rounded-[1.25rem] border border-line bg-white p-6 shadow-1 hover:shadow-2 motion-safe:transition motion-safe:duration-300 motion-safe:hover:-translate-y-1"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
              <span aria-hidden className="absolute right-5 top-5 text-sm font-bold tracking-wider text-[color-mix(in_srgb,var(--ceda-orange)_55%,transparent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span aria-hidden className="grid h-12 w-12 place-items-center rounded-[0.9rem] bg-[linear-gradient(135deg,var(--ceda-gold),var(--ceda-orange))] text-[var(--ceda-night)] shadow-1">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-semibold text-[var(--ceda-night)]">{title}</h3>
              <p className="text-ink-muted">{text}</p>
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
