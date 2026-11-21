import { Printer } from 'lucide-react'
import { brand } from '@/brand'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button, ErrorState, LoadingState, NotFoundState, ReceiptCard, ButtonLink } from '@/components'
import { useReceipt } from '@/features/submission/queries'

/**
 * T05 — Confirmation receipt (spec §7 T05; APP-03). Built from the written spec (BCR-003, D-45 proposed).
 * Route: `/ideas/:id/receipt?v=`. Everything shown comes from the server's receipt: the time is the server's
 * (CAT), never the device clock. A retried submit shows the same receipt. Another person's case → Not found.
 */
export function ReceiptPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const versionNo = Math.max(1, Number.parseInt(params.get('v') ?? '1', 10) || 1)
  const receipt = useReceipt(id, versionNo)

  if (receipt.isPending) return <LoadingState what="your receipt" />
  if (receipt.isError) return <ErrorState level="h1" message="We couldn't load your receipt. Your idea is safe." onRetry={() => void receipt.refetch()} />
  if (!receipt.data.found) return <NotFoundState home="/ideas" />
  const r = receipt.data

  return (
    <div className="mx-auto flex w-full max-w-[38rem] flex-col gap-6">
      {/* The DEMO badge is in the header, which is not printed; a printed receipt must still say it is fictional. */}
      {/* The header (with the logo) is not printed, so the printed receipt carries the logo itself. */}
      <img src={brand.mark.src} alt={brand.fullName} width={brand.mark.width} height={brand.mark.height} className="hidden h-16 w-auto self-start print:block" />
      <p className="hidden border-2 border-ink p-2 font-semibold print:block">DEMO — fictional data. This is not a real CEDA receipt.</p>
      <ReceiptCard
        headingLevel="h1"
        receipt={{
          reference: r.reference,
          version: r.version_no,
          submittedAt: r.submitted_at,
          challenge: r.challenge.title,
          formVersion: `Form version ${r.form_version}`,
          files: r.files.map((f) => ({ name: f.filename, sizeBytes: f.size_bytes })),
          declarationAccepted: Boolean(r.declaration_accepted_at),
        }}
      />
      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <ButtonLink to={`/ideas/${r.proposal_id}`}>
          View my idea
        </ButtonLink>
        <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
          Print receipt
        </Button>
      </div>
      <section aria-labelledby="next-heading" className="flex flex-col gap-2">
        <h2 id="next-heading" className="text-h2 font-semibold">
          What happens next
        </h2>
        <ol className="list-decimal pl-6">
          <li>
            <strong>Review:</strong> CEDA checks that your idea fits the challenge, then two assessors score it.
          </li>
          <li>
            <strong>Feedback:</strong> if CEDA needs more from you, you get a message and a deadline here and by email.
          </li>
          <li>
            <strong>Approval:</strong> you see the decision on your idea's page as soon as it's published.
          </li>
        </ol>
        <p className="text-sm text-ink-muted">Keep your reference: {r.reference}. Only you and CEDA staff assigned to this case can see your idea.</p>
      </section>
    </div>
  )
}
