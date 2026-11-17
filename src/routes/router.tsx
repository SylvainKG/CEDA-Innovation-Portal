import type { ReactElement } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { ApplicantShell } from '@/layouts/ApplicantShell'
import { PublicShell } from '@/layouts/PublicShell'
import { RoleShell } from '@/layouts/RoleShell'
import { StaffShell } from '@/layouts/StaffShell'
import { NotFoundState } from '@/components/states/States'
import { STAFF_ROLES, type Role } from '@/lib/api/types'
import { NotBuiltYet } from '@/pages/NotBuiltYet'
import { SignInPlaceholder } from '@/pages/SignInPlaceholder'
import { ComponentGalleryRoute } from '@/pages/ComponentGalleryRoute'
import { ProposalFormPage } from '@/pages/applicant/ProposalForm'
import { ReceiptPage } from '@/pages/applicant/ReceiptPage'
import { MyIdeasPage } from '@/pages/applicant/MyIdeasPage'
import { ChallengesPage, PublicHome } from '@/pages/public/PublicHome'
import { ChallengeBriefPage } from '@/pages/public/ChallengeBriefPage'
import { apiMode } from '@/lib/api'
import { RequireRole } from './guards'

/** Routes from docs/design/figma-handoff/navigation-map.md ("Routes by template"). */
const nb = (template: string, title: string, variant?: string) => <NotBuiltYet template={template} title={title} variant={variant} />
const guard = (roles: readonly Role[], el: ReactElement) => <RequireRole anyOf={roles}>{el}</RequireRole>

export const routes: RouteObject[] = [
  {
    element: <PublicShell />,
    children: [
      { path: '/', element: <PublicHome /> },
      { path: '/challenges', element: <ChallengesPage /> },
      { path: '/challenges/:slug', element: <ChallengeBriefPage /> },
      { path: '/auth/sign-in', element: <SignInPlaceholder /> },
      { path: '/auth/register', element: nb('T02', 'Register') },
      { path: '/auth/verify', element: nb('T02', 'Verify your email') },
      { path: '/auth/forgot', element: nb('T02', 'Forgot password') },
      { path: '/auth/reset', element: nb('T02', 'Reset password') },
      { path: '/auth/mfa', element: nb('T02', 'Two-step sign-in') },
      { path: '/help/faqs', element: nb('T03', 'FAQs') },
      { path: '/help/contacts', element: nb('T03', 'Regulatory contacts') },
      { path: '/help/support', element: nb('T03', 'Fault support') },
      { path: '/privacy', element: nb('T03', 'Privacy notice') },
      // Development-only component gallery: only registered in mock mode, never with a real backend.
      ...(apiMode === 'mock'
        ? [
            {
              path: '/dev/components',
              element: <ComponentGalleryRoute />,
            },
          ]
        : []),
    ],
  },
  {
    element: <ApplicantShell />,
    children: [
      { path: '/ideas', element: guard(['applicant'], <MyIdeasPage />) },
      { path: '/ideas/new', element: guard(['applicant'], <ProposalFormPage />) },
      { path: '/ideas/:id', element: guard(['applicant'], nb('T08', 'Idea', 'Applicant case view')) },
      { path: '/ideas/:id/edit', element: guard(['applicant'], <ProposalFormPage />) },
      { path: '/ideas/:id/revise', element: guard(['applicant'], nb('T04', 'Revise your idea', 'V2 revise mode')) },
      { path: '/ideas/:id/receipt', element: guard(['applicant'], <ReceiptPage />) },
    ],
  },
  {
    element: <StaffShell />,
    children: [
      { path: '/staff', element: guard(STAFF_ROLES, nb('T06', 'Home', 'Staff')) },
      { path: '/staff/queue/screening', element: guard(['screening_officer', 'admin'], nb('T07', 'Screening queue')) },
      { path: '/staff/reviews', element: guard(['reviewer'], nb('T07', 'My reviews', 'Reviewer assignments')) },
      { path: '/staff/queue/decision', element: guard(['adjudicator', 'admin'], nb('T07', 'Ready for decision')) },
      { path: '/staff/cases', element: guard(['admin', 'committee_member'], nb('T07', 'All cases')) },
      { path: '/staff/cases/:id', element: guard(STAFF_ROLES, nb('T08', 'Case workspace', 'Staff')) },
      { path: '/staff/cases/:id/score', element: guard(['reviewer'], nb('T09', 'Scorecard')) },
      { path: '/staff/cases/:id/panel', element: guard(['adjudicator', 'admin'], nb('T09', 'Panel comparison')) },
      { path: '/reports', element: guard(['adjudicator', 'admin', 'support_lead', 'committee_member'], nb('T13', 'Reports')) },
      { path: '/audit', element: guard(['admin', 'auditor'], nb('T14', 'Audit log')) },
      { path: '/support/inbox', element: guard(['support_consultant', 'support_lead'], nb('T15', 'Support inbox')) },
      { path: '/admin/challenges', element: guard(['admin'], nb('T12', 'Challenges', 'Admin')) },
      { path: '/admin/challenges/:id', element: guard(['admin'], nb('T12', 'Challenge editor')) },
      { path: '/admin/rubrics/:id', element: guard(['admin'], nb('T12', 'Rubric editor')) },
      { path: '/admin/users', element: guard(['admin'], nb('T12', 'Users and roles')) },
      { path: '/admin/content', element: guard(['admin'], nb('T12', 'Content')) },
      { path: '/admin/settings/roles', element: guard(['admin'], nb('T12', 'Roles')) },
      { path: '/admin/settings/chat', element: guard(['admin'], nb('T12', 'Chat settings')) },
    ],
  },
  {
    element: <RoleShell />,
    children: [{ path: '/notifications', element: guard([...STAFF_ROLES, 'applicant'], nb('T11', 'Notifications')) }],
  },
  { element: <PublicShell />, children: [{ path: '*', element: <NotFoundState /> }] },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
