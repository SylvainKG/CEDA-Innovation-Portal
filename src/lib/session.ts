import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiMode } from '@/lib/api'
import type { Role } from '@/lib/api/types'

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
      return api.session.switchDemoRole(role)
    },
    onSuccess: (user) => qc.setQueryData(SESSION_KEY, user),
  })
}
