import { useState, type ReactNode } from 'react'
import { Check, CheckCircle2, Copy, FileText } from 'lucide-react'
import { formatBytes, formatDateTimeCAT } from '@/lib/format'

export interface ReceiptModel {
  reference: string
  version: number
  /** Server timestamp (UTC), shown in CAT. Never the device clock. */
  submittedAt: string
  challenge: string
  formVersion: string
  files: { name: string; sizeBytes: number }[]
  declarationAccepted: boolean
}

/**
 * Submission receipt (spec §5 ReceiptCard, §7 T05), laid out to Sandra's 21 Nov receipt frame ("ceda submittion"
 * in `Figma pdf/`): a tick in a green circle, "SUBMISSION RECEIPT" over the heading, then a card with the reference
 * large (with a copy button) above the details in rows. The same reference is shown for a retried submit.
 */
export function ReceiptCard({ receipt, headingLevel = 'h2' }: { receipt: ReceiptModel; /** 'h1' when the card is the page (T05). */ headingLevel?: 'h1' | 'h2' }) {
  const resubmission = receipt.version > 1
  const Heading = headingLevel
  const rows: [string, ReactNode][] = [
    ['Version', `Version ${receipt.version}`],
    [
      'Submitted',
      <>
        {formatDateTimeCAT(receipt.submittedAt)} <span className="text-ink-muted">(server time)</span>
      </>,
    ],
    ['Challenge', receipt.challenge],
    ['Form version', receipt.formVersion],
    [
      'Files',
      receipt.files.length === 0 ? (
        'None'
      ) : (
        <ul className="flex flex-col gap-1">
          {receipt.files.map((f) => (
            <li key={f.name} className="flex items-center gap-2">
              <FileText aria-hidden className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="break-all">{f.name}</span> <span className="text-sm text-ink-muted">({formatBytes(f.sizeBytes)})</span>
            </li>
          ))}
        </ul>
      ),
    ],
    ['Declaration', receipt.declarationAccepted ? 'Accepted' : 'Not recorded'],
  ]
  return (
    <section aria-labelledby="receipt-heading" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle">
          <CheckCircle2 aria-hidden className="h-7 w-7 text-success" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">Submission receipt</p>
        <Heading id="receipt-heading" className={`font-semibold ${headingLevel === 'h1' ? 'text-h1' : 'text-h2'}`}>
          {resubmission ? `Version ${receipt.version} submitted` : 'Idea submitted'}
        </Heading>
        <p className="text-ink-muted">{resubmission ? 'Your revised idea has been sent to CEDA.' : 'Your idea has been sent to CEDA.'}</p>
      </div>
      <div className="rounded-md border border-line bg-surface-card shadow-1">
        <div className="flex items-center justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">Reference</p>
            <p className="break-all text-h2 font-semibold text-brand-text">{receipt.reference}</p>
          </div>
          <CopyReference reference={receipt.reference} />
        </div>
        <dl className="flex flex-col divide-y divide-line px-5">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[9rem,1fr] md:gap-4">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="min-w-0 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/** The frame's round copy button beside the reference (the same behaviour as ReferencePill's). */
function CopyReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the reference stays visible and selectable.
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full border border-line hover:bg-surface-sunken print:hidden"
      >
        {copied ? <Check aria-hidden className="h-5 w-5 text-success" /> : <Copy aria-hidden className="h-5 w-5" />}
        <span className="sr-only">{copied ? 'Copied' : `Copy reference ${reference}`}</span>
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Reference copied' : ''}
      </span>
    </>
  )
}
