import { useSession } from '@/lib/session'
import { ApplicantShell } from './ApplicantShell'
import { StaffShell } from './StaffShell'

/** For pages every signed-in person uses (e.g. notifications): applicants get the applicant shell, staff the staff shell. */
export function RoleShell() {
  const { data: user } = useSession()
  return user?.roles.includes('applicant') ? <ApplicantShell /> : <StaffShell />
}
