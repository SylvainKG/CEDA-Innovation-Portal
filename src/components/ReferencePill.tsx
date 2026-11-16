import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export interface ReferencePillProps {
  reference: string
  copyable?: boolean
}

/** Case reference in mono, with an optional copy button and a "Copied" confirmation (spec §5). */
export function ReferencePill({ reference, copyable = false }: ReferencePillProps) {
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
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-sunken pl-3 pr-1 font-mono text-sm text-ink">
      <span className="py-1 pr-2">{reference}</span>
      {copyable ? (
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-touch min-w-touch items-center justify-center gap-1 rounded-full font-sans hover:bg-surface-card"
        >
          {copied ? <Check aria-hidden className="h-4 w-4 text-success" /> : <Copy aria-hidden className="h-4 w-4" />}
          <span className="sr-only">{copied ? 'Copied' : `Copy reference ${reference}`}</span>
        </button>
      ) : null}
      <span role="status" className="sr-only">
        {copied ? 'Reference copied' : ''}
      </span>
    </span>
  )
}
