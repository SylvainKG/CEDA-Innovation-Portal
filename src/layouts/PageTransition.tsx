import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { prefersReducedMotion } from '@/features/preferences/settings'

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
 * Where the outgoing page was on screen when a link was followed, for the view transition. Module-level, because
 * following a link into another shell (public to applicant, say) mounts a new PageTransition.
 */
let outgoingTop: number | null = null
/** A view transition is animating the navigation, so the destination's own entrance animation is skipped. */
let nativeTransitionPending = false

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
        outgoingTop = page.current?.getBoundingClientRect().top ?? null
        nativeTransitionPending = true
        const result = navigate(to, { viewTransition: true })
        if (result && typeof result.then === 'function') {
          const clearPending = () => {
            nativeTransitionPending = false
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
    if (!nativeTransitionPending && !prefersReducedMotion()) {
      page.current?.animate?.(ENTER, { duration: ENTER_MS, easing: 'cubic-bezier(.16, 1, .3, 1)' })
    }
    nativeTransitionPending = false
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

/**
 * Moves to another part of the portal with the whole screen fading as one (signing out: the workspace gives way to the
 * public home page), rather than holding the header and Peolwane AI steady as a link between pages does. `update`
 * makes the change (navigate with `flushSync`, end the session) and resolves once it is made; the browser keeps the
 * old screen up until then, so the destination appears in its final state. Without View Transitions, or with reduced
 * motion, the change is made at once.
 */
export function fadeScreen(update: () => Promise<unknown> | void): Promise<void> {
  if (prefersReducedMotion() || typeof document.startViewTransition !== 'function') return Promise.resolve(update()).then(() => undefined)
  const root = document.documentElement
  root.classList.add('ceda-screen-fade')
  outgoingTop = null
  nativeTransitionPending = true
  const transition = document.startViewTransition(async () => {
    await update()
    // Let React commit what the update set off (the signed-out header) before the new screen is captured.
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  void transition.finished.finally(() => {
    root.classList.remove('ceda-screen-fade')
    nativeTransitionPending = false
  })
  return transition.updateCallbackDone.catch(() => undefined)
}

/**
 * Called once the destination is laid out (and scrolled to the top), before the browser captures it: the outgoing
 * snapshot is drawn this far from the new page's position, which is where it was on screen.
 */
function holdOutgoingSnapshot(page: HTMLElement | null) {
  if (outgoingTop === null) return
  const top = page?.getBoundingClientRect().top ?? outgoingTop
  document.documentElement.style.setProperty('--ceda-page-shift', `${Math.round(outgoingTop - top)}px`)
  outgoingTop = null
}
