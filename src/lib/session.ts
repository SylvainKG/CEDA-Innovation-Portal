import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, apiMode } from '@/lib/api'
import type { Role, SessionUser } from '@/lib/api/types'
import { clearDeviceData } from '@/lib/device-data'

const SESSION_KEY = ['session'] as const
/** Who last signed in on this device, so a different person never inherits their device copies. */
const LAST_USER_KEY = 'ceda.last.user'

/** Current session via the API port (mock or Supabase Auth). */
export function useSession() {
  return useQuery({ queryKey: SESSION_KEY, queryFn: () => api.session.getSession(), staleTime: Infinity })
}

/** Drop everything cached for the previous person, keeping only the session entry. */
function forgetPerson(qc: QueryClient) {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' })
}

function readLastUser(): string | null {
  try {
    return window.localStorage.getItem(LAST_USER_KEY)
  } catch {
    return null
  }
}

function writeLastUser(id: string | null) {
  try {
    if (id) window.localStorage.setItem(LAST_USER_KEY, id)
    else window.localStorage.removeItem(LAST_USER_KEY)
  } catch {
    // Storage unavailable: nothing was stored there either.
  }
}

/**
 * Record a successful sign-in. If someone else used this device before, their unsent drafts and pending
 * submit keys are removed first (data-handling note, #31). The same person keeps their unsent work.
 */
async function adopt(qc: QueryClient, user: SessionUser) {
  // A session read started before this sign-in (e.g. on page load) would otherwise land later and overwrite
  // the new session with "signed out".
  await qc.cancelQueries({ queryKey: SESSION_KEY })
  const last = readLastUser()
  if (last && last !== user.id) clearDeviceData()
  writeLastUser(user.id)
  // Supabase also reports "signed in" when a tab regains focus: only a different person drops the cache.
  const current = qc.getQueryData<SessionUser | null>(SESSION_KEY)
  if (current?.id !== user.id) forgetPerson(qc)
  qc.setQueryData(SESSION_KEY, user)
}

async function forgetEveryone(qc: QueryClient) {
  await qc.cancelQueries({ queryKey: SESSION_KEY })
  clearDeviceData()
  writeLastUser(null)
  forgetPerson(qc)
  qc.setQueryData(SESSION_KEY, null)
}

export function useAdoptSession() {
  const qc = useQueryClient()
  return (user: SessionUser): Promise<void> => adopt(qc, user)
}

/** Sign out: the session ends, and this device forgets the person's drafts, keys and cached data. */
export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.session.signOut(),
    onSettled: () => forgetEveryone(qc),
  })
}

/**
 * Follow sign-in and sign-out that happen outside the app's own calls: another tab, an expired session,
 * or an email link. Mount once near the root.
 */
export function useAuthSync() {
  const qc = useQueryClient()
  useEffect(() => {
    if (!api.session.onChange) return undefined
    return api.session.onChange((change) => {
      if (change === 'signed_out') {
        void forgetEveryone(qc)
        return
      }
      // Signed in elsewhere (another tab or an email link), or the account changed: re-read who this is.
      void api.session
        .getSession()
        .then((user) => (user ? adopt(qc, user) : forgetEveryone(qc)))
        .catch(() => qc.invalidateQueries({ queryKey: SESSION_KEY }))
    })
  }, [qc])
}

/** Mock mode only: preview another role's shell. Not available once real authentication is wired. */
export function useSwitchDemoRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (role: Role | null) => {
      if (apiMode !== 'mock' || !api.session.switchDemoRole) throw new Error('Demo role switching exists only in mock mode.')
      // A different person (or nobody) from now on: drop the previous person's device copies and cached data.
      clearDeviceData()
      return api.session.switchDemoRole(role)
    },
    onSuccess: async (user) => {
      await qc.cancelQueries({ queryKey: SESSION_KEY })
      writeLastUser(user?.id ?? null)
      forgetPerson(qc)
      qc.setQueryData(SESSION_KEY, user)
    },
  })
}
