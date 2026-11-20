import type { ReactElement } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { ApplicantShell } from '@/layouts/ApplicantShell'
import { PublicShell } from '@/layouts/PublicShell'
import { RoleShell } from '@/layouts/RoleShell'
import { StaffShell } from '@/layouts/StaffShell'
import { NotFoundState } from '@/components/states/States'
import { STAFF_ROLES, type Role } from '@/lib/api/types'
import { NotBuiltYet } from '@/pages/NotBuiltYet'
import { SignInPage } from '@/pages/auth/SignInPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ContactsPage, FaqPage, PrivacyPage, SupportPage } from '@/pages/help/HelpPages'
import { DecisionQueuePage } from '@/pages/review/DecisionQueuePage'
import { MyReviewsPage } from '@/pages/review/MyReviewsPage'
import { PanelPage } from '@/pages/review/PanelPage'
import { ScorePage } from '@/pages/review/ScorePage'
import { AllCasesPage } from '@/pages/staff/AllCasesPage'
import { ScreeningQueuePage } from '@/pages/staff/ScreeningQueuePage'
import { StaffCasePage } from '@/pages/staff/StaffCasePage'
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from '@/pages/auth/RecoveryPages'
import { ComponentGalleryRoute } from '@/pages/ComponentGalleryRoute'
import { ProposalFormPage } from '@/pages/applicant/ProposalForm'
import { ReceiptPage } from '@/pages/applicant/ReceiptPage'
import { MyIdeasPage } from '@/pages/applicant/MyIdeasPage'
import { ApplicantCasePage } from '@/pages/applicant/ApplicantCasePage'
import { RevisePage } from '@/pages/applicant/RevisePage'
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
      { path: '/auth/sign-in', element: <SignInPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/auth/verify', element: <VerifyEmailPage /> },
      { path: '/auth/forgot', element: <ForgotPasswordPage /> },
      { path: '/auth/reset', element: <ResetPasswordPage /> },
      { path: '/auth/mfa', element: nb('T02', 'Two-step sign-in') },
      { path: '/help/faqs', element: <FaqPage /> },
      { path: '/help/contacts', element: <ContactsPage /> },
      { path: '/help/support', element: <SupportPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
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
      { path: '/ideas/:id', element: guard(['applicant'], <ApplicantCasePage />) },
      { path: '/ideas/:id/edit', element: guard(['applicant'], <ProposalFormPage />) },
      { path: '/ideas/:id/revise', element: guard(['applicant'], <RevisePage />) },
      { path: '/ideas/:id/receipt', element: guard(['applicant'], <ReceiptPage />) },
    ],
  },
  {
    element: <StaffShell />,
    children: [
      { path: '/staff', element: guard(STAFF_ROLES, nb('T06', 'Home', 'Staff')) },
      { path: '/staff/queue/screening', element: guard(['screening_officer', 'admin'], <ScreeningQueuePage />) },
      { path: '/staff/reviews', element: guard(['reviewer'], <MyReviewsPage />) },
      { path: '/staff/queue/decision', element: guard(['adjudicator', 'admin'], <DecisionQueuePage />) },
      { path: '/staff/cases', element: guard(['admin', 'committee_member'], <AllCasesPage />) },
      { path: '/staff/cases/:id', element: guard(STAFF_ROLES, <StaffCasePage />) },
      { path: '/staff/cases/:id/score', element: guard(['reviewer'], <ScorePage />) },
      // Reviewers too: the server shows them the panel only after they have submitted their own scorecard.
      { path: '/staff/cases/:id/panel', element: guard(['adjudicator', 'admin', 'reviewer'], <PanelPage />) },
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
