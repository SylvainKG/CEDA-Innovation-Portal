import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiMode } from '@/lib/api'
import { MOCK_ROLE_OPTIONS } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { homeFor } from '@/navigation/nav-config'
import { roleLabel } from '@/navigation/role-labels'
import { useSwitchDemoRole } from '@/lib/session'
import { safeNextPath } from '@/lib/safe-redirect'
import { Button } from '@/components/Button'
import { NotBuiltYet } from './NotBuiltYet'

/**
 * T02 sign-in is not built yet. In mock mode this page also offers the development-only mock session,
 * clearly labelled, so the team can preview role shells. It is not authentication.
 */
export function SignInPlaceholder() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const switchRole = useSwitchDemoRole()

  async function choose(role: Role) {
    const user = await switchRole.mutateAsync(role)
    navigate(safeNextPath(params.get('next')) ?? homeFor(user?.roles ?? [role]))
  }

  return (
    <div className="flex flex-col gap-6">
      <NotBuiltYet template="T02" title="Sign in" />
      {apiMode === 'mock' ? (
        <section aria-labelledby="mock-heading" className="rounded-md bg-demo-subtle p-4">
          <h2 id="mock-heading" className="text-h3 font-semibold text-demo">
            Mock session (development only)
          </h2>
          <p className="mb-3 text-sm text-ink">
            Preview a role's navigation with a fictional demo persona. This is not sign-in and grants no access to data.
          </p>
          <div className="flex flex-wrap gap-2">
            {MOCK_ROLE_OPTIONS.map((r) => (
              <Button key={r} variant="secondary" size="sm" onClick={() => void choose(r)}>
                {roleLabel(r)}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
