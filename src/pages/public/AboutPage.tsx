import { ArrowRight, ClipboardCheck, Eye, LockKeyhole, Search, ExternalLink } from 'lucide-react'
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
 * the licence (linked) and the source page on Wikimedia Commons. The list comes from src/brand/photos.ts.
 */
function PhotoCredits() {
  return (
    <section id="photo-credits" aria-labelledby="photo-credits-heading" className="flex scroll-mt-28 flex-col gap-4 border-t border-line pt-8">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 id="photo-credits-heading" className="text-h2 font-semibold">
          Photo credits
        </h2>
        <p className="text-ink-muted">
          The photographs of Botswana on these pages come from Wikimedia Commons and are used under their open licences. They were resized, and one was
          cropped; nothing else was changed.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PHOTO_LIST.map((p) => (
          <li key={p.src} className="flex gap-3 rounded-md border border-line bg-surface-card p-3">
            <img src={p.src} alt="" width={p.width} height={p.height} loading="lazy" decoding="async" className="h-20 w-24 shrink-0 rounded-sm object-cover" />
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span className="font-semibold">{p.alt}</span>
              <span className="text-ink-muted">
                By {p.credit.author} ·{' '}
                {p.credit.licenceUrl ? (
                  <a href={p.credit.licenceUrl} target="_blank" rel="noopener noreferrer">
                    {p.credit.licence}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  p.credit.licence
                )}{' '}
                ·{' '}
                <a href={p.credit.source} target="_blank" rel="noopener noreferrer">
                  Source<span className="sr-only">: {p.alt}, on Wikimedia Commons (opens in a new tab)</span>
                </a>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
