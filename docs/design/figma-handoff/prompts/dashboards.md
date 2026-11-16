# Dashboards: step-by-step run sheet for Sandra

**Goal:** design the MVP dashboards in Figma using your AI coding assistant connected to Figma through MCP, then hand them off through GitHub.
**Covers:** the 9 dashboard rows flagged in `screen-status.md`: T06 ×3, T07 ×4, T13, T14, T15 inbox.
**Rules:** TASK-02 §1 applies.
- Work only on the page `MVP — Working (Sandra)`.
- Never edit existing frames.
- Fictional data only.
- About 200 MCP read calls a day.

---

## A. On your machine (once per session)

```bash
cd <your local CEDA-Innovation-Portal folder>
git fetch origin
git switch docs/figma-inventory && git pull
git switch -c design/dashboards          # or: git switch design/dashboards && git pull
```

1. Start your AI coding assistant **in the repository root**, so it can read `docs/`.
2. Check the Figma connection by asking it: *"Using the Figma MCP, run whoami and tell me which account and seat you are connected with."*
3. In Figma, create (or open) the page **`MVP — Working (Sandra)`** in the CEDA file. Copy its link; you paste it as `<WORKING_PAGE_LINK>` in the requests below.
4. Make sure TASK-01 has at least listed the existing components and tokens, so the dashboards reuse them.

**Can the assistant draw in Figma?**
- If your MCP connection offers **write tools** (Figma lists write tools such as `generate_figma_design`), the assistant can draft frames directly on the working page.
- If not, it produces an exact build spec (frames, auto-layout, components, content) and you draw the frames from it.
- Either way, **you review and finish every frame yourself.**

## B. Paste this first (context request)

> You are helping design the CEDA Innovation Portal MVP dashboards in Figma.
> - Read `docs/blueprint/02-figma-ui-ux-spec.md` (§3 foundations, §4 shells, §5 components, §6 status language, §7 templates T06, T07, T13, T14, T15 and §9 checklist).
> - Read `docs/design/figma-handoff/design-tokens.md`, `component-specifications.md`, `navigation-map.md`, `screen-inventory.md` and `docs/design/figma-handoff/prompts/dashboards.md` §C (demo data).
>
> Rules:
> - Only create or change frames on the Figma page `<WORKING_PAGE_LINK>`. Never modify any other page or existing frame.
> - Reuse existing Figma components and variables before creating new ones.
> - Use only the fictional data in §C.
> - Every icon has a text label. Status uses icon + text, never colour alone.
> - Touch targets ≥ 44 px, input text 16 px, no horizontal scroll at 360 px.
> - Dates look like "18 Nov 2026, 14:05 CAT".
> - Each dashboard needs a **desktop 1280** and a **mobile 360** frame, plus the states listed.
> - Name frames `T07 / Screening queue / Desktop` and so on.
>
> Before drawing anything, summarise which existing components and tokens you will reuse and which are missing. Wait for my OK.

## C. Shared fictional demo data (use the same values in every dashboard)

**Challenge:** *Water-Smart Agriculture Challenge 2026* (open, closes 30 Nov 2026, 16:00 CAT).

**People** (all fictional, all labelled DEMO):
- Demo Applicant A (Lesedi Agro Demo), Demo Applicant B
- Screening officer: Demo Screening Officer
- Reviewers: Demo Reviewer 1, Demo Reviewer 2, Demo Reviewer 3
- Demo Adjudicator, Demo Administrator, Demo Consultant
- Committee member: Demo Committee (External)

| Reference | Title | Applicant | Applicant sees | Staff label | Reviewers | Score (1–5) | Last update |
|---|---|---|---|---|---|---|---|
| CEDA-2026-0001 | Solar cold-room for smallholders | Demo Applicant C | Awarded | Awarded (BWP 50,000) | R1, R2 | 4.4 | 12 Nov 2026 |
| CEDA-2026-0002 | Drip-irrigation sensor kit | Demo Applicant D | Approved | Approved | R1, R2 | 4.1 | 13 Nov 2026 |
| CEDA-2026-0003 | Greywater reuse for schools | Demo Applicant E | Not approved | Not approved | R2, R3 | 2.6 | 13 Nov 2026 |
| CEDA-2026-0004 | Borehole pump monitoring | Demo Applicant F | Under review | Ready for decision (2/2 scored, spread 2 ⚑) | R1, R3 | 3.5 | 14 Nov 2026 |
| CEDA-2026-0005 | Drought-tolerant seed marketplace | **Demo Applicant A** | Under review | In evaluation (1/2 scored) | R1, R2 | — | 14 Nov 2026 |
| CEDA-2026-0006 | Rainwater harvesting tanks | Demo Applicant G | Action required: revise your idea (due 20 Nov) | Waiting on applicant (revision) | R2, R3 | — | 15 Nov 2026 |
| CEDA-2026-0007 | Livestock water point mapping | Demo Applicant H | Submitted | Awaiting screening (2 days) | — | — | 13 Nov 2026 |
| CEDA-2026-0008 | Hydroponic fodder units | Demo Applicant I | Closed | Closed: not eligible | — | — | 11 Nov 2026 |
| CEDA-2026-0009 | Smart canal gate controller | **Demo Applicant A** | Submitted | Awaiting screening (today) | — | — | 15 Nov 2026 |

Plus **one draft** owned by Demo Applicant B (not visible to staff).

**Derived figures** (keep consistent across T06 and T13):
- 9 submitted · 2 awaiting screening · 1 in evaluation · 1 waiting on applicant · 1 ready for decision · 2 approved (1 of them awarded) · 1 not approved · 1 closed (ineligible) · 1 overdue task (0007 screening > 2 days).
- 12 registered applicants (illustrative).
- **Chat (last 7 days):** 6 sessions · 4 handled · 2 missed · average wait 3 min.

These numbers are illustrative for design. Final numbers come from the seed script and must then match.

## D. One request per dashboard

Paste one at a time, review the result, then move on. Order follows the design-ready dates.

### D1 · T06 Applicant "My ideas" (due 15 Nov)
> Design T06 Applicant "My ideas" (spec §7 T06) for **Demo Applicant A** on the working page.
> - **Desktop 1280** and **mobile 360** (1 column on mobile, 2 columns at 768, 3 at 1280).
> - Applicant shell with the DEMO badge.
> - A "Start a new idea" button.
> - Two IdeaCards: **CEDA-2026-0009** (Submitted, today) and **CEDA-2026-0005** (Under review). Each card shows title, challenge, reference pill, status badge, mini 5-stage timeline, "Updated …", and one primary action ("View idea").
>
> Also draw these state frames:
> - (a) **Action required**: a banner at the top plus a card in the Feedback stage, with "Respond by 20 Nov 2026, 16:00 CAT (in 5 days)".
> - (b) **Empty**: "You haven't started an idea yet" with open challenges listed.
> - (c) **Loading** skeleton.

### D2 · T06 Staff home (due 16 Nov)
> Design T06 Staff home (spec §7 T06) in the staff shell with the left side nav from `navigation-map.md`. Make one desktop frame per role variant, each with role-specific KPI tiles (with definitions), "Your next tasks" (max 5, linked) and "Recent activity" (10 latest events), all from §C data:
> - **Screening officer:** "2 awaiting screening", "1 overdue".
> - **Reviewer (Demo Reviewer 1):** "2 assigned · 1 not started".
> - **Adjudicator:** "1 ready for decision".
> - **Administrator:** "9 submitted · 1 in evaluation · 1 ready for decision · 1 overdue".
>
> Add a mobile 360 frame for the Administrator, plus an **empty** state ("Nothing needs your attention right now") and a **loading** state.

### D3 · T06 Committee overview (due 18 Nov)
> Design T06 Committee overview for Demo Committee (External) (spec §7 T06, blueprint D-08):
> - **Counts by stage only**, from §C.
> - A list of authorised cases showing **reference + stage + last update only**: no titles, scores or notes.
> - Desktop and mobile, plus empty and loading states.
> - Add a visible note: "Committee view shows status only."

### D4 · T07 Work queues (screening 16 Nov · admin/committee 16 Nov · reviewer 17 Nov · decision 18 Nov)
> Design the T07 work queue template (spec §7 T07) as four variants. Each uses the FilterBar (status, challenge, deadline, search by reference) and a DataTable (max 6 columns, sticky header, rows link to the case). On mobile, rows become stacked cards.
> 1. **Screening queue:** 0007 and 0009 with reference, title, challenge, submitted, waiting days, status. Flag 0007 as overdue.
> 2. **Reviewer assignments (Demo Reviewer 1):**
>    - Tabs: Not started · Declaration needed · In progress · Submitted.
>    - Columns: reference, title, version, due, my status. Show 0005 (Declaration needed) and 0004 (Submitted).
> 3. **Ready for decision:**
>    - Columns: reference, title, version, scores 2/2, aggregate, spread flag, roadmap summary.
>    - Show 0004, with spread ⚑ 2 and the label "Reviewers disagree by 2 points" (text, not colour alone).
> 4. **Admin all cases:** all 9 cases with reference, title, stage, assigned reviewers, last update, overdue flag. Add a **committee** variant with reference, stage and last update only.
>
> For each variant: desktop, mobile, and an **empty** state, e.g. "No cases are waiting for screening".

### D5 · T13 Reports (due 18 Nov)
> Design T13 Reports (spec §7 T13). The filter bar has a challenge filter, period presets and "Export CSV". Tabs: **Participation · Outcomes · Timelines · Impact · Chat**.
> - Use bar charts and KPI tiles only; **no pie charts**.
> - Every chart has a title stating what it shows, a one-line definition, and a "Show as table" toggle.
> - Data comes from §C:
>   - **Participation:** submissions per day, 11–15 Nov.
>   - **Outcomes:** funnel by stage.
>   - **Timelines:** median days in stage (illustrative) + overdue table with 0007.
>   - **Impact:** ideas that reached a later stage; ideas resubmitted after feedback; roadmap tasks verified %.
>   - **Chat:** 6 sessions, 4 handled, 2 missed, average wait 3 min.
> - Desktop for every tab; mobile for Participation and Outcomes.
> - States: **empty period** ("No activity in this period") and **chart error** (table still shown).

### D6 · T14 Audit log (due 18 Nov)
> Design T14 Audit log (spec §7 T14) for the Administrator.
> - Banner: "Audit entries can't be edited or deleted."
> - Filters: actor, case reference, action type, date range.
> - DataTable rows (newest first) for case **CEDA-2026-0004**: submitted, screened eligible, reviewers assigned, R1 declared no conflict, R1 scorecard submitted, R3 declared no conflict, R3 scorecard submitted, moved to adjudication. Columns: time (CAT), actor (with role), action, target, case link, "View details".
> - A **detail side sheet** showing metadata as key/value pairs, **with no proposal text**.
> - Desktop and mobile, plus **empty filter** ("No entries match these filters") and **forbidden** state frames.

### D7 · T15 Consultant inbox (due 18 Nov)
> Design the T15 Consultant inbox (spec §7 T15) for Demo Consultant.
> - **Desktop layout:**
>   - Left: waiting queue (2 chats with wait times) and my active chats (2, with unread dots).
>   - Centre: thread with Demo Applicant A asking how to attach a business plan.
>   - Right: applicant name and the page they opened chat from, with **no proposal content**.
> - Header: availability toggle (Available / Away). Several threads open as tabs.
> - Mobile: list → thread.
> - Also draw the **outside hours** state: "Chat is open Monday–Friday, 09:00–16:00 (Gaborone time)."

## E. After each dashboard

Ask your assistant:

> Check the frames for `<dashboard>` against spec §9 (contrast, labels, icon + text, 44 px targets, no horizontal scroll at 360 px, CAT dates) and list any failures. Then update `docs/design/figma-handoff/screen-status.md` for this row: Mobile and Desktop = Provisional, Designer = Sandra, Figma frame link and node ID, Last snapshot = today. Add any new components to `component-specifications.md`, and any conflicts with the blueprint to `handoff-notes.md`. Do not change any other rows.

Then, in Figma:
1. **Export** each frame at 1x as PNG or WebP (≤ 300 KB) into `docs/design/figma-handoff/snapshots/`, following the naming rule in `snapshots/README.md`.
2. Example: `T07-screening-queue__screening-officer__desktop__2026-11-16.png`.

## F. Push and hand off (by 17:00 CAT each day)

```bash
git add docs/design/figma-handoff
git commit -m "Design: dashboards <list> (provisional)"
git push -u origin design/dashboards
```

1. Open a pull request into **`docs/figma-inventory`** (into `main` once PR #1 is merged).
2. Title it "Design: dashboards (provisional)".
3. List the dashboards, their status and any discrepancies.
4. Request reviews from **Obvious** (buildability) and **Sylvain** (blueprint conformance).
5. After approval, set the rows to **Approved**.

## G. If something goes wrong

| Problem | Do this |
|---|---|
| Assistant can't write to Figma | Ask it for the exact build spec instead and draw the frames manually |
| MCP rate limit or outage | Continue manually in Figma; log the time in `handoff-notes.md` |
| Existing design conflicts with the spec | Log it in `handoff-notes.md`; follow the blueprint's behaviour; the team decides |
| A dashboard won't be ready by its date | Tell Sylvain before 15:00 CAT; push what exists as Provisional; Obvious continues from the snapshot |
