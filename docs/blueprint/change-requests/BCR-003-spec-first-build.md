# BCR-003 — Build from the written spec where no design snapshot exists (proposes D-45)

**Status:** Proposed · **Author:** Obvious (Frontend & UI Implementation Lead) · **Date:** 17 Nov 2026
**Affects:** D-37 (screen status and Ready for build), blueprint v0.3 §5 (slice flow), `docs/design/figma-handoff/screen-status.md`
**Approval rule:** as BCR-001. Needs Sandra (design owner) and Sylvain (integration). Stacey for information.
**Schedule impact:** removes the main blocker to the 22 Nov code freeze. No scope change.

## Why

D-37 says a screen is buildable when its design is at least *Provisional*, a snapshot is exported to the repo, and its RPCs are in the approved contract.

On 17 Nov:
- **the backend is done:** Slices 1–6 are merged, the contract is approved (#21) and 460/460 pgTAP tests pass on the hosted project;
- **the frontend foundation is done:** shells, components, the Slice 1 data layer and hooks (#6, #9, #16, #18);
- **no screen snapshot is in the repo** (`docs/design/figma-handoff/snapshots/` holds only its README). Slice 1 designs were due 15 Nov, Slice 2 on 16 Nov, and about 12 of 31 screen rows are *Not started*.

The code freeze is **22 Nov, 18:00**. Waiting for every screen to be drawn, exported and then built leaves no time to build and test them.

## Proposed change (D-45)

1. **A screen may be built from the written spec** (`docs/blueprint/02-figma-ui-ux-spec.md` §4–§7, tokens and components already in code) when its RPCs are in the approved contract, **even without a snapshot**.
2. Such a screen is labelled **"Built from spec — design review pending"** in `screen-status.md`, and the PR says so.
3. **Sandra reviews the built page** on the staging URL instead of drawing it first. Her review can request changes like any other review, and the frontend makes them. Built screens follow the existing tokens and components, so the review is about layout and wording, not a new visual language.
4. **Where Sandra has a Provisional Make frame**, the frontend follows it as far as the spec allows, and she reviews against her own frame.
5. **Sandra's time goes to the screens that most need visual design**:
   - the public home (T01);
   - the applicant case view and timeline (T08);
   - the scorecard (T09);
   - the reports (T13);
   - the demo video frames.
6. **Nothing changes in Figma:** the frontend never edits Sandra's files (D-39). D-37 still applies where a snapshot exists.

## Risks and treatment

| Risk | Treatment |
|---|---|
| Visual drift from the Make direction | Same tokens (D-04) and components as the Make frames; Sandra reviews every built screen |
| Rework after review | Layout and wording only. The data layer, hooks and states don't change |
| Judges see unreviewed screens | Screens Sandra hasn't reviewed by code freeze ship as **Provisional UI**, labelled in `screen-status.md` and in the judge guide; her review continues after judging |

## Order of build (frontend)

Slice 1 first, because its hooks are ready:
1. **T04 proposal form** and **T05 receipt**;
2. **T06 My ideas**;
3. **T01 and T03 challenge brief**.

Then Slices 2–6 in blueprint order.

## Sign-off

| Role | Name | Decision | Date |
|---|---|---|---|
| Frontend & UI Implementation Lead | Obvious | Proposed | 17 Nov 2026 |
| UI/UX & Figma Integration Lead | Sandra | Approved (PR review) | 18 Nov 2026 |
| Integration, Testing & Documentation Lead | Sylvain | | |
