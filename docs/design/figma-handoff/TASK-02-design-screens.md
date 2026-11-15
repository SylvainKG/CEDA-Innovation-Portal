# TASK-02: Design the MVP screens in Figma, slice by slice

**Owner:** Sandra (UI/UX & Figma Integration Lead) · **Backup:** Obvious · **Reviewers:** Obvious (buildability), Sylvain (blueprint conformance)
**Starts:** 15 Nov 2026, after the TASK-01 inventory · **Runs until:** 18 Nov 2026 (last design-ready date)
**Sources of truth:**
- **Visual design:** the existing CEDA Figma project.
- **Behaviour:** blueprint v0.3 §2 and `02-figma-ui-ux-spec.md` §7 (D-32).

**This task is design only. No application code.**

---

## 0. Before you design anything (today, about 2–3 hours)

1. **Get the repo up to date.**
   ```bash
   git fetch origin
   git switch docs/figma-inventory && git pull
   git switch -c design/inventory        # TASK-01 work
   ```
2. **Install the team skills locally (optional but recommended).**
   - Until PR #2 is merged, download the `skills/` folder from the `project-skills` branch.
   - Copy both skill folders into your AI coding assistant's project skills directory.
   - Never commit that directory.
3. **Finish TASK-01 first, time-boxed to about 2 hours.**
   - You don't need perfect detail. You do need to know which T01–T15 screens **already exist** so you reuse them instead of redrawing.
   - Push it and open the PR (`design/inventory` → `docs/figma-inventory`).
   - Post the summary to the team.
4. **Fill in `design-tokens.md`** from the Figma variables you found. Shaw (Obvious) needs these to build the theme today.

## 1. Rules that protect existing work

| Rule | Why |
|---|---|
| **Do not edit existing frames** until the team approves your inventory (D-39). Create new frames on a new page called **`MVP — Working (Sandra)`**. To extend an existing screen, **duplicate** it onto that page and change the copy | Nothing approved gets overwritten |
| **Reuse first:** existing components, styles and variables before creating new ones. Any new component goes in `component-specifications.md` | One design system |
| **Fictional data only** in every frame (names, emails, proposals). Use the demo personas from blueprint §3.1 | Privacy; screenshots go into the repo and the proposal |
| **Figma AI features are optional** and used only with fictional content (D-41) | Credits can run out; no confidential data in external AI |
| **MCP budget:** about 200 read calls a day (Full/Dev seat). Use MCP to read structure and tokens. Export snapshots with Figma's own export (no MCP cost) | §9.1 fallback |
| **Claim before you edit:** put your name in `screen-status.md` (*Designer*, status *In design*) | Avoid conflicting edits (§9.2) |
| **No credentials** in any file, commit or screenshot | D-40 |

## 2. What to design, in order

Design-ready dates come from blueprint §5. **Each screen needs a mobile (360 px) and a desktop (1280 px) frame.** For each one, check its *Mobile*/*Desktop* status in `screen-status.md`.

| Due (end of day, CAT) | Screens (`screen-status.md` rows) | Slice |
|---|---|---|
| **15 Nov (today)** | Shells + state kit · T01 public home · T02 auth set · T03 challenge brief · T04 proposal form (draft, attachments, review & declare) · T05 receipt · T06 applicant "My ideas" | 1 |
| **16 Nov** | T06 staff home · T07 screening queue + admin/committee lists · T08 applicant case view + staff workspace · T10 action dialogs · T12 users & roles | 2 |
| **17 Nov** | T07 reviewer assignments · T09 declaration gate, scorecard, panel, V2 verification · T11 notifications · T04 V2 revise mode · T08 feedback tab · T10 revision request with task builder | 3, 4 |
| **18 Nov** | T07 ready for decision · T08 decision tab + award · T03 FAQs/contacts/support/privacy · T06 committee · T12 editors · T13 reports · T14 audit · T15 chat widget + consultant inbox | 5, 6 |

If time runs short, the **slice dates win**: deliver the earliest-due screens in a buildable *Provisional* state rather than polishing later ones.

**The dashboards** (T06, T07, T13, T14, T15 inbox) are flagged in `screen-status.md`. Base them on the same shell, KPI tile and data table components so they look like one system.

## 3. How to design each screen

1. **Claim it** in `screen-status.md`.
2. **Read its behaviour:** the template section in `02-figma-ui-ux-spec.md` §7 (content, actions, states, role differences) and the role map in blueprint §2.2.
3. **Start from what exists:** the inventory mapping, existing components and tokens.
4. **Draw both breakpoints** (360 and 1280; 768 only where the layout changes).
5. **Draw every state the slice needs:** loading, empty, error, forbidden, plus the special states in the spec (offline banner on T04, unknown outcome on submit, closed chat on T15, and so on).
6. **Name frames** like this: `T04 / Proposal form / Applicant / Review & declare / Mobile`.
7. **Self-check** (spec §9):
   - contrast measured;
   - every icon has a text label;
   - status shown with icon + text, not colour alone;
   - visible labels on all inputs;
   - error summary on long forms;
   - touch targets ≥ 44 px;
   - 16 px input text;
   - no horizontal scroll at 360 px;
   - dates shown as "21 Nov 2026, 16:00 CAT".
8. **Mark it *Provisional*** in `screen-status.md`, with the frame link, node ID and today's date.
9. **Export snapshots** to `docs/design/figma-handoff/snapshots/` (rules in `snapshots/README.md`).
10. **Note anything that conflicts with the blueprint** in `handoff-notes.md`. Do not change the behaviour yourself (D-33).

## 4. Hand off through GitHub (at least once a day, by 17:00 CAT)

```bash
git switch docs/figma-inventory && git pull
git switch -c design/slice-1            # then design/slice-2, ...
# add snapshots, update screen-status.md, design-tokens.md, component-specifications.md, handoff-notes.md
git add docs/design/figma-handoff
git commit -m "Design: slice 1 screens (provisional)"
git push -u origin design/slice-1
```

- Open a pull request into **`docs/figma-inventory`** (into `main` once PR #1 is merged).
- In the description, list the screens, their status and any discrepancies.
- **Request reviews** from Obvious (buildability) and Sylvain (blueprint conformance).
- When both approve, set the screens to **Approved** and merge. The approved snapshot becomes the visual source of truth.

**Ready for build** (D-37) means all of the following:
- the screen is at least *Provisional* with the states the slice needs;
- its snapshot is in the repo;
- its backend operations are in the approved API contract (Stacey is preparing it; until then Obvious builds against mocks).

Obvious starts implementing a screen as soon as it is Ready for build. You do not need to finish the whole file first (§7.3).

## 5. Useful requests for your AI coding assistant with Figma MCP

Paste a frame link where `<link>` appears. These only **read** from Figma:

- "Using the Figma MCP, read the structure of page `<link>` once and list every top-level frame with its name, node ID and size. Then map each to a template T01–T15 using `docs/blueprint/02-figma-ui-ux-spec.md` §7 and write the rows into `docs/design/figma-handoff/screen-inventory.md`."
- "Read the variables in file `<link>` and fill in `docs/design/figma-handoff/design-tokens.md`, keeping the code token names already listed."
- "Compare frame `<link>` with the T04 specification in `docs/blueprint/02-figma-ui-ux-spec.md` §7 and list missing states, fields or role differences. Do not change anything in Figma."
- "List the components used in frame `<link>` and add any missing ones to `docs/design/figma-handoff/component-specifications.md`."

Writing new designs into Figma through MCP is possible, but use it **only on the `MVP — Working (Sandra)` page**, review the result yourself, and never point it at existing frames.

## 6. If something blocks you

| Situation | Do this |
|---|---|
| MCP rate limit or outage | Continue in the Figma app manually; export snapshots normally; log it in `handoff-notes.md` (§9.1) |
| A screen's behaviour is unclear | Check spec §7 and blueprint §2; if still unclear, ask Sylvain and mark the screen *Provisional* with a note |
| An existing design conflicts with the blueprint | Log it in `handoff-notes.md`; design to the blueprint's behaviour; the team decides |
| You can't finish a due screen | Tell Sylvain before 15:00 CAT; Obvious takes over from the latest snapshot (§9.2) |

## Done when (per slice)

- [ ] Every screen due for the slice has mobile and desktop frames, with its required states, at least *Provisional*
- [ ] Snapshots exported and committed; `screen-status.md` updated (frame link, node ID, snapshot date, status)
- [ ] New tokens and components recorded in `design-tokens.md` and `component-specifications.md`
- [ ] Discrepancies logged in `handoff-notes.md`
- [ ] PR opened, reviewed by Obvious and Sylvain, then screens set to *Approved*
- [ ] No existing frame modified without team approval; only fictional data shown
