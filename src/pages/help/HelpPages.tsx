import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  CircleHelp,
  Copyright,
  Cpu,
  Handshake,
  Info,
  Landmark,
  LifeBuoy,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Rocket,
  Ruler,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { PlainMarkdown, SampleLabel, TextField } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { ContentKind, ContentPage } from '@/lib/api/types'
import { assistantConfig } from '@/features/assistant/leseding'
import { CEDA, telHref } from '@/brand/ceda-info'
import { PHOTOS } from '@/brand/photos'
import { PhotoBanner } from '@/pages/public/PhotoBanner'
import { PageHeader } from '@/layouts/PageHeader'

const BranchNetworkMap = lazy(() => import('./BranchNetworkMap').then((module) => ({ default: module.BranchNetworkMap })))

/**
 * T03 content variants (spec T03, HLP-01), built from the written spec (BCR-003; design review pending):
 * FAQs (searchable accordion), regulatory contacts and referral information (cards), fault support and the
 * privacy notice. All wording comes from `content_pages`; nothing is written here, and sample wording is
 * labelled.
 */

function useContent(kind: ContentKind) {
  return useQuery({ queryKey: ['content', kind], queryFn: () => api.content.list(kind), staleTime: 5 * 60_000 })
}

/** The help pages, in the side panel; the current one is marked. */
const HELP_TOPICS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/help/faqs', label: 'Frequently asked questions', icon: CircleHelp },
  { to: '/help/support', label: 'Report a fault', icon: Wrench },
  { to: '/help/contacts', label: 'Contact CEDA and branches', icon: Phone },
  { to: '/privacy', label: 'Privacy notice', icon: ShieldCheck },
]

/**
 * The frame of the help pages (post-freeze, ABM 22 Nov): the portal's sunrise header, the page's content, and beside
 * it (from 1024 px, staying in view) the help topics and where else to turn. Applicants see these pages inside their
 * own workspace, so the frame keeps them looking like the rest of the portal.
 */
function PageFrame({ title, intro, eyebrow = 'Help', children }: { title: string; intro?: ReactNode; eyebrow?: string; children: ReactNode }) {
  return (
    <div className="flex w-full max-w-content flex-col gap-6">
      <PageHeader eyebrow={eyebrow} title={title} intro={intro} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
        <HelpAside />
      </div>
    </div>
  )
}

function HelpAside() {
  const { pathname } = useLocation()
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
      <nav aria-labelledby="help-topics-heading" className="flex flex-col gap-1 rounded-md border border-line bg-surface-card p-3 shadow-1">
        <h2 id="help-topics-heading" className="px-2 pb-1 pt-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
          Help topics
        </h2>
        <ul className="flex flex-col gap-0.5">
          {HELP_TOPICS.map(({ to, label, icon: Icon }) => {
            const current = pathname === to
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={current ? 'page' : undefined}
                  className={`relative flex min-h-touch items-center gap-3 rounded-md px-2 text-ink no-underline hover:bg-surface-sunken ${current ? 'bg-brand-subtle font-semibold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand before:content-[""]' : ''}`}
                >
                  <Icon aria-hidden className={`h-5 w-5 shrink-0 ${current ? 'text-brand-text' : 'text-ink-muted'}`} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="flex flex-col gap-2 rounded-md bg-[var(--ceda-night)] p-5 text-sm text-white shadow-1">
        <p className="font-semibold">Still stuck?</p>
        <p className="text-white/85">Ask Peolwane AI, the assistant at the bottom right of every page, or call CEDA toll-free.</p>
        <a href={telHref(CEDA.headOffice.tollFree)} className="inline-flex min-h-touch items-center gap-2 self-start font-semibold text-[var(--ceda-gold)] no-underline hover:underline">
          <PhoneCall aria-hidden className="h-4 w-4" /> {CEDA.headOffice.tollFree}
        </a>
      </div>
    </aside>
  )
}

function ContentStates({ query, what, children }: { query: ReturnType<typeof useContent>; what: string; children: (rows: ContentPage[]) => ReactNode }) {
  if (query.isPending) return <LoadingState what={what} />
  if (query.isError) return <ErrorState level="h2" message={`We couldn't load the ${what}.`} onRetry={() => void query.refetch()} />
  if (query.data.length === 0) return <EmptyState level="h2" title={`No ${what} yet`} />
  return <>{children(query.data)}</>
}

function SampleNote({ rows }: { rows: ContentPage[] }) {
  return rows.some((r) => r.is_sample) ? (
    <p>
      <SampleLabel />
    </p>
  ) : null
}

export function FaqPage() {
  const faqs = useContent('faq')
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()

  return (
    <PageFrame title="Frequently asked questions" intro="Answers about applying, reviews and your data.">
      <ContentStates query={faqs} what="questions">
        {(rows) => {
          const shown = term ? rows.filter((r) => `${r.title} ${r.body_md}`.toLowerCase().includes(term)) : rows
          return (
            <>
              <SampleNote rows={rows} />
              <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-card p-4 shadow-1">
                <TextField id="faq-search" label="Search the questions" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
                <p role="status" className="text-sm text-ink-muted">
                  {term ? `${shown.length} of ${rows.length} questions match` : `${rows.length} questions`}
                </p>
              </div>
              {shown.length === 0 ? (
                <EmptyState level="h2" title="No questions match your search">
                  Try other words, or <Link to="/help/support">contact support</Link>.
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-3">
                  {shown.map((faq) => (
                    <li key={faq.slug}>
                      {/* Native disclosure: keyboard and screen-reader support without extra code. */}
                      <details className="group relative overflow-hidden rounded-md border border-line bg-surface-card shadow-1 open:shadow-2">
                        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-transparent group-open:bg-[linear-gradient(180deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
                        <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold hover:bg-[var(--ceda-surface-warm)]">
                          <span>{faq.title}</span>
                          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken transition-colors group-open:bg-[var(--ceda-maroon)] group-open:text-white">
                            <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                          </span>
                        </summary>
                        <div className="border-t border-line px-5 pb-5 pt-3 text-ink-muted">
                          <PlainMarkdown source={faq.body_md} />
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        }}
      </ContentStates>
    </PageFrame>
  )
}

/** An icon for a regulatory office or support programme, from the words in its title (the content has none). */
function iconFor(row: ContentPage): LucideIcon {
  const t = `${row.slug} ${row.title}`.toLowerCase()
  if (/compan|registr/.test(t)) return Building2
  if (/licen/.test(t)) return BadgeCheck
  if (/standard/.test(t)) return Ruler
  if (/intellectual|\bip\b|patent|trade ?mark/.test(t)) return Copyright
  if (/financ|loan|credit/.test(t)) return Landmark
  if (/fund|grant/.test(t)) return Rocket
  if (/mentor|coach|advis/.test(t)) return Handshake
  if (/digital|hub|tech/.test(t)) return Cpu
  return Info
}

/**
 * Contact and referral entries come from the content table. Until CEDA confirms an entry it is flagged `is_sample`
 * (placeholder wording the team wrote), and the page must say so. When every entry in a section is a placeholder, one
 * note says it for the section; a label on each card is kept only for a mix of confirmed and placeholder entries.
 */
function SampleSectionNote({ rows, what }: { rows: ContentPage[]; what: string }) {
  if (!rows.length || !rows.every((r) => r.is_sample)) return null
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
      <SampleLabel text="Placeholder entries" />
      <span>CEDA has not yet confirmed these {what}, so their details are examples.</span>
    </p>
  )
}

/** CEDA's head office, as one line for a maps search. */
const HEAD_OFFICE_QUERY = `CEDA ${CEDA.headOffice.lines.join(', ')}`

/** The four ways to reach CEDA, as tiles under the page header. */
const QUICK_CONTACTS: { icon: LucideIcon; label: string; value: string; note: string; href: string; external?: boolean }[] = [
  { icon: PhoneCall, label: 'Toll-free line', value: CEDA.headOffice.tollFree, note: 'CEDA’s toll-free number', href: telHref(CEDA.headOffice.tollFree) },
  { icon: Phone, label: 'Head office', value: CEDA.headOffice.phone, note: 'Gaborone switchboard', href: telHref(CEDA.headOffice.phone) },
  { icon: Mail, label: 'Email', value: CEDA.headOffice.email, note: 'Questions and feedback', href: `mailto:${CEDA.headOffice.email}` },
  {
    icon: MapPin,
    label: 'Visit',
    value: CEDA.headOffice.lines[0] ?? 'Head office',
    note: CEDA.headOffice.lines.slice(1).join(', '),
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(HEAD_OFFICE_QUERY)}`,
    external: true,
  },
]

const sectionEyebrow = 'text-sm font-bold uppercase tracking-wider text-brand-text'
const sectionTitle = 'text-[1.75rem] font-normal leading-tight md:text-[2rem]'

/**
 * T03 contacts (post-freeze redesign, ABM 22 Nov): a header on a photo of Gaborone's CBD, where CEDA's head office
 * is; four tiles to call, email or visit CEDA; the branch network map and photos of CEDA's offices; the regulatory
 * offices as cards with an icon each; the other support programmes on a warm band, with the note that CEDA does not
 * endorse them; and where to get help with the portal itself.
 */
export function ContactsPage() {
  const contacts = useContent('contact')
  const referrals = useContent('referral')
  return (
    <div className="flex w-full max-w-content flex-col gap-12 md:gap-14">
      <div className="flex flex-col gap-4">
        <PhotoBanner photo={PHOTOS.gaboroneCbd} eyebrow="Contact CEDA" title="Contact and branch network">
          <p className="text-white/90 md:text-[1.0625rem]">
            Call, email or visit CEDA, find the branch nearest you, or reach the offices and programmes that help businesses register, protect and grow
            their ideas.
          </p>
        </PhotoBanner>
        <ul aria-label="Ways to reach CEDA" className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {QUICK_CONTACTS.map(({ icon: Icon, label, value, note, href, external }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex h-full items-start gap-3 rounded-md border border-line bg-surface-card p-4 text-ink no-underline shadow-1 transition-shadow hover:shadow-2"
              >
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ceda-maroon)] text-white transition-colors group-hover:bg-[var(--ceda-orange)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-bold uppercase tracking-wider text-ink-muted">{label}</span>
                  <span className="break-words font-semibold group-hover:underline">{value}</span>
                  <span className="text-sm text-ink-muted">
                    {note}
                    {external ? <span className="sr-only"> (opens a map in a new tab)</span> : null}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <Suspense
        fallback={
          <div role="status" className="min-h-[22rem] rounded-[2rem] border border-line bg-surface-card p-5 text-ink-muted sm:min-h-[27rem]">
            Loading the interactive branch map…
          </div>
        }
      >
        <BranchNetworkMap />
      </Suspense>

      <section aria-labelledby="contacts-heading" className="flex flex-col gap-5">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className={sectionEyebrow}>Registration and compliance</p>
          <h2 id="contacts-heading" className={sectionTitle}>
            Regulatory offices
          </h2>
          <p className="text-ink-muted">Offices that can help with registration, licensing, standards and intellectual property.</p>
        </div>
        <ContentStates query={contacts} what="contacts">
          {(rows) => (
            <>
            <SampleSectionNote rows={rows} what="offices" />
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {rows.map((row) => {
                const Icon = iconFor(row)
                return (
                  <li key={row.slug} className="group relative flex flex-col gap-3 overflow-hidden rounded-md border border-line bg-surface-card p-5 shadow-1 transition-shadow hover:shadow-2">
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
                    <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--ceda-gold)_22%,transparent)] text-[var(--ceda-maroon)]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="text-h3 font-semibold">{row.title}</h3>
                    <div className="text-sm text-ink-muted">
                      <PlainMarkdown source={row.body_md} />
                    </div>
                    {row.is_sample && !rows.every((r) => r.is_sample) ? (
                      <div className="mt-auto">
                        <SampleLabel />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            </>
          )}
        </ContentStates>
      </section>

      <section
        aria-labelledby="referrals-heading"
        className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--ceda-band-start),var(--ceda-band-end))] px-5 py-8 md:px-10 md:py-10"
      >
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_55%,transparent),transparent_68%)]" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-wider text-[var(--ceda-maroon)]">Beyond CEDA</p>
            <h2 id="referrals-heading" className={sectionTitle}>
              Other support programmes
            </h2>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-white/80 px-4 py-3 text-sm md:max-w-sm">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ceda-maroon)]" />
            <p>Listed for information only. CEDA does not endorse these programmes.</p>
          </div>
        </div>
        <ContentStates query={referrals} what="programmes">
          {(rows) => (
            <>
            <SampleSectionNote rows={rows} what="programmes" />
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rows.map((row) => {
                const Icon = iconFor(row)
                return (
                  <li key={row.slug} className="flex gap-4 rounded-md bg-surface-card p-5 shadow-1">
                    <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ceda-night)] text-[var(--ceda-gold)]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <h3 className="text-h3 font-semibold">{row.title}</h3>
                      <div className="text-sm text-ink-muted">
                        <PlainMarkdown source={row.body_md} />
                      </div>
                      {row.is_sample && !rows.every((r) => r.is_sample) ? (
                        <div>
                          <SampleLabel />
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
            </>
          )}
        </ContentStates>
      </section>

      <section aria-labelledby="portal-help-heading" className="grid grid-cols-1 items-center gap-6 rounded-[2rem] bg-[var(--ceda-night)] px-6 py-8 text-white md:grid-cols-[minmax(0,1fr)_auto] md:px-10">
        <div className="flex items-start gap-4">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--ceda-gold)]">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="portal-help-heading" className="text-h2 font-semibold">
              Need help with the portal itself?
            </h2>
            <p className="text-white/85">Read the FAQs, report a fault, or ask Peolwane AI at the bottom of the page.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/help/faqs" className="inline-flex min-h-touch items-center rounded-full bg-[var(--ceda-gold)] px-5 font-semibold text-ink no-underline hover:bg-[var(--ceda-amber)]">
            Read the FAQs
          </Link>
          <Link to="/help/support" className="inline-flex min-h-touch items-center rounded-full border border-white/40 px-5 font-semibold text-white no-underline hover:bg-white/10">
            Report a fault
          </Link>
        </div>
      </section>
    </div>
  )
}

export function SupportPage() {
  const support = useContent('support')
  return (
    <PageFrame title="Fault support" intro="Tell us when something in the portal doesn't work.">
      <ContentStates query={support} what="support information">
        {(rows) => (
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <section key={row.slug} aria-labelledby={`support-${row.slug}`} className="relative flex flex-col gap-3 overflow-hidden rounded-md border border-line bg-surface-card p-5 shadow-1 md:p-6">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
                <h2 id={`support-${row.slug}`} className="flex items-center gap-3 text-h2 font-semibold">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ceda-gold)_25%,transparent)] text-[var(--ceda-maroon)]">
                    <LifeBuoy className="h-5 w-5" />
                  </span>
                  {row.title}
                </h2>
                <PlainMarkdown source={row.body_md} />
                {row.is_sample ? <SampleLabel /> : null}
              </section>
            ))}
          </div>
        )}
      </ContentStates>
    </PageFrame>
  )
}

export function PrivacyPage() {
  const notice = useQuery({ queryKey: ['privacy-notice'], queryFn: () => api.session.getPrivacyNotice(), staleTime: 5 * 60_000 })
  if (notice.isPending) return <LoadingState what="the privacy notice" />
  if (notice.isError) return <ErrorState level="h1" message="We couldn't load the privacy notice." onRetry={() => void notice.refetch()} />
  return (
    <PageFrame eyebrow="Your data" title={notice.data.title} intro="How the portal uses the information you give it.">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>Version {notice.data.version}</span>
        {notice.data.is_sample ? <SampleLabel /> : null}
      </div>
      <div className="relative overflow-hidden rounded-md border border-line bg-surface-card p-5 shadow-1 md:p-8">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
        <PlainMarkdown source={notice.data.body_md} />
      </div>
      {assistantConfig ? (
        <section aria-labelledby="privacy-ai-heading" className="flex flex-col gap-2 rounded-md border border-line bg-surface-card p-5 shadow-1 md:p-8">
          <h2 id="privacy-ai-heading" className="text-h2 font-semibold">
            Peolwane AI
          </h2>
          <p>
            Peolwane AI, the assistant at the bottom right of every page, is provided for us by the Leseding AI Engine, which uses Google
            Gemini. When you use it, what you type, or a recording of what you say, is sent to that service to answer you, and the spoken
            reply is made there. We use it only to answer you. The Leseding AI Engine processes what you send to produce the answer; its own
            retention terms are not yet confirmed.
          </p>
          <p>
            Peolwane AI is not given your proposals, your cases or anything else from your account: it only sees what you type or say to it.
            Please don&apos;t tell it personal details or the content of an idea. The portal keeps the conversation only while the page is open. Using
            it is optional; everything on the portal works without it.
          </p>
        </section>
      ) : null}
    </PageFrame>
  )
}
