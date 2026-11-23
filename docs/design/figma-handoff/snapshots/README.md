# Snapshots

Approved and provisional screen exports. They are the visual reference developers build from when Figma is unavailable (blueprint §8.6, §9).

- **Name:** `<template>-<screen>__<variant-or-role>__<mobile|desktop>__<YYYY-MM-DD>.(png|webp)`. Example: `T04-proposal-form__applicant-review__mobile__2026-11-15.png`.
- **Format:** PNG or WebP, exported from Figma at 1x (2x only if text is unreadable), **≤ 300 KB each**. The folder total is **≤ 25 MB** (proposed).
- **Content:** fictional data only. No real names, emails or proposals; no credentials or personal account details visible.
- **Versions:**
  - Keep older snapshots until the screen is *Verified*.
  - `screen-status.md` records which snapshot is current.
- **Not here:** `.fig` files, large exports, video.

## Snapshot log

| Date | File | Screen | Source | Notes |
|---|---|---|---|---|
| 21 Nov 2026 | `T02-sign-in__default__desktop__2026-11-21.png` | Sign in | Figma export "ceda site signin" | Windows activation watermark at the bottom right is from the screen capture, not the design |
| 21 Nov 2026 | `T02-sign-in__error-and-demo-picker__desktop__2026-11-21.png` | Sign in: wrong password, demo picker | "ceda site sign in + dashboard" | Re-exported from Figma by ABM with demo data only (21 Nov); replaces the earlier redacted copy |
| 21 Nov 2026 | `T02-register__error__desktop__2026-11-21.png` | Create account: missing name | "ceda site create account" | Re-exported from Figma by ABM with demo data only (21 Nov); replaces the earlier redacted copy. The frame shows the signed-in header by mistake (`handoff-notes.md`) |
| 21 Nov 2026 | `T06-my-ideas__applicant__desktop__2026-11-21.png` | My ideas | "ceda site applicant A" | |
| 21 Nov 2026 | `T08-applicant-case__proposal-tab__desktop__2026-11-21.png` | Applicant case view, Proposal tab | "ceda view ideas" ("ceda site revise idea" is the same screen and was left out) | |
| 21 Nov 2026 | `T04-revise-v2__roadmap-and-form__desktop__2026-11-21.png` | Revise idea, step 1 | "ceda site revise idea (1)" | Watermark as above |
| 21 Nov 2026 | `T04-revise-v2__review-changes__desktop__2026-11-21.png` | Revise idea, step 2 | "ceda review changes" | |
| 21 Nov 2026 | `T06-staff-home__screening-officer__desktop__2026-11-21.png` | Staff home: screening officer | "ceda screening officer dashboard" | Left-hand staff navigation |
| 21 Nov 2026 | `T06-staff-home__reviewer__desktop__2026-11-21.png` | Staff home: reviewer | "ceda reviewer" | |
| 21 Nov 2026 | `T08-staff-case__screening-proposal-tab__desktop__2026-11-21.png` | Staff case view, screening officer | "ceda screening submitted proposals view" | |
| 21 Nov 2026 | `T10-record-screening__side-sheet__desktop__2026-11-21.png` | Record screening side sheet | "ceda record screening" | |
| 21 Nov 2026 | `T05-receipt__version-2__desktop__2026-11-21.png` | Version 2 receipt | "ceda submittion" | |
| 22 Nov 2026 | `T06-staff-home__adjudicator__desktop__2026-11-21.png` | Staff home: adjudicator | Figma export "ceda adjudicator" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T06-staff-home__admin__desktop__2026-11-21.png` | Staff home: administrator | Figma export "ceda administrator" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T07-ready-for-decision__adjudicator__desktop__2026-11-21.png` | Ready for decision (adjudicator work queue) | Figma export "ceda adjudicator work cases" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T07-all-cases__admin__desktop__2026-11-21.png` | All cases, admin | Figma export "ceda administrator screening" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T09-declaration-gate__reviewer__desktop__2026-11-21.png` | Reviewer declaration gate | Figma export "ceda pre review" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T09-scorecard__reviewer__desktop__2026-11-21.png` | Reviewer scorecard | Figma export "ceda scoreboard" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T09-panel__adjudicator__desktop__2026-11-21.png` | Adjudicator score panel | Figma export "ceda adjudicator evaluation" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T10-record-decision__side-sheet__desktop__2026-11-21.png` | Record decision side sheet | Figma export "ceda adjudicatorsave decision" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T12-users-roles__admin__desktop__2026-11-21.png` | Users and roles | Figma export "ceda administrator users +roles" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T12-users-roles__invite-sheet__desktop__2026-11-21.png` | Invite user side sheet | Figma export "ceda administrator invite user" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T13-reports__participation__desktop__2026-11-21.png` | Reports: participation (adjudicator) | Figma export "ceda adjudicator reports" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T13-reports__outcomes__desktop__2026-11-21.png` | Reports: outcomes | Figma export "ceda adjudicator reports - outcomes" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T13-reports__timelines__desktop__2026-11-21.png` | Reports: timelines | Figma export "ceda adjudicator reports - timelines" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T13-reports__impact__desktop__2026-11-21.png` | Reports: impact | Figma export "ceda adjudicator reports - impact" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T13-reports__chat__desktop__2026-11-21.png` | Reports: chat | Figma export "ceda adjudicator reports - chats" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T13-reports__admin-participation__desktop__2026-11-21.png` | Reports: participation (administrator) | Figma export "ceda administrator reporting" | Rendered by ABM for Sandra (P7-04) |
| 22 Nov 2026 | `T01-home__public__desktop__2026-11-22.png` | Home | Build capture: `/`, signed out | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T02-forgot-password__public__desktop__2026-11-22.png` | Forgot password | Build capture: `/auth/forgot` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T03-challenge-brief__public__desktop__2026-11-22.png` | Challenge brief | Build capture: `/challenges/water-smart-agriculture-2026` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T03-help-faqs__public__desktop__2026-11-22.png` | FAQs | Build capture: `/help/faqs` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T04-proposal-form__applicant__desktop__2026-11-22.png` | Proposal form, new idea | Build capture: `/ideas/new`, applicant | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T06-staff-home__committee__desktop__2026-11-22.png` | Committee overview | Build capture: `/staff`, committee member | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T06-staff-home__support__desktop__2026-11-22.png` | Staff home: support consultant | Build capture: `/staff`, consultant | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T07-screening-queue__screening-officer__desktop__2026-11-22.png` | Screening queue | Build capture: `/staff/queue/screening` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T07-my-reviews__reviewer__desktop__2026-11-22.png` | My reviews | Build capture: `/staff/reviews`, reviewer 1 | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T07-all-cases__committee__desktop__2026-11-22.png` | All cases, committee (status only, D-08) | Build capture: `/staff/cases`, committee member | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T08-staff-case__admin-proposal-tab__desktop__2026-11-22.png` | Staff case, admin, Proposal tab | Build capture: `/staff/cases/…0002`, admin | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T11-notifications__applicant__desktop__2026-11-22.png` | Notifications | Build capture: `/notifications`, applicant | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T12-challenges__admin__desktop__2026-11-22.png` | Challenges list (Settings) | Build capture: `/admin/challenges` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T12-roles__admin__desktop__2026-11-22.png` | Roles | Build capture: `/admin/settings/roles` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T12-content__admin__desktop__2026-11-22.png` | Content | Build capture: `/admin/content` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T12-chat-settings__admin__desktop__2026-11-22.png` | Chat settings | Build capture: `/admin/settings/chat` | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T14-audit-log__admin__desktop__2026-11-22.png` | Audit log | Build capture: `/audit`, admin | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T15-chat__applicant__desktop__2026-11-22.png` | Chat with CEDA | Build capture: `/support/chat`, applicant | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T15-consultant-inbox__consultant__desktop__2026-11-22.png` | Support inbox | Build capture: `/support/inbox`, consultant | No frame; approved in the 22 Nov staging review |
| 22 Nov 2026 | `T02-sign-in__default__desktop__2026-11-22.png` | Sign in | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T02-register__error__desktop__2026-11-22.png` | Create account: errors | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T05-receipt__version-1__desktop__2026-11-22.png` | Receipt, version 1 | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T06-my-ideas__applicant__desktop__2026-11-22.png` | My ideas | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T08-applicant-case__proposal-tab__desktop__2026-11-22.png` | Applicant case view, Proposal tab | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T06-staff-home__screening-officer__desktop__2026-11-22.png` | Staff home: screening officer | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T10-record-screening__side-sheet__desktop__2026-11-22.png` | Record screening side sheet (viewport) | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T09-scorecard__reviewer__desktop__2026-11-22.png` | Reviewer scorecard | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T06-staff-home__adjudicator__desktop__2026-11-22.png` | Staff home: adjudicator | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T09-panel__adjudicator__desktop__2026-11-22.png` | Adjudicator score panel | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T10-record-decision__side-sheet__desktop__2026-11-22.png` | Record decision side sheet (viewport) | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T13-reports__participation__desktop__2026-11-22.png` | Reports: participation (adjudicator) | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T06-staff-home__admin__desktop__2026-11-22.png` | Staff home: administrator | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T07-all-cases__admin__desktop__2026-11-22.png` | All cases, admin | Build capture, polished set | Next to its 21 Nov frame |
| 22 Nov 2026 | `T12-users-roles__admin__desktop__2026-11-22.png` | Users and roles | Build capture, polished set | Next to its 21 Nov frame |
| 23 Nov 2026 | `T01-home__public__desktop__2026-11-23.webp` | Home, integrated dawn hero | Build capture: `/`, signed out | Mock mode, demo data, 1280 × 900; provisional pending Sandra's review |
| 23 Nov 2026 | `T01-home__public__mobile__2026-11-23.webp` | Home, integrated dawn hero | Build capture: `/`, signed out | Mock mode, demo data, 360 × 900; provisional pending Sandra's review |

All seven were rendered from the PDFs at 100 dpi, cropped to the page content and saved as 128-colour PNGs (19–49 KB each). Added by Sylvain on Sandra's behalf (assisted). On 21 Nov ABM re-exported the two frames that held personal data, with demo data, and exported five more (staff screens and the V2 receipt); the team lead approved all of them, for Sandra to confirm.

**Final set, 22 Nov (P7-04, ABM for Sandra).** The 16 frames in `Figma pdf/` that had no snapshot were rendered the same way (100 dpi, cropped below the page content, 128 colours; 21–69 KB each). Their date is the frame's, 21 Nov. The 19 **build captures** cover approved screens that have no frame: the app on `main` `cbb1df3` in mock mode, 1280 px wide, full page, the development role switcher hidden, 128 colours (34–118 KB each). They carry the capture date, 22 Nov. All 35 show demo data only. The folder holds 47 snapshots, 2.1 MB. Each screen's current snapshot and result: [`design-reconciliation.md`](../design-reconciliation.md).

**Polished set, 22 Nov (ABM, after Sylvain's visual-polish request).** The screens on the judges' tour were captured again from the polished build: `main` `87f2097` with #142 (admin navigation), #144 (public header) and #145 (scorecard colours) merged in a local preview, in mock mode at 1280 px, demo data only. The 15 files above sit next to their 21 Nov frames, so each frame and its build can be compared side by side. Ten earlier build captures (T01 home, T02 forgot password, T03 brief and FAQs, T08 admin staff case, T12 challenges, roles, content and chat settings, T14 audit log) were taken again the same way, because the public header and the admin navigation changed. The folder now holds 64 snapshots, about 3.2 MB, none over 200 KB. If #142, #144 or #145 change before they merge, the affected files are captured again.

**Home hero, 23 Nov (ABM).** Captured the team's integrated dawn composition in mock mode at desktop 1280 × 900 and mobile 360 × 900. This treatment has no dedicated Figma frame and is provisional pending Sandra's review.
