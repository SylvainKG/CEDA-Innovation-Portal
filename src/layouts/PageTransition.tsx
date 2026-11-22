import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const ENTER: Keyframe[] = [
  { opacity: 0, transform: 'translateY(7px) scale(.995)' },
  { opacity: 1, transform: 'none' },
]

/**
 * Moving between pages (post-freeze, ABM 22 Nov). Each shell wraps its page in this:
 *
 * - When a link or button opens another page, it fades in and lifts into place (about a quarter of a second) while
 *   the navigation stays put. The page is animated, never rebuilt, so nothing typed is lost.
 * - In-place address updates (a draft getting its own address after the first save, filters kept in the query
 *   string) neither animate nor scroll: they "replace" the address rather than open a page.
 * - A newly opened page starts at the top; Back and Forward leave the browser's own scroll restoring alone; an
 *   address with a section (for example "/#how-it-works") scrolls to that section, below the sticky navigation.
 * - With the reduced-motion setting, pages simply appear.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation()
  const navigation = useNavigationType()
  const page = useRef<HTMLDivElement>(null)
  const navigationRef = useRef(navigation)
  const hashRef = useRef(hash)
  navigationRef.current = navigation
  hashRef.current = hash

  useLayoutEffect(() => {
    if (navigationRef.current === 'REPLACE') return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animation = reduce ? undefined : page.current?.animate?.(ENTER, { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' })
    // On Back and Forward the browser restores the scroll position itself.
    if (navigationRef.current === 'PUSH' && !hashRef.current) document.documentElement.scrollTop = 0
    // Runs when the page changes, not when only its section or query string does.
    return () => animation?.cancel()
  }, [pathname])

  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [pathname, hash])

  return <div ref={page}>{children}</div>
}
