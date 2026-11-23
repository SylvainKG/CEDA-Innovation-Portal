import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { prefersReducedMotion } from '@/features/preferences/settings'
import { holdOutgoingSnapshot, pageMotion } from './page-motion'

// Opacity and a short rise only: blur and scale on a whole page are costly to paint and made the motion stutter.
const ENTER: Keyframe[] = [
  { opacity: 0, transform: 'translateY(10px)' },
  { opacity: 1, transform: 'none' },
]

const EXIT: Keyframe[] = [
  { opacity: 1, transform: 'none' },
  { opacity: 0, transform: 'translateY(-6px)' },
]

/** Content that arrives once the page is open (its data replacing the loading skeleton) fades up gently. */
const REVEAL: Keyframe[] = [
  { opacity: 0, transform: 'translateY(6px)' },
  { opacity: 1, transform: 'none' },
]

const ENTER_MS = 340
const EXIT_MS = 200
const REVEAL_MS = 280
/** How long after a page opens its newly arrived content is revealed; later changes (typing, toggles) are left alone. */
const REVEAL_WINDOW_MS = 3000

/**
 * Navigation snapshots the current page before React Router renders the destination. Browsers without the View
 * Transitions API use a short exit animation before navigation, then animate the new page before its first paint.
 *
 * Smoothness (ABM, 23 Nov): the header, phone navigation bar, loading line and Peolwane AI have their own snapshots
 * above the page (index.css, assistant.css), so the page's fade never passes over them. The outgoing snapshot is held
 * where it was on screen (`--ceda-page-shift`), so a page left halfway down no longer slides up the screen as the
 * next one opens at the top. Content that arrives after the page opens fades up instead of popping in.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const navigation = useNavigationType()
  const page = useRef<HTMLDivElement>(null)
  const navigationRef = useRef(navigation)
  const hashRef = useRef(hash)
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
      // Reduced motion (system or Accessibility settings): navigate straight away, with no exit or view transition.
      if (prefersReducedMotion()) {
        exitAnimation.current?.cancel()
        navigate(to)
        return
      }
      if (typeof document.startViewTransition === 'function') {
        pageMotion.outgoingTop = page.current?.getBoundingClientRect().top ?? null
        pageMotion.nativeTransitionPending = true
        const result = navigate(to, { viewTransition: true })
        if (result && typeof result.then === 'function') {
          const clearPending = () => {
            pageMotion.nativeTransitionPending = false
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
    if (!pageMotion.nativeTransitionPending && !prefersReducedMotion()) {
      page.current?.animate?.(ENTER, { duration: ENTER_MS, easing: 'cubic-bezier(.16, 1, .3, 1)' })
    }
    pageMotion.nativeTransitionPending = false
    // On Back and Forward the browser restores the scroll position itself.
    if (navigationRef.current === 'PUSH' && !hashRef.current) document.documentElement.scrollTop = 0
    holdOutgoingSnapshot(page.current)
    // Runs when the page changes, not when only its section or query string does.
  }, [pathname])

  useEffect(() => {
    const root = page.current
    if (!root || typeof MutationObserver === 'undefined') return undefined
    const observer = new MutationObserver((records) => {
      if (prefersReducedMotion()) return
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          // Skeletons themselves, and anything with an entrance animation of its own, are left as they are.
          if (!(node instanceof HTMLElement) || node.getAttribute('aria-busy') === 'true') return
          if (getComputedStyle(node).animationName !== 'none') return
          node.animate?.(REVEAL, { duration: REVEAL_MS, easing: 'cubic-bezier(.2, .7, .2, 1)' })
        })
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    const stop = window.setTimeout(() => observer.disconnect(), REVEAL_WINDOW_MS)
    return () => {
      observer.disconnect()
      window.clearTimeout(stop)
    }
  }, [pathname])

  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    target?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [pathname, hash])

  return <div ref={page} className="page-transition">{children}</div>
}
