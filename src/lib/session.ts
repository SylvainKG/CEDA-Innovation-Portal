import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiMode } from '@/lib/api'
import type { Role } from '@/lib/api/types'
import { clearDeviceData } from '@/lib/device-data'

const SESSION_KEY = ['session'] as const

/** Current session via the API port (mock today, Supabase Auth later). */
export function useSession() {
  return useQuery({ queryKey: SESSION_KEY, queryFn: () => api.session.getSession(), staleTime: Infinity })
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
    onSuccess: (user) => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' })
      qc.setQueryData(SESSION_KEY, user)
    },
  })
}
