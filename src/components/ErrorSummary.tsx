import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * The error summary at the top of a form (spec §5; laid out to Sandra's 21 Nov frames): a red left edge on a light
 * red box, the title ("There is a problem" by default) and the form's own list of linked messages as children.
 * It is an alert and takes focus (`tabIndex={-1}`), so the page can move focus to it after a failed submit.
 */
export function ErrorSummary({
  id = 'error-summary',
  title = 'There is a problem',
  level = 2,
  className,
  boxRef,
  children,
}: {
  id?: string
  title?: string
  level?: 2 | 3
  className?: string
  boxRef?: React.Ref<HTMLDivElement>
  children: ReactNode
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div ref={boxRef} id={id} tabIndex={-1} role="alert" className={cn('flex flex-col gap-2 rounded-md border-l-4 border-error bg-error-subtle p-4 outline-none', className)}>
      <Heading className="font-semibold">{title}</Heading>
      <div className="flex flex-col gap-2 text-sm [&_a]:text-ink [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </div>
  )
}

/** "REQUIRED" in small capitals at the right of a field's label (Sandra's 21 Nov frames). Read out as "Required". */
export function RequiredTag() {
  return <span className="ml-auto pl-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-muted">Required</span>
}
