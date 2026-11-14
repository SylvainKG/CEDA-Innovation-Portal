# TASK-01 — Figma connection, inventory and T01–T15 mapping

**Owner:** Sandra (UI/UX & Figma Integration Lead) · **Backup:** Obvious · **Scope check:** Sylvain
**Due:** 15 Nov 2026, 18:00 CAT (blueprint v0.3 §5, Phase 0)
**Blueprint references:** §2 (templates and role map), §5 (checklist), §8.1–8.6 (Figma process), §9 (fallback), D-32 to D-41
**Type:** read-only discovery. **No existing Figma design may be changed** (D-39). No application code.

---

## Why this comes first

Slice 1 needs T01–T05 and the applicant dashboard (T06) *Ready for build* by 15 Nov, and later slices follow daily (§5). Developers can only plan their screens once we know which designs already exist, which are incomplete and which are missing.

## Before you start (about 15 minutes)

1. **Seat check.** In Figma, confirm your seat on the team that owns the CEDA file. The MCP server works best with a **Full or Dev seat**. Figma's published limits (checked 14 Nov 2026, and they may change):
   - **View/Collab seats:** about **20 tool calls per month**, which is not enough for this task.
   - **Full/Dev seats on Professional (and Education) plans:** about **200 calls per day, at most 10 per minute**.

   If you only have a View/Collab seat, ask the team's Figma owner for a Full or Dev seat, or use the manual route (step B2).
2. **File location.** Note whether the CEDA design file is in a **team project** or in **personal drafts**. Do not move it yet; record it (moving it happens after team agreement, D-34).
3. **Access list.** Note who currently has edit and view access.

## Step A — Connect (D-35)

1. Add Figma's **remote MCP server** to your AI coding assistant, using its MCP add command with:
   - URL `https://mcp.figma.com/mcp`
   - HTTP transport
2. Authenticate with **your own** Figma login when prompted.
3. Run the identity check tool (`whoami`) to confirm the connection.
4. Record the result in `screen-inventory.md` → *Connection record*: date, connection mode, seat type, plan, and whether the tools load.

**Never paste tokens, cookies or passwords into any file, chat or commit** (D-40).

## Step B — Inventory (read-only)

**B1. With MCP (preferred).** Budget: **≤ 60 calls today**, to leave headroom for later slices.
1. List the pages of each CEDA design file.
2. For each page, read the **frame structure once** (the metadata/outline tool), not each frame separately.
3. Read the **variables/tokens** once per file.
4. Read **design context or screenshots only for frames you are unsure how to classify**. Export snapshots with Figma's own export instead, which uses no MCP calls.
5. Keep a running count of calls in the *Connection record*.

**B2. Manual fallback** (no seat, rate limit reached, or service down — §9.1): go through the file in the Figma app and fill in the same tables by hand. The deliverable is identical; only the method changes.

## Step C — Catalogue and map

For every existing frame, fill in one row in `screen-inventory.md`:
- **Basics:** file, page, frame name, node ID, link, breakpoint.
- **Mapping:** which **template (T01–T15)** and **variant/role** it corresponds to. Use blueprint §2.1 and `02-figma-ui-ux-spec.md` §7.
- **Completeness:**
  - **Complete:** all elements and states needed for the variant are drawn.
  - **Incomplete:** some states, roles or breakpoints are missing.
  - **Unmapped:** fits no template; record it, do not delete it, and Sylvain checks it against scope.

Also list existing **components** and **tokens** (colour, type, spacing) in the *Design system found* section. If CEDA branding is present, say so: it then replaces the placeholder tokens (D-04, D-32).

## Step D — Gap analysis and backlog

In `screen-status.md` (rows are pre-filled for every template variant):
1. Set **Design status** for mobile (360 px) and desktop (1280 px), using the §8.5 vocabulary:
   - *Not started* (nothing drawn)
   - *Provisional* (exists, not reviewed)
   - *Approved* (only if the team has already approved it)
2. Mark missing **interactions and states**: loading, empty, error, forbidden, offline, unknown outcome.
3. List **missing or incomplete dashboards** explicitly: T06 variants, T07 queues, T13 reports, T14 audit, T15 consultant inbox.
4. Order the design backlog by the **Design-ready by** dates already in the table.
5. Log every **discrepancy** between an existing design and the blueprint's functionality in `handoff-notes.md` (D-33). Do not fix it in Figma yet.

## Step E — Report and review

Post a short summary to the team:
- connection status, and the calls used out of the daily budget;
- the number of frames found, mapped, incomplete and unmapped;
- the top missing screens, in slice order;
- discrepancies that need a team decision;
- whether CEDA branding exists in the file;
- any blocker (seat, access, file location).

Then **the team reviews the inventory and approves the proposed design changes** before any existing Figma frame is edited (D-39).

## Done when

- [ ] Connection result recorded, with no credentials anywhere
- [ ] Every existing frame catalogued with its node ID and link, or listed as unmapped
- [ ] Every T01–T15 variant has a design status for mobile and desktop
- [ ] Missing and incomplete dashboards listed and ordered by slice date
- [ ] Discrepancies logged in `handoff-notes.md`
- [ ] Changes submitted as a pull request on a `docs/figma-inventory` branch, reviewed by Sylvain (scope) and Obvious (buildability)

## If something blocks you

| Blocker | Do this |
|---|---|
| View/Collab seat only | Ask the Figma team owner for a Full/Dev seat; meanwhile use B2 (manual) |
| Rate limit reached | Stop MCP reads and continue manually (B2); note the time |
| File in personal drafts, or access missing | Record it as a blocker; Sylvain arranges team-level access (D-34) |
| You are unavailable | Tell Sylvain; Obvious continues from this brief (§9.2) |
