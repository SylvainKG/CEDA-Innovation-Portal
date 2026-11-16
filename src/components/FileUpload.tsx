import { useId, useRef, type ChangeEvent } from 'react'
import { AlertCircle, CheckCircle2, FileText, RotateCcw, Upload } from 'lucide-react'
import { Button } from './Button'
import { ProgressIndicator } from './ProgressIndicator'
import { formatBytes } from '@/lib/format'

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; fileName: string; percent: number }
  | { kind: 'uploaded'; fileName: string; sizeBytes: number }
  | { kind: 'failed'; fileName: string; message: string }
  | { kind: 'rejected'; fileName: string; reason: string }

export interface FileUploadProps {
  label: string
  /** Accepted extensions shown before upload, e.g. [".pdf", ".docx"] (blueprint §4.1: PDF/DOCX/XLSX/PNG/JPG). */
  accept: string[]
  maxSizeBytes: number
  required?: boolean
  state: UploadState
  /** Called with a file that passed the client-side pre-check. The server re-checks type (by content) and size. */
  onFileSelected: (file: File) => void
  /** Called when a pre-check fails, so the parent can show the rejected state. */
  onFileRejected: (fileName: string, reason: string) => void
  onRetry?: () => void
}

/**
 * File upload (spec §5): accepted types and size are shown before upload; uploading shows progress;
 * a failure offers retry; files are offered for download only (no inline preview).
 * The client check is a convenience: the server is authoritative.
 */
export function FileUpload({ label, accept, maxSizeBytes, required, state, onFileSelected, onFileRejected, onRetry }: FileUploadProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!accept.includes(ext)) {
      onFileRejected(file.name, `This file type is not accepted. Use ${accept.join(', ')}.`)
    } else if (file.size > maxSizeBytes) {
      onFileRejected(file.name, `This file is larger than ${formatBytes(maxSizeBytes)}.`)
    } else {
      onFileSelected(file)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
        {required ? <span className="ml-2 text-sm font-normal text-ink-muted">Required</span> : null}
      </label>
      <p id={hintId} className="text-sm text-ink-muted">
        Accepted: {accept.join(', ')} · up to {formatBytes(maxSizeBytes)}
      </p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept.join(',')}
        aria-describedby={hintId}
        className="sr-only"
        onChange={handleChange}
        disabled={state.kind === 'uploading'}
      />
      <div className="rounded-md border border-dashed border-line-input bg-surface-card p-4" aria-live="polite">
        {state.kind === 'idle' && (
          <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
            Choose a file
          </Button>
        )}
        {state.kind === 'uploading' && (
          <ProgressIndicator label={`Uploading ${state.fileName}`} value={state.percent} />
        )}
        {state.kind === 'uploaded' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="h-5 w-5 text-success" />
              <FileText aria-hidden className="h-5 w-5 text-ink-muted" />
              {state.fileName} <span className="text-sm text-ink-muted">({formatBytes(state.sizeBytes)})</span>
            </span>
            <Button variant="tertiary" size="sm" onClick={() => inputRef.current?.click()}>
              Replace file
            </Button>
          </div>
        )}
        {state.kind === 'failed' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-error">
              <AlertCircle aria-hidden className="h-5 w-5" />
              {state.fileName} did not upload. {state.message}
            </span>
            {onRetry ? (
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
                Retry upload
              </Button>
            ) : null}
          </div>
        )}
        {state.kind === 'rejected' && (
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-error">
              <AlertCircle aria-hidden className="h-5 w-5" />
              {state.fileName}: {state.reason}
            </span>
            <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
              Choose another file
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
