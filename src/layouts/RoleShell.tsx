import { useSession } from '@/lib/session'
import { ApplicantShell } from './ApplicantShell'
import { PublicShell } from './PublicShell'
import { StaffShell } from './StaffShell'

/** For pages every signed-in person uses (e.g. notifications): applicants get the applicant shell, staff the staff shell. */
export function RoleShell() {
  const { data: user } = useSession()
  return user?.roles.includes('applicant') ? <ApplicantShell /> : <StaffShell />
}

/**
 * For pages that visitors and signed-in people share: challenges and their briefs, how it works, about, help and
 * privacy (post-freeze, ABM 22 Nov). Visitors get the public shell. A signed-in person keeps their own shell, so
 * "Challenges" or "Help" in an applicant's navigation never swaps their navigation for the public one. Until the
 * session is known, nothing is drawn, so nobody sees the wrong navigation flash past.
 */
export function SiteShell() {
  const { data: user, isPending } = useSession()
  if (isPending) return <div className="min-h-screen" />
  if (!user) return <PublicShell />
  return <RoleShell />
}
