/**
 * The loading splash in index.html (#pw-splash) covers the page while the app's code downloads. Once the app
 * has rendered underneath, this keeps the splash up for a minimum time from the start of the page load, so it
 * never just flashes, then fades it out where it is and removes it.
 */

export const SPLASH_ID = 'pw-splash'
/** The intro ends at 1.35 s (arc drawn, raindrops landed); the finished logo then holds still before fading. */
export const MIN_VISIBLE_MS = 1800
export const REDUCED_MIN_VISIBLE_MS = 400
export const EXIT_MS = 500
export const REDUCED_EXIT_MS = 200

export function dismissSplash(options: { doc?: Document; now?: () => number; reducedMotion?: boolean } = {}): void {
  const doc = options.doc ?? document
  const now = options.now ?? (() => performance.now())
  const reducedMotion =
    options.reducedMotion ??
    (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const splash = doc.getElementById(SPLASH_ID)
  if (!splash || splash.classList.contains('pw-splash--out')) return

  const wait = Math.max(0, (reducedMotion ? REDUCED_MIN_VISIBLE_MS : MIN_VISIBLE_MS) - now())
  setTimeout(() => {
    splash.classList.add('pw-splash--out')
    splash.setAttribute('aria-hidden', 'true')
    setTimeout(() => splash.remove(), reducedMotion ? REDUCED_EXIT_MS : EXIT_MS)
  }, wait)
}
