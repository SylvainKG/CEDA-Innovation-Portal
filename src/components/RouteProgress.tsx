import { useEffect, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { cn } from '@/lib/cn'

/** Waits this long before showing, so a quick load never flashes the line. */
const SHOW_AFTER_MS = 120

/**
 * A thin line in CEDA's sunrise colours across the very top of the window while a page's data is loading for the
 * first time (post-freeze, ABM 22 Nov). Background refreshes, such as the notification count, don't show it. It is
 * decorative: each page's own loading state tells screen readers what is loading. With the reduced-motion setting the
 * line stays still.
 */
export function RouteProgress() {
  const loading = useIsFetching({ predicate: (q) => q.state.status === 'pending' }) > 0
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShown(false)
      return undefined
    }
    const timer = window.setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [loading])

  return (
    <div aria-hidden className={cn('route-progress', shown && 'route-progress--on')}>
      <span />
    </div>
  )
}
