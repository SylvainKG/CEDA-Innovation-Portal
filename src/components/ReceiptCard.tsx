import { CheckCircle2, FileText } from 'lucide-react'
import { formatBytes, formatDateTimeCAT } from '@/lib/format'
import { ReferencePill } from './ReferencePill'

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

/** Submission receipt (spec §5 ReceiptCard, §7 T05). The same reference is shown for a retried submit. */
export function ReceiptCard({ receipt }: { receipt: ReceiptModel }) {
  const resubmission = receipt.version > 1
  return (
    <section aria-labelledby="receipt-heading" className="flex flex-col gap-4 rounded-md bg-surface-card p-6 shadow-1">
      <h2 id="receipt-heading" className="flex items-center gap-2 text-h2 font-semibold">
        <CheckCircle2 aria-hidden className="h-6 w-6 text-success" />
        {resubmission ? `Version ${receipt.version} submitted` : 'Idea submitted'}
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-[auto,1fr]">
        <dt className="text-sm text-ink-muted">Reference</dt>
        <dd>
          <ReferencePill reference={receipt.reference} copyable />
        </dd>
        <dt className="text-sm text-ink-muted">Version</dt>
        <dd>Version {receipt.version}</dd>
        <dt className="text-sm text-ink-muted">Submitted</dt>
        <dd>{formatDateTimeCAT(receipt.submittedAt)}</dd>
        <dt className="text-sm text-ink-muted">Challenge</dt>
        <dd>{receipt.challenge}</dd>
        <dt className="text-sm text-ink-muted">Form version</dt>
        <dd>{receipt.formVersion}</dd>
        <dt className="text-sm text-ink-muted">Files</dt>
        <dd>
          {receipt.files.length === 0 ? (
            'None'
          ) : (
            <ul className="flex flex-col gap-1">
              {receipt.files.map((f) => (
                <li key={f.name} className="flex items-center gap-2">
                  <FileText aria-hidden className="h-4 w-4 text-ink-muted" />
                  {f.name} <span className="text-sm text-ink-muted">({formatBytes(f.sizeBytes)})</span>
                </li>
              ))}
            </ul>
          )}
        </dd>
        <dt className="text-sm text-ink-muted">Declaration</dt>
        <dd>{receipt.declarationAccepted ? 'Accepted' : 'Not recorded'}</dd>
      </dl>
    </section>
  )
}
