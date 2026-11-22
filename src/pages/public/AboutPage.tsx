import { ArrowRight, Camera, ClipboardCheck, Eye, LockKeyhole, Search, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BRANDS, brand } from '@/brand'
import { CEDA } from '@/brand/ceda-info'
import { PHOTO_LIST } from '@/brand/photos'

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

export function AboutPage() {
  return (
    <article className="mx-auto flex w-full max-w-content flex-col gap-10 py-2 md:gap-12">
      <header className="grid items-center gap-8 rounded-md bg-[linear-gradient(120deg,var(--ceda-band-start),var(--ceda-band-end))] p-6 md:grid-cols-[minmax(0,1fr)_15rem] md:p-10">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ceda-maroon)]">The CEDA Innovation Portal</p>
          <h1 className="text-h1 font-semibold">About Us</h1>
          <p className="text-lg text-ink-muted">
            {brand.header.title} is a CEDA portal concept designed to connect innovators with challenge opportunities and make it easier to follow an idea through review.
          </p>
        </div>
        <div className="flex min-h-40 items-center justify-center rounded-md bg-white p-5 shadow-1">
          <img src={brand.logo.src} alt={`${brand.header.title}, CEDA Innovation Portal`} width={brand.logo.width} height={brand.logo.height} className="max-h-36 w-auto object-contain" />
        </div>
      </header>

      <section aria-labelledby="purpose-heading" className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Our purpose</p>
          <h2 id="purpose-heading" className="text-[2rem] font-normal leading-tight">Give good ideas a clear way forward</h2>
          <p className="text-ink-muted">
            Peolwane brings challenge information, proposal submission and case updates into one place. It is designed to help applicants understand what is being asked, submit against published criteria and see what happens next.
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-md border border-line bg-surface-card p-5 shadow-1 md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ceda-band-start)] text-[var(--ceda-maroon)]">
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

      <section aria-labelledby="pillars-heading" className="flex flex-col gap-5">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Designed for applicants</p>
          <h2 id="pillars-heading" className="text-[2rem] font-normal leading-tight">One portal, from challenge to decision</h2>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3 rounded-md border border-line bg-surface-card p-5 shadow-1">
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ceda-band-start)] text-[var(--ceda-maroon)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-h3 font-semibold">{title}</h3>
              <p className="text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ceda-heading" className="flex flex-col gap-5 rounded-md bg-[var(--ceda-night)] p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="self-start rounded-md bg-white p-2">
            <img src={BRANDS.ceda.logo.src} alt={`${CEDA.name} logo`} width={BRANDS.ceda.logo.width} height={BRANDS.ceda.logo.height} className="h-10 w-auto" />
          </span>
          <h2 id="ceda-heading" className="text-h2 font-semibold">A CEDA initiative</h2>
          <p className="text-white/85">
            The Citizen Entrepreneurial Development Agency (CEDA) supports citizen enterprise in Botswana. Peolwane is designed as a digital place to engage with CEDA innovation challenges.
          </p>
          <p className="text-sm text-white/75">This portal is a demonstration prototype with fictional example data; it is not a production application system.</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2">
          <Link to="/challenges" className="inline-flex min-h-touch items-center gap-2 rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink underline-offset-4 hover:underline">
            Explore challenges <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <a href={CEDA.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center gap-2 px-2 font-semibold text-white underline-offset-4 hover:underline">
            Visit CEDA’s website <ExternalLink aria-hidden className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </section>

      <PhotoCredits />
    </article>
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
