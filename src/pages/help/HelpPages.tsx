import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { PlainMarkdown, SampleLabel, TextField } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { ContentKind, ContentPage } from '@/lib/api/types'

/**
 * T03 content variants (spec T03, HLP-01), built from the written spec (BCR-003; design review pending):
 * FAQs (searchable accordion), regulatory contacts and referral information (cards), fault support and the
 * privacy notice. All wording comes from `content_pages`; nothing is written here, and sample wording is
 * labelled.
 */

function useContent(kind: ContentKind) {
  return useQuery({ queryKey: ['content', kind], queryFn: () => api.content.list(kind), staleTime: 5 * 60_000 })
}

function PageFrame({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex max-w-form flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-semibold">{title}</h1>
        {intro ? <p className="text-ink-muted">{intro}</p> : null}
      </div>
      {children}
    </div>
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
              <TextField id="faq-search" label="Search the questions" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
              <p role="status" className="text-sm text-ink-muted">
                {term ? `${shown.length} of ${rows.length} questions match` : `${rows.length} questions`}
              </p>
              {shown.length === 0 ? (
                <EmptyState level="h2" title="No questions match your search">
                  Try other words, or <Link to="/help/support">contact support</Link>.
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-2">
                  {shown.map((faq) => (
                    <li key={faq.slug}>
                      {/* Native disclosure: keyboard and screen-reader support without extra code. */}
                      <details className="group rounded-md bg-surface-card shadow-1">
                        <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold">
                          <span>{faq.title}</span>
                          <ChevronDown aria-hidden className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="px-4 pb-4">
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

function CardList({ rows }: { rows: ContentPage[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {rows.map((row) => (
        <li key={row.slug} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <h3 className="text-h3 font-semibold">{row.title}</h3>
          <PlainMarkdown source={row.body_md} />
          {row.is_sample ? <SampleLabel /> : null}
        </li>
      ))}
    </ul>
  )
}

export function ContactsPage() {
  const contacts = useContent('contact')
  const referrals = useContent('referral')
  return (
    <PageFrame title="Regulatory contacts" intro="Offices that can help with registration, licensing, standards and intellectual property.">
      <section aria-labelledby="contacts-heading" className="flex flex-col gap-3">
        <h2 id="contacts-heading" className="text-h2 font-semibold">
          Regulatory offices
        </h2>
        <ContentStates query={contacts} what="contacts">
          {(rows) => <CardList rows={rows} />}
        </ContentStates>
      </section>
      <section aria-labelledby="referrals-heading" className="flex flex-col gap-3">
        <h2 id="referrals-heading" className="text-h2 font-semibold">
          Other support programmes
        </h2>
        <p className="text-ink-muted">Listed for information only. CEDA does not endorse these programmes.</p>
        <ContentStates query={referrals} what="programmes">
          {(rows) => <CardList rows={rows} />}
        </ContentStates>
      </section>
    </PageFrame>
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
              <section key={row.slug} aria-labelledby={`support-${row.slug}`} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
                <h2 id={`support-${row.slug}`} className="text-h2 font-semibold">
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
    <PageFrame title={notice.data.title}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>Version {notice.data.version}</span>
        {notice.data.is_sample ? <SampleLabel /> : null}
      </div>
      <div className="rounded-md bg-surface-card p-4 shadow-1">
        <PlainMarkdown source={notice.data.body_md} />
      </div>
    </PageFrame>
  )
}
