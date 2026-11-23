import { prefersReducedMotion } from '@/features/preferences/settings'

/**
 * State shared by every PageTransition (src/layouts/PageTransition.tsx): following a link into another shell (public
 * to applicant, say) mounts a new one, so it can't live in a component.
 */
export const pageMotion = {
  /** Where the outgoing page was on screen when a link was followed, for the view transition. */
  outgoingTop: null as number | null,
  /** A view transition is animating the navigation, so the destination's own entrance animation is skipped. */
  nativeTransitionPending: false,
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
  pageMotion.outgoingTop = null
  pageMotion.nativeTransitionPending = true
  const transition = document.startViewTransition(async () => {
    await update()
    // Let React commit what the update set off (the signed-out header) before the new screen is captured.
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  void transition.finished.finally(() => {
    root.classList.remove('ceda-screen-fade')
    pageMotion.nativeTransitionPending = false
  })
  return transition.updateCallbackDone.catch(() => undefined)
}

/**
 * Called once the destination is laid out (and scrolled to the top), before the browser captures it: the outgoing
 * snapshot is drawn this far from the new page's position, which is where it was on screen.
 */
export function holdOutgoingSnapshot(page: HTMLElement | null) {
  if (pageMotion.outgoingTop === null) return
  const top = page?.getBoundingClientRect().top ?? pageMotion.outgoingTop
  document.documentElement.style.setProperty('--ceda-page-shift', `${Math.round(pageMotion.outgoingTop - top)}px`)
  pageMotion.outgoingTop = null
}
