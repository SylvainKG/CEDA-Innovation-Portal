import type { ReactElement } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { ApplicantShell } from '@/layouts/ApplicantShell'
import { PublicShell } from '@/layouts/PublicShell'
import { RoleShell, SiteShell } from '@/layouts/RoleShell'
import { StaffShell } from '@/layouts/StaffShell'
import { NotFoundState } from '@/components/states/States'
import { STAFF_ROLES, type Role } from '@/lib/api/types'
import { SignInPage } from '@/pages/auth/SignInPage'
import { MfaPage } from '@/pages/auth/MfaPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ContactsPage, FaqPage, PrivacyPage, SupportPage, TermsPage } from '@/pages/help/HelpPages'
import { DecisionQueuePage } from '@/pages/review/DecisionQueuePage'
import { MyReviewsPage } from '@/pages/review/MyReviewsPage'
import { PanelPage } from '@/pages/review/PanelPage'
import { ScorePage } from '@/pages/review/ScorePage'
import { AllCasesPage } from '@/pages/staff/AllCasesPage'
import { AuditPage } from '@/pages/oversight/AuditPage'
import { NotificationsPage } from '@/pages/oversight/NotificationsPage'
import { ReportsPage } from '@/pages/oversight/ReportsPage'
import { ApplicantChatPage } from '@/pages/support/ApplicantChatPage'
import { SupportInboxPage } from '@/pages/support/SupportInboxPage'
import { ScreeningQueuePage } from '@/pages/staff/ScreeningQueuePage'
import { StaffHomePage } from '@/pages/staff/StaffHomePage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { ChatSettingsPage } from '@/pages/admin/ChatSettingsPage'
import { ChallengeEditorPage } from '@/pages/admin/ChallengeEditorPage'
import { RubricEditorPage } from '@/pages/admin/RubricEditorPage'
import { ContentAdminPage } from '@/pages/admin/ContentAdminPage'
import { RolesPage } from '@/pages/admin/RolesPage'
import { ChallengesPage as AdminChallengesPage } from '@/pages/admin/ChallengesPage'
import { StaffCasePage } from '@/pages/staff/StaffCasePage'
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from '@/pages/auth/RecoveryPages'
import { ComponentGalleryRoute } from '@/pages/ComponentGalleryRoute'
import { ProposalFormPage } from '@/pages/applicant/ProposalForm'
import { ReceiptPage } from '@/pages/applicant/ReceiptPage'
import { MyIdeasPage } from '@/pages/applicant/MyIdeasPage'
import { ApplicantCasePage } from '@/pages/applicant/ApplicantCasePage'
import { RevisePage } from '@/pages/applicant/RevisePage'
import { PublicHome } from '@/pages/public/PublicHome'
import { ChallengesPage } from '@/pages/public/ChallengesPage'
import { HowItWorksPage } from '@/pages/public/HowItWorksPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ChallengeBriefPage } from '@/pages/public/ChallengeBriefPage'
import { apiMode } from '@/lib/api'
import { RequireRole } from './guards'

/** Routes from docs/design/figma-handoff/navigation-map.md ("Routes by template"). */
const guard = (roles: readonly Role[], el: ReactElement) => <RequireRole anyOf={roles}>{el}</RequireRole>

export const routes: RouteObject[] = [
  {
    element: <PublicShell />,
    children: [
      { path: '/', element: <PublicHome /> },
      { path: '/auth/sign-in', element: <SignInPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/auth/verify', element: <VerifyEmailPage /> },
      { path: '/auth/forgot', element: <ForgotPasswordPage /> },
      { path: '/auth/reset', element: <ResetPasswordPage /> },
      { path: '/auth/mfa', element: <MfaPage /> },
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
    // Shared by visitors and signed-in people: each keeps their own navigation here (SiteShell).
    element: <SiteShell />,
    children: [
      { path: '/challenges', element: <ChallengesPage /> },
      { path: '/challenges/:slug', element: <ChallengeBriefPage /> },
      { path: '/how-it-works', element: <HowItWorksPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/help/faqs', element: <FaqPage /> },
      { path: '/help/contacts', element: <ContactsPage /> },
      { path: '/help/support', element: <SupportPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
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
      { path: '/support/chat', element: guard(['applicant'], <ApplicantChatPage />) },
    ],
  },
  {
    element: <StaffShell />,
    children: [
      { path: '/staff', element: guard(STAFF_ROLES, <StaffHomePage />) },
      { path: '/staff/queue/screening', element: guard(['screening_officer', 'admin'], <ScreeningQueuePage />) },
      { path: '/staff/reviews', element: guard(['reviewer'], <MyReviewsPage />) },
      { path: '/staff/queue/decision', element: guard(['admin'], <DecisionQueuePage />) },
      { path: '/staff/cases', element: guard(['admin'], <AllCasesPage />) },
      { path: '/staff/cases/:id', element: guard(STAFF_ROLES, <StaffCasePage />) },
      { path: '/staff/cases/:id/score', element: guard(['reviewer'], <ScorePage />) },
      // Reviewers too: the server shows them the panel only after they have submitted their own scorecard.
      { path: '/staff/cases/:id/panel', element: guard(['admin', 'reviewer'], <PanelPage />) },
      { path: '/reports', element: guard(['admin'], <ReportsPage />) },
      { path: '/audit', element: guard(['admin', 'auditor'], <AuditPage />) },
      { path: '/support/inbox', element: guard(['admin'], <SupportInboxPage />) },
      { path: '/admin/challenges', element: guard(['admin'], <AdminChallengesPage />) },
      { path: '/admin/challenges/:id', element: guard(['admin'], <ChallengeEditorPage />) },
      { path: '/admin/rubrics/:id', element: guard(['admin'], <RubricEditorPage />) },
      { path: '/admin/users', element: guard(['admin'], <AdminUsersPage />) },
      { path: '/admin/content', element: guard(['admin'], <ContentAdminPage />) },
      { path: '/admin/settings/roles', element: guard(['admin'], <RolesPage />) },
      { path: '/admin/settings/chat', element: guard(['admin'], <ChatSettingsPage />) },
    ],
  },
  {
    element: <RoleShell />,
    children: [{ path: '/notifications', element: guard([...STAFF_ROLES, 'applicant'], <NotificationsPage />) }],
  },
  { element: <PublicShell />, children: [{ path: '*', element: <NotFoundState /> }] },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
