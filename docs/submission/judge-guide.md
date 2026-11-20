# Judge guide: CEDA Innovation Portal (demonstration)

**Owner:** Sylvain (documentation lead) · **Status:** Draft, finalised at the release (22 Nov 2026) · **Answers:** DOC-02, REL-01, D-07, D-17
Items marked **[confirm at release]** are filled in or checked on the release build. Nothing here may claim more than the claim register (`docs/testing/claim-register.md`) shows as Passed.

> This is a **demonstration with fictional data only.** Every person, organisation, idea and contact is invented and labelled DEMO or Sample. Please don't enter real personal data.

## 1. Access

| What | Value |
|---|---|
| Portal | **[confirm at release]** the judging URL |
| Password for every demo account | Given with the submission, **not** in this repository (D-17) |
| Browser | A current Chrome, Edge or Firefox; also works on a phone (360 px and up) |
| Times | All times are shown in Gaborone time (CAT) |

### Demo accounts

All addresses end in `@demo.ceda-portal.test`. Each account sees only what its role allows. **[confirm at release]** the "Start here" screens: some staff screens are still being built.

| Account | Role | Start here | Look at |
|---|---|---|---|
| `applicant.a` | Applicant (Lesedi Agro Demo) | My ideas | Submit a new idea; follow it through the stages |
| `applicant.b` | Applicant | My ideas | Try to open Applicant A's idea (section 3) |
| `screening` | Screening officer | Screening queue | Record a screening result; ask for a clarification or a revision |
| `reviewer.1`, `reviewer.2` | Reviewers | My reviews | Declare no conflict, then score against the rubric |
| `reviewer.3` | Reviewer, not assigned to the demo case | My reviews | Sees nothing of cases they aren't assigned to |
| `adjudicator` | Adjudicator | Ready for decision | Compare scores, record and publish a decision |
| `admin` | Administrator and auditor | All cases | Assign reviewers, record an award, read the audit log |
| `consultant` | Support consultant and lead | Support inbox **[confirm at release]** | Answers questions; can't see proposals or scores |
| `committee.ext` | External committee member | All cases | Reference and stage only (D-08) |
| `applicant.c`, `.d`, `.e` | Applicants | My ideas | Owners of the background cases |

**Staff two-step sign-in:** staff permissions normally require a second factor. The seeded demo staff accounts are exempt so that judges can sign in directly (D-07). The exemption is a setting, and it is switched off for any real use.

## 2. The main journey in about 15 minutes

The demo data holds eight earlier cases (`CEDA-2026-0001` to `0008`), so **your first submission becomes `CEDA-2026-0009`**. Use a private window per account, or sign out between steps.

| # | Sign in as | Do | You should see |
|---|---|---|---|
| 1 | `applicant.a` | My ideas → **Start a new idea** on the Water-Smart Agriculture Challenge. Fill the sections, attach a PDF business plan, accept the declaration, **Submit idea** | A receipt with reference `CEDA-2026-0009` and the time in CAT. The idea appears in My ideas as Submitted |
| 2 | `screening` | Screening queue → the new case → **Record screening: Eligible** with a short reason | The case moves to evaluation; the applicant sees "Under review". The reason stays with staff |
| 3 | `admin` | The case → **Assign reviewers** → Reviewer 1 and Reviewer 2 | Each reviewer shows "Declaration needed" |
| 4 | `reviewer.1`, then `reviewer.2` | My reviews → the case → **declare no conflict** → score each criterion with a reason → submit | Before declaring, the proposal and files are hidden. A reviewer sees the other's scores only after submitting their own. After the second scorecard the case is **Ready for decision** |
| 5 | `adjudicator` | Ready for decision → score panel → **Record decision: Approved** with a reason → **Publish** | Until published, the applicant sees no decision. After publishing they see Approved, the reason and next steps |
| 6 | `admin` | The case → **Record award** (for example BWP 250,000.50) | The applicant sees the award |
| 7 | `applicant.a` | My ideas → the idea | The stage timeline, decision, award and next steps |

**[confirm at release]** which of steps 2–7 run through the screens on the judging build. Steps whose screens are not released are shown in the demo video and were verified through the API (claim C-15).

Also worth trying:
- **Revision and roadmap:** as `screening`, ask for a revision with tasks on a case. The applicant answers each task, and version 1's scores stay with version 1 (C-13). **[confirm at release]**
- **Clarification:** case `CEDA-2026-0003` has an open question for `applicant.e`. A reply returns the case to its stage without creating a new version.

## 3. Access control you can check yourself

These are refused **by the server**, not only hidden in the screens.

| Try | Expected |
|---|---|
| As `applicant.a`, copy the address of your idea; sign in as `applicant.b` and open it, and its `/receipt` | "We can't find this page". Nothing about the idea is shown |
| As `applicant.a`, open `/staff/queue/screening` or `/audit` | "You don't have access to this page" |
| As `reviewer.3`, look for the demo case | Not listed; no proposal and no files (N3) |
| As `reviewer.1`, open an assigned case **before** declaring | No proposal and no files until the declaration (N10) |
| As `consultant`, look for proposals or scores | None (N7) |
| As `admin`, try to give yourself another role (through the users screen **[confirm at release]**, or the API) | Refused, and the attempt is audited (N8) |
| As `applicant.a`, look for a decision before it is published | Nothing (N4) |

Evidence for each: the negative suite in `docs/testing/test-plan.md` §2 and the run records in `artifacts/phase-00/hosted-supabase.md`.

## 4. What is real, simulated or not included

| Area | Status |
|---|---|
| Submission, references, versions, files (private, 60-second download links) | Built and verified on the hosted project (C-02, C-11) |
| Roles and permissions, enforced in the database for every route | Built and verified (C-01, C-03 to C-10) |
| Audit trail | Every workflow action is recorded. Entries can't be changed or deleted by any portal user, including administrators (C-06, C-14) |
| Live updates | Delivered only to the people allowed to see them (C-16) |
| **Email alerts** | **Simulated.** Alerts are queued and the relay runs, but no email server is connected for the demo, so nothing is sent (C-22). In-portal notifications are real |
| Privacy notice, declaration, FAQs, contacts | **Sample wording**, labelled as such, awaiting CEDA's text |
| Registration of a new account | Works, but the verification email needs the email service (see above). Use the demo accounts |
| Backups | The database can be restored from a backup (restore drill, C-20). File storage isn't part of that drill |

The full list, with the evidence and anything Not run, is in `docs/testing/claim-register.md`.

## 5. Notes for judging

- Your actions change the shared demo data, as they would in real use. References keep counting from `CEDA-2026-0009`.
- The portal stays available until results on 3 December 2026. Nothing is deployed after the deadline unless the organisers approve it.
- Questions during judging: **[confirm at release]** the named contact (DEF-01), who answers the same working day, 08:00–17:00 CAT.
