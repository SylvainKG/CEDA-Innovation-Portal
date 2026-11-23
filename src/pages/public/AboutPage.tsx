import { ArrowDown, ArrowRight, Camera, ClipboardCheck, Eye, LockKeyhole, Search, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BRANDS, brand } from '@/brand'
import { CEDA } from '@/brand/ceda-info'
import { PHOTOS, PHOTO_LIST } from '@/brand/photos'

const PILLARS = [
  {
    icon: Search,
    title: 'Find a clear opportunity',
    text: 'Challenge briefs describe the problem, who can apply, the deadline and the criteria used to assess ideas.',
  },
  {
    icon: ClipboardCheck,
    title: 'Follow a transparent process',
    text: 'Applicants can see their case progress and respond in the portal if CEDA requests clarification or a revision.',
  },
  {
    icon: LockKeyhole,
    title: 'Keep proposals private',
    text: 'A proposal is visible to its applicant and CEDA staff assigned to that case.',
  },
]

/** Facts about the process, each true of the system as built. */
const FIGURES = [
  { figure: '5', label: 'stages, from submission to award' },
  { figure: '2+', label: 'independent reviewers score every idea' },
  { figure: '1', label: 'place to follow your idea, from challenge to decision' },
]

const Eyebrow = ({ children, onDark = false }: { children: string; onDark?: boolean }) => (
  <p className={`text-xs font-bold uppercase tracking-wider ${onDark ? 'text-[var(--ceda-gold)]' : 'text-brand-text'}`}>{children}</p>
)

/**
 * About Us (post-freeze, ABM 22 Nov), in the language of the home and challenge pages: a photo banner over Gaborone
 * with the page's one h1; the story of the name (the swallow that brings the rains, from the team's brand concept,
 * Option 1) beside the swallow photo; the portal's purpose; three figures about the process; the three pillars; CEDA
 * on its night-brown band with the sun's glow; and the photo credits.
 */
export function AboutPage() {
  return (
    <article className="mx-auto flex w-full max-w-content flex-col gap-12 py-2 md:gap-16">
      <AboutHero />
      <Story />

      <section aria-labelledby="purpose-heading" className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center">
        <div className="flex flex-col gap-3">
          <Eyebrow>Our purpose</Eyebrow>
          <h2 id="purpose-heading" className="text-[2rem] font-normal leading-tight">
            Give good ideas a clear way forward
          </h2>
          <p className="text-ink-muted">
            {brand.header.title} brings challenge information, proposal submission and case updates into one place. It is designed to help applicants understand
            what is being asked, submit against published criteria and see what happens next.
          </p>
        </div>
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-line bg-surface-card p-6 shadow-1 md:p-7">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(253,200,13,0.25)] text-[var(--ceda-maroon)]">
              <Eye aria-hidden className="h-5 w-5" />
            </span>
            <h2 className="text-h2 font-semibold">What guides the portal</h2>
          </div>
          <p className="text-ink-muted">Clear criteria, recorded review decisions, private case access and useful feedback are built into the journey.</p>
          <Link to="/how-it-works" className="inline-flex min-h-touch items-center gap-2 self-start font-semibold text-brand-text underline-offset-4 hover:underline">
            See how it works <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <ul aria-label="The process in figures" className="grid gap-4 md:grid-cols-3">
        {FIGURES.map(({ figure, label }) => (
          <li
            key={label}
            className="relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#fff3e2,#ffe0b8)] p-6 motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-0.5"
          >
            <span aria-hidden className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(253,200,13,0.55),transparent_70%)]" />
            <span className="relative text-[2.75rem] font-semibold leading-none tabular-nums text-[var(--ceda-maroon)]">{figure}</span>
            <span className="relative font-semibold text-[var(--ceda-brown)]">{label}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="pillars-heading" className="flex flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-2">
          <Eyebrow>Designed for applicants</Eyebrow>
          <h2 id="pillars-heading" className="text-[2rem] font-normal leading-tight">
            One portal, from challenge to decision
          </h2>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="relative flex flex-col gap-3 overflow-hidden rounded-[1.5rem] border border-line bg-surface-card p-6 shadow-1 motion-safe:transition-shadow motion-safe:duration-300 hover:shadow-2"
            >
              <span aria-hidden className="absolute right-5 top-4 text-[3rem] font-semibold leading-none text-[rgba(248,165,27,0.35)]">
                {i + 1}
              </span>
              <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ceda-night)] text-[var(--ceda-gold)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-h3 font-semibold">{title}</h3>
              <p className="text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="ceda-heading"
        className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] p-6 text-white shadow-2 md:flex-row md:items-center md:justify-between md:p-10"
      >
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(253,200,13,0.35),transparent_65%)]" />
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="self-start rounded-md bg-white p-2 shadow-1">
            <img src={BRANDS.ceda.logo.src} alt={`${CEDA.name} logo`} width={BRANDS.ceda.logo.width} height={BRANDS.ceda.logo.height} className="h-10 w-auto" />
          </span>
          <h2 id="ceda-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">
            A CEDA initiative
          </h2>
          <p className="text-white/85">
            The Citizen Entrepreneurial Development Agency (CEDA) supports citizen enterprise in Botswana. {brand.header.title} is designed as a digital place
            to engage with CEDA innovation challenges.
          </p>
          <p className="text-sm text-white/75">This portal is a demonstration prototype with fictional example data; it is not a production application system.</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2">
          <Link
            to="/challenges"
            className="inline-flex min-h-touch items-center gap-2 rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)]"
          >
            Explore challenges <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <a
            href={CEDA.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center gap-2 px-2 font-semibold text-white underline-offset-4 hover:underline"
          >
            Visit CEDA’s website <ExternalLink aria-hidden className="h-4 w-4" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </section>

      <PhotoCredits />
    </article>
  )
}

/** The banner: Gaborone's skyline under a night-brown wash, the page's one h1, and the swallow beside it. */
function AboutHero() {
  const city = PHOTOS.gaboroneCbd
  return (
    <header className="relative isolate overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] text-white shadow-2">
      <img src={city.src} alt="" width={city.width} height={city.height} decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(43,29,25,0.96)_0%,rgba(43,29,25,0.86)_52%,rgba(43,29,25,0.45)_100%)]" />
      <div className="grid items-center gap-8 px-6 py-10 md:px-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex max-w-2xl flex-col items-start gap-4">
          <Eyebrow onDark>The CEDA Innovation Portal</Eyebrow>
          <h1 className="text-[2.5rem] font-normal leading-tight md:text-[3.25rem]">About Us</h1>
          <p className="text-lg text-white/85">
            {brand.header.title} is a CEDA portal concept designed to connect innovators with challenge opportunities and make it easier to follow an idea through
            review.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/challenges"
              className="inline-flex min-h-touch items-center gap-2 rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)]"
            >
              Browse challenges <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <a href="#our-story" className="inline-flex min-h-touch items-center gap-2 rounded-full border border-white/40 px-5 font-semibold text-white no-underline hover:bg-white/10">
              Our story <ArrowDown aria-hidden className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div aria-hidden className="hidden justify-self-end lg:block">
          <span className="flex h-56 w-56 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(253,200,13,0.4),transparent_68%)]">
            <span className="rounded-[1.5rem] bg-white p-4 shadow-2">
              <img src={brand.mark.src} alt="" width={brand.mark.width} height={brand.mark.height} className="h-24 w-auto" />
            </span>
          </span>
        </div>
      </div>
    </header>
  )
}

/** Why the name: the swallow that brings the rains (team brand concept, Option 1, 21 Nov 2026), with its photo. */
function Story() {
  const swallow = PHOTOS.swallow
  return (
    <section id="our-story" aria-labelledby="story-heading" className="grid scroll-mt-28 items-center gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:gap-12">
      <figure className="relative mx-auto w-full max-w-md">
        <div className="overflow-hidden rounded-[2rem] shadow-2 ring-4 ring-white">
          <img src={swallow.src} alt={swallow.alt} width={swallow.width} height={swallow.height} loading="lazy" decoding="async" className="aspect-square h-auto w-full object-cover" />
        </div>
        <figcaption className="relative -mt-6 ml-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ceda-brown)] shadow-1">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--ceda-orange)]" />
          {swallow.caption}
        </figcaption>
      </figure>
      <div className="flex flex-col gap-4">
        <Eyebrow>{`Why ${brand.header.title}`}</Eyebrow>
        <h2 id="story-heading" className="text-[2rem] font-normal leading-tight">
          Named after the swallow that brings the rains
        </h2>
        <p className="text-ink-muted">
          In Botswana, the swallow, <em lang="tn">peolwane</em>, is a sign that the rainy season is coming. Rain carries the promise of life, renewal and
          prosperity: it lets seeds take root and grow.
        </p>
        <p className="text-ink-muted">
          The portal aims to do the same for ideas: a place to present them, receive constructive feedback, refine them and grow them into enterprises. A new
          season for innovation.
        </p>
        <ul className="flex flex-wrap gap-2">
          {['Hope', 'Renewal', 'New opportunities'].map((v) => (
            <li key={v} className="rounded-full border border-[var(--ceda-amber)] bg-white px-4 py-1.5 text-sm font-semibold text-[var(--ceda-brown)]">
              {v}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * Credits for the photographs on the public pages, as their open licences require: what each shows, who took it,
 * the licence (linked) and the source page on Wikimedia Commons. A gallery card per photo, so the credit sits with the
 * picture it belongs to. The list comes from src/brand/photos.ts.
 */
function PhotoCredits() {
  return (
    <section
      id="photo-credits"
      aria-labelledby="photo-credits-heading"
      className="flex scroll-mt-28 flex-col gap-6 rounded-[2rem] border border-line bg-surface-card p-5 shadow-1 md:p-10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-text">
            <Camera aria-hidden className="h-4 w-4" />
            Photo credits
          </p>
          <h2 id="photo-credits-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">
            The photographs on these pages
          </h2>
          <p className="text-ink-muted">
            Real photographs of Botswana, and of the swallow that gives {brand.header.title} its name, shared on Wikimedia Commons under open licences. We
            resized them and cropped one; nothing else was changed. Thank you to the photographers.
          </p>
        </div>
        <a
          href="https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch items-center gap-2 self-start rounded-full border border-line px-4 font-semibold text-ink no-underline hover:bg-surface-sunken md:shrink-0 md:self-auto"
        >
          About reusing Commons photos <ExternalLink aria-hidden className="h-4 w-4" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PHOTO_LIST.map((p) => (
          <li key={p.src} className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface-page">
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
              <img
                src={p.src}
                alt=""
                width={p.width}
                height={p.height}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">{p.caption}</span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p>{p.alt}</p>
              <dl className="mt-auto grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Photographer</dt>
                <dd className="font-semibold">{p.credit.author}</dd>
                <dt className="text-ink-muted">Licence</dt>
                <dd>
                  {p.credit.licenceUrl ? (
                    <a
                      href={p.credit.licenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full bg-[var(--ceda-band-start)] px-2.5 py-0.5 font-semibold text-[var(--ceda-brown)] no-underline hover:underline"
                    >
                      {p.credit.licence}
                      <span className="sr-only"> licence (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="inline-flex rounded-full bg-[var(--ceda-band-start)] px-2.5 py-0.5 font-semibold text-[var(--ceda-brown)]">{p.credit.licence}</span>
                  )}
                </dd>
              </dl>
              <div className="border-t border-line pt-1">
                <a
                  href={p.credit.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand-text underline-offset-4 hover:underline"
                >
                  View on Wikimedia Commons <ExternalLink aria-hidden className="h-4 w-4" />
                  <span className="sr-only">: {p.alt} (opens in a new tab)</span>
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
