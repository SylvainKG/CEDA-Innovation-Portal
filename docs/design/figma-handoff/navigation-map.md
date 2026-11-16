# Navigation map

**Maintained by:** Sandra · **Implemented by:** Obvious · **Source:** `02-figma-ui-ux-spec.md` §4 and §7 · **Last updated:** —
Update this file if the existing Figma design uses different navigation; log the difference in `handoff-notes.md` (D-33).

## Shells

| Shell | Who | Desktop (≥ 1024 px) | Mobile (< 768 px) |
|---|---|---|---|
| Public | Signed-out visitors | Top bar: logo · Challenges · Help · Sign in · Register | Top bar + menu drawer |
| Applicant | Applicant | Top bar: logo · My ideas · Challenges · Help · notifications · account; chat launcher | Top bar + bottom nav: My ideas · Challenges · Help · Chat |
| Staff | All other roles | Left side nav (240 px, collapsible) + top bar with case search, notifications, account | Top bar + drawer nav |

Every shell has a DEMO badge, a skip link and a footer (Privacy · Fault support · FAQs · Contacts).

## Staff side navigation by role

| Item → route | Screening | Reviewer | Adjudicator | Admin | Support | Committee | Auditor |
|---|---|---|---|---|---|---|---|
| Home → `/staff` | ● | ● | ● | ● | ● | ● | |
| Screening queue → `/staff/queue/screening` | ● | | | ● | | | |
| My reviews → `/staff/reviews` | | ● | | | | | |
| Ready for decision → `/staff/queue/decision` | | | ● | ● | | | |
| All cases → `/staff/cases` | | | | ● | | ◐ | |
| Reports → `/reports` | | | ● | ● | ◐ chat | ◐ | |
| Audit log → `/audit` | | | | ● | | | ● |
| Support inbox → `/support/inbox` | | | | | ● | | |
| Settings → `/admin/...` | | | | ● | | | |

## Routes by template

| Template | Routes |
|---|---|
| T01 | `/`, `/challenges` |
| T02 | `/auth/sign-in`, `/auth/register`, `/auth/verify`, `/auth/forgot`, `/auth/reset`, `/auth/mfa` |
| T03 | `/challenges/:slug`, `/help/faqs`, `/help/contacts`, `/help/support`, `/privacy` |
| T04 | `/ideas/new?challenge=`, `/ideas/:id/edit`, `/ideas/:id/revise` |
| T05 | `/ideas/:id/receipt?v=` |
| T06 | `/ideas` (applicant), `/staff` (staff) |
| T07 | `/staff/queue/screening`, `/staff/reviews`, `/staff/queue/decision`, `/staff/cases` |
| T08 | `/ideas/:id` (applicant), `/staff/cases/:id` (staff) |
| T09 | `/staff/cases/:id/score?v=`, `/staff/cases/:id/panel` |
| T10 | Dialogs/side sheets opened from T08 (no route) |
| T11 | Popover in every shell; `/notifications` |
| T12 | `/admin/challenges`, `/admin/challenges/:id`, `/admin/rubrics/:id`, `/admin/users`, `/admin/content`, `/admin/settings/roles`, `/admin/settings/chat` |
| T13 | `/reports` |
| T14 | `/audit` |
| T15 | Widget on T03/T04/T06/T08; `/support/inbox` |
