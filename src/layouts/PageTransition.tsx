import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

const ENTER: Keyframe[] = [
  { opacity: 0, transform: 'translateY(12px) scale(.99)', filter: 'blur(2px)' },
  { opacity: 1, transform: 'none', filter: 'blur(0)' },
]

const EXIT: Keyframe[] = [
  { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
  { opacity: 0, transform: 'translateY(-5px) scale(.995)', filter: 'blur(1.5px)' },
]

const ENTER_MS = 360
const EXIT_MS = 220

/**
 * Navigation snapshots the current page before React Router renders the destination. Browsers without the View
 * Transitions API use a short exit animation before navigation, then animate the new page before its first paint.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const navigation = useNavigationType()
  const page = useRef<HTMLDivElement>(null)
  const navigationRef = useRef(navigation)
  const hashRef = useRef(hash)
  const nativeTransitionPending = useRef(false)
  const exitAnimation = useRef<Animation | null>(null)
  navigationRef.current = navigation
  hashRef.current = hash

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!(event.target instanceof Element)) return

      const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return

      event.preventDefault()
      const to = `${destination.pathname}${destination.search}${destination.hash}`
      if (typeof document.startViewTransition === 'function') {
        nativeTransitionPending.current = true
        const result = navigate(to, { viewTransition: true })
        if (result && typeof result.then === 'function') {
          const clearPending = () => {
            nativeTransitionPending.current = false
          }
          void result.then(clearPending, clearPending)
        }
        return
      }

      exitAnimation.current?.cancel()
      const animation = page.current?.animate?.(EXIT, {
        duration: EXIT_MS,
        easing: 'cubic-bezier(.4, 0, .8, .4)',
        fill: 'forwards',
      })
      if (!animation) {
        navigate(to, { flushSync: true })
        return
      }

      exitAnimation.current = animation
      void animation.finished
        .then(() => {
          if (exitAnimation.current !== animation) return
          exitAnimation.current = null
          animation.cancel()
          navigate(to, { flushSync: true })
        })
        .catch(() => {
          if (exitAnimation.current === animation) exitAnimation.current = null
        })
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      exitAnimation.current?.cancel()
      exitAnimation.current = null
    }
  }, [navigate])

  useLayoutEffect(() => {
    if (navigationRef.current === 'REPLACE') return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!nativeTransitionPending.current && !reduce) {
      page.current?.animate?.(ENTER, { duration: ENTER_MS, easing: 'cubic-bezier(.16, 1, .3, 1)' })
    }
    nativeTransitionPending.current = false
    // On Back and Forward the browser restores the scroll position itself.
    if (navigationRef.current === 'PUSH' && !hashRef.current) document.documentElement.scrollTop = 0
    // Runs when the page changes, not when only its section or query string does.
  }, [pathname])

  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [pathname, hash])

  return <div ref={page} className="page-transition">{children}</div>
}
