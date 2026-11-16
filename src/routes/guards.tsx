import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import type { Role } from '@/lib/api/types'
import { homeFor } from '@/navigation/nav-config'
import { useSession } from '@/lib/session'

/**
 * Route guard: a usability convenience only. It decides which screen to SHOW;
 * the server (RLS + RPC checks) decides what data anyone can read or change.
 */
export function RequireRole({ anyOf, children }: { anyOf: readonly Role[]; children: ReactNode }) {
  const location = useLocation()
  const { data: user, isPending, isError, refetch } = useSession()
  if (isPending) return <LoadingState what="your session" />
  if (isError) return <ErrorState message="We couldn't check your session." onRetry={() => void refetch()} />
  if (!user) return <Navigate to={`/auth/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />
  if (!user.roles.some((r) => anyOf.includes(r))) return <ForbiddenState home={homeFor(user.roles)} />
  return <>{children}</>
}
