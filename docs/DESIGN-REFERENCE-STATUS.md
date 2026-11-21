# Design Reference Status Report

**Date:** 21 Nov 2026
**For:** Obvious (Frontend Lead)

---

## Summary

**Design Source:** Figma Make prototype (coded React + Tailwind, NOT a canvas file)
**URL:** https://www.figma.com/make/zrioM3hOSeeP6xpFstPgen/CEDA-Innovation-Management-Portal
**Owner:** Sandra (personal Starter plan)

**Key Finding:** No traditional Figma PDFs exist because the design is in Figma Make (code, not canvas). The "frames" are React components in `src/App.tsx` of the Make file.

---

## What We Have as Design Reference

### 1. **Figma Make Source Code**
- Location: Figma Make file (web-based)
- Format: React components + Tailwind CSS
- Access: Limited by Sandra's Starter plan (~20 MCP calls/month)
- Status: MCP budget exhausted on 16 Nov during TASK-01

### 2. **Design Documentation** (Complete)
Located in `docs/design/figma-handoff/`:

✅ **screen-inventory.md** - Maps Make components to T01-T15 templates
✅ **screen-status.md** - Implementation status per screen
✅ **design-tokens.md** - Full design system (colors, typography, spacing)
✅ **component-specifications.md** - Component library specs
✅ **handoff-notes.md** - Discrepancies between Make and blueprint
✅ **navigation-map.md** - Site structure
✅ **TASK-01-figma-inventory.md** - Sandra's inventory task
✅ **TASK-02-design-screens.md** - Sandra's design task plan

### 3. **Snapshots** (Expected but Not Created Yet)
Location: `docs/design/figma-handoff/snapshots/`
Status: Directory exists with README, but **no snapshots exported yet**
Reason: MCP canvas tools don't support Make files; manual export needed

### 4. **Blueprint Spec** (Authoritative)
Location: `docs/blueprint/02-figma-ui-ux-spec.md`
Status: Complete v0.1
Authority: **Behavior specification** (trumps visual design for functionality)

---

## Design Source Truth Hierarchy (D-32)

Per blueprint decision D-32:

1. **Figma Make file** = Visual design source (colors, layout, components)
2. **Blueprint spec §6-7** = Behavior source (states, permissions, actions, wording)
3. **Placeholder values** = Where Figma defines nothing, use spec §3

**Conflict Resolution:**
- Visuals: Figma wins
- Behavior: Blueprint wins
- Discrepancies: Logged in handoff-notes.md

---

## What You Should Build Against

### Primary References (In Order):

1. **Blueprint spec** (`docs/blueprint/02-figma-ui-ux-spec.md`) - For:
   - Screen behavior and states
   - Component specifications (§5)
   - Design principles (§1)
   - Template descriptions (§7 T01-T15)
   - Accessibility requirements (§9)

2. **Design tokens** (`docs/design/figma-handoff/design-tokens.md`) - For:
   - Colors (approved CEDA brand: orange #F58220, gold #F9C51C)
   - Typography (Inter, with size fixes F1)
   - Spacing, radius, shadows
   - Status colors

3. **Screen inventory** (`docs/design/figma-handoff/screen-inventory.md`) - For:
   - What exists in Make file
   - Completeness assessment per screen
   - Known gaps

4. **Handoff notes** (`docs/design/figma-handoff/handoff-notes.md`) - For:
   - Resolved discrepancies
   - Team decisions
   - What to follow when Make and blueprint differ

### Secondary Reference:

5. **Figma Make file** (via Sandra when needed) - For:
   - Visual layout details
   - Component styling details
   - When screen-inventory doesn't have enough detail

---

## Critical Design Decisions Logged

### Brand (Resolved)
- **Decision:** Make brand colors are APPROVED (Sandra, 16 Nov)
- **Colors:** Orange #F58220, Gold #F9C51C, Inter typeface
- **Contrast Fix F2:** Primary buttons use dark text #1F1F1F (not white)

### Terminology (Resolved)
- **Decision:** Follow blueprint terminology (handoff-notes #7)
- Use: "Idea/case", "Challenge", "Reviewer", "Approved", "Awarded"
- Not: "Application", "Programme", "Evaluator", "Shortlisted", "Selected"

### Stages (Resolved)
- **Decision:** 5 public stages (not 6 from Make)
- Stages: Submission · Review · Feedback · Approval · Award
- Not: Submitted · Eligibility · Evaluation · Shortlisted · Adjudication · Decision

### Type Scale (Must Apply)
- **Fix F1:** Use spec sizes (body 16px, small 14px, not 7-10px from Make)
- **Reason:** Make text is too small (accessibility fail)
- **Status:** Must be applied before shipping

---

## What's Missing (No PDFs/Snapshots)

**Expected but Not Present:**
- ❌ PNG snapshots of approved screens
- ❌ Exported frame images
- ❌ Traditional Figma canvas files
- ❌ Figma component library
- ❌ Figma variables (Make uses CSS custom properties)

**Why Missing:**
- Make files are code, not canvas (no frames to screenshot)
- MCP canvas tools don't work with Make
- Sandra's Starter plan limits MCP access
- Manual export possible but not done yet (TASK-02 pending)

**Impact:** Minimal - Documentation is comprehensive enough to build from

---

## Screens in Make File (from screen-inventory.md)

### Present (Incomplete):
- T01 Public home - `PublicHome`
- T04 Proposal form - `ApplicationForm`, `UploadSection`, `ReviewSummary`
- T05 Receipt - `SuccessState`
- T06 Applicant dashboard - `ApplicantView`
- T06 Staff homes - `EvaluatorView`, `AdjudicatorView`, `AdminView`
- T07 Queues - Shared tables
- T08 Case view - `ApplicationDetail`, `Feedback`
- T09 Scorecard - `EvaluationReview`
- T09 Panel - `Comparison` (conflicts only, needs redesign)
- T11 Notifications - `NotificationPopover`
- T12 Admin - `ProgrammeSetup` pages
- T13 Reports - `Reports`
- T14 Audit - `AuditLog`
- Shells - `AppShell` (partial)

### Missing Entirely from Make:
- T02 Auth screens
- T03 Challenge brief & help pages
- T10 Workflow action dialogs
- T15 Chat widget & consultant inbox
- Complete state kit
- Screening/support/committee role variants

---

## Recommendation for "Do All" Task

Since no traditional design files exist, your approach should be:

### Phase 1: Build from Spec (Current)
✅ Follow blueprint spec §7 for behavior
✅ Follow design-tokens.md for styling
✅ Apply fixes F1-F6 from design-tokens.md
✅ Use "Provisional UI" status per BCR-003

### Phase 2: Sandra Design Review
- Sandra reviews each screen on staging
- Differences logged in handoff-notes.md
- Screens move from Provisional → Approved

### Phase 3: Snapshots (Optional)
- After approval, export snapshots for reference
- Store in `snapshots/` directory
- Use naming convention from README

**Current Status:** You're in Phase 1, and you've already built 90% of everything.

---

## Action Items

For systematic "do all" polish work:

1. ✅ **Use design-tokens.md as visual reference** (colors, fonts, spacing)
2. ✅ **Use blueprint spec §7 for each template** (T01-T15 requirements)
3. ✅ **Apply contrast fixes F2** (dark text on orange buttons)
4. ✅ **Apply type scale F1** (16px body, 14px small)
5. ✅ **Follow handoff-notes decisions** (5 stages, blueprint terminology)
6. ⏳ **Build missing features** per screen-status.md
7. ⏳ **Request Sandra review** when each screen is polished
8. ⏳ **Log any new discrepancies** in handoff-notes.md

---

## Conclusion

**You have everything you need to complete all screens:**
- ✅ Complete blueprint specification
- ✅ Full design system documentation
- ✅ Screen inventory and status
- ✅ Resolved design decisions
- ✅ Component specifications

**You don't need:**
- ❌ Figma PDFs (don't exist)
- ❌ Canvas exports (source is code, not canvas)
- ❌ Direct Figma access (MCP quota exhausted, not needed)

**Your work is spec-driven development with design system compliance.**

---

**Report completed:** 21 Nov 2026
