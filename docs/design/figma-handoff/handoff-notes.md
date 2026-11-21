# Handoff notes

**Maintained by:** Sandra · **Backup:** Obvious. Newest entry first. No credentials (D-40).

## Discrepancies between Figma and the blueprint (D-33)

Functionality follows the blueprint until the team decides. Source for every row: the Figma Make file (https://www.figma.com/make/zrioM3hOSeeP6xpFstPgen/CEDA-Innovation-Management-Portal). Logged 16 Nov 2026 during TASK-01.

| # | Date | Screen / frame (link) | Figma shows | Blueprint requires | Proposed resolution | Decision (team, date) |
|---|---|---|---|---|---|---|
| 1 | 16 Nov | All (`src/index.css`, logo asset) | CEDA logo, orange `#F58220` / gold `#F9C51C`, Inter | Placeholder teal `#0B5A7A`, Source Sans 3 until CEDA guidance arrives (D-04) | Treat the Make palette and Inter as the visual source (D-32) and ask CEDA on 16 Nov to confirm. Apply contrast fix F2 either way | **Resolved (Sandra, 16 Nov 2026): the existing Make brand colours are approved.** Placeholder palette retired. Contrast handled with existing colours only (F2 in `design-tokens.md`) |
| 2 | 16 Nov | `ApplicationDetail`, `Journey`, `PublicHome` process, admin stages | 6 stages: Submitted · Eligibility review · Evaluation · **Shortlisted** · Adjudication · Decision | 5 public stages: Submission · Review · Feedback · Approval · Award (§4.3, spec §6). No shortlisting state | Use the blueprint's 5 stages for the applicant timeline. Eligibility and evaluation fold into "Review" | |
| 3 | 16 Nov | `Comparison` (adjudicator "Panel review") | Two **different applications** compared side by side, ranked by score /100 | Panel view for **one case**: criterion × reviewer matrix, weighted aggregate, spread flag, roadmap summary (T09) | Redesign as the single-case panel. Cross-case ranking stays in the T07 decision queue | |
| 4 | 16 Nov | `Comparison` decision panel | Options Select · Not Selected · Request Further Information; one "Confirm decision" step; "Applicant communication subject to administrative release" | Approved / Not approved recorded unpublished → separate **Publish** → separate **Award** by admin (DEC-01/02, D-05). Revision/clarification via `request_feedback` (T10) | Rename outcomes; add Publish and Award dialogs; move "Request further information" to the T10 clarification/revision action | |
| 5 | 16 Nov | `EvaluationReview`, `Rubric` | 6 criteria, unweighted, total /30; adjudicator sees /100 | 4 weighted criteria (30/25/25/20), 1–5 with anchors, rationale required, no N/A (D-20, §3.1 seed) | Follow the blueprint; show weighted score consistently in T07 and T09 | |
| 6 | 16 Nov | `EvaluationReview` | Proposal content opens immediately | Conflict + confidentiality declaration before any content (D-19, N10) | Add the T09 declaration gate in front of the scorecard | |
| 7 | 16 Nov | All copy | "Application", "Programme", "Evaluator", "Shortlisted", "Selected" | "Idea/case", "Challenge", "Reviewer", "Approved", "Awarded" (blueprint terminology note; spec §6 labels) | Pick one vocabulary for UI copy. Proposal: applicant-facing "idea" and "challenge" per spec §6; staff role "Reviewer" | |
| 8 | 16 Nov | `UploadSection` | PDF, DOCX, **PPTX**, JPG, PNG up to **20 MB** | Max 10 MB; PDF/DOCX/XLSX/PNG/JPG (§4.1 attachments) | Follow the blueprint | |
| 9 | 16 Nov | All (`src/index.css`) | Body, table and input text at 7–10 px; white on `#F58220` = 2.59:1 | Body/input 16 px, small 14 px; text ≥ 4.5:1, UI ≥ 3:1 (spec §3, §9) | Apply fixes F1–F6 in `design-tokens.md` before more screens are drawn | |
| 10 | 16 Nov | File setup | Only a Figma Make file, in a personal Starter team; no canvas file | A team-controlled project with ≥ 2 editors and owners (D-34); TASK-02 page `MVP — Working (Sandra)`; snapshots exported from frames | Decide where new design work lives: (a) a new Figma Design file in a team project (needs a Professional plan for MCP and team ownership), or (b) continue in Make and capture snapshots from its preview | **Resolved (Sandra, 16 Nov 2026): keep working in Make**, on a duplicate named `CEDA Portal — MVP Working (Sandra)`; snapshots captured from the preview (`prompts/make-applicant-and-staff.md`). Team-owned access (D-34) still open |
| 11 | 16 Nov | `ProgrammeSetup` → Evaluation stages | Drag-to-reorder workflow stages | Fixed state machine; ADM-01 has no builder | Unmapped — drop, or keep as a read-only list (Sylvain scope check) | |
| 12 | 16 Nov | `ProgrammeSetup` → Reviewer assignment | Workload page for reviewers | Assignment per case in a T10 dialog, showing reviewer load | Reuse the workload list inside the T10 assign dialog | |
| 13 | 16 Nov | `AdminView` overview | Donut chart | No pie charts (spec T13) | Replace with horizontal bars | |
| 14 | 16 Nov | Roles | Public, applicant, evaluator, adjudicator, admin | Also screening officer, support consultant, committee member, auditor (§2.2) | Design the missing role variants from the shared shell and table | |
| 15 | 16 Nov | Demo data | `CEDA-2025-NNNN`, 2025 dates, personas Amantle Moyo, Kabelo Ndlovu, M. Olebile, Thato Molefe | `CEDA-2026-NNNN`, seed personas (Demo Applicant A — Lesedi Agro Demo, Water-Smart Agriculture Challenge 2026) (§3.1) | Use blueprint seed data in all new frames and snapshots | |
| 18 | 21 Nov | T08 Applicant case view (Sandra's "ceda view ideas" export, #100) | Five steps always, Feedback greyed when unused; version picker with no visible label; field labels only | The shared StageTimeline shows Feedback only once it happens; every control needs a visible label (spec §9); the form schema groups answers in sections | Five steps wait for the shared stepper change (Obvious, #100 decision 2). The picker keeps the shared Select's "Version" label. Section titles stay as small headings inside the card. Added: "What changed in this version" and a note when an earlier version is shown | |

## Handoff log

| Date (CAT) | Screens | Snapshot files | What changed | Open questions | Author |
|---|---|---|---|---|---|
| 16 Nov 2026 | Make prompt set for Slices 1–2 | — | Brand colours approved; contrast resolved with existing colours (F2); design location = Make; prompts added | — | Sandra (assisted) |
| 16 Nov 2026 | Inventory only (all templates) | None yet — Make files can't be screenshotted through MCP | TASK-01 first pass: inventory, status, tokens, components, discrepancies 1–15 | #1–#5, #7, #10 need a team decision before slice 2–4 screens are drawn | Sandra (assisted) |

## Outages, limits and takeovers (§9)

| Date and time (CAT) | Event (rate limit / outage / access / takeover) | Effect | Continued with | Reconciled on |
|---|---|---|---|---|
| 16 Nov 2026, 09:30 | Rate limit (plan): Sandra's Figma account is on the **Starter plan**, about 20 MCP read calls per month. Canvas read tools don't support Make files | MCP inventory not possible beyond the Make source; MCP budget for TASK-02 effectively gone | Manual inventory (TASK-01 B2) from the Make source | Open — needs a Professional plan seat or a team-owned file (#10) |
