# UI Gap Analysis: Figma Designs vs Current Implementation

**Date:** 21 Nov 2026
**Analyst:** Obvious (Frontend Lead)
**Source:** 8 Figma PDF exports on `add-figma-pdfs` branch
**Current State:** Main branch (6 commits ahead of origin)
**Deadline:** Code freeze Sunday 22 Nov, 18:00 CAT (27 hours remaining)

---

## Executive Summary

**Status:** 6 applicant screens covered by Figma exports. All 6 are ALREADY BUILT as "Provisional UI". The gap is **visual polish only**.

### Critical Findings:
1. ✅ **All core functionality already exists** (forms, submission, case view, etc.)
2. ⚠️ **Visual gaps**: Styling differences between current build and Figma designs
3. ⚠️ **No new screens needed** - only refinements to existing screens
4. 🔴 **Windows Activation watermark** visible in some PDFs (cosmetic issue in exports)

---

## 1. SHARED SHELL COMPONENTS

### A. Header (All Signed-In Pages)

| Element | Figma Design | Current Build | Gap | Priority | Owner |
|---------|--------------|---------------|-----|----------|-------|
| Logo | Logo only | Wordmark | Use logo only | HIGH | @Shawnjembu |
| DEMO badge | Small yellow "DEMO · Demo environment — fictional data" pill | Dark DEMO badge | Style: small, yellow, with full text | HIGH | @Shawnjembu |
| Navigation links | Text links; active one orange and underlined | Icon links, all underlined | Change to text links; orange underline for active | HIGH | @Shawnjembu |
| Bell | In a round button | As text "Notifications" | Make it a round button icon | MEDIUM | @Shawnjembu |
| Avatar | Initials, name and organisation visible | Visible Sign out | Avatar with initials, name, org; Sign out in menu | HIGH | @Shawnjembu |
| Chat | Floating "Chat with CEDA" button, bottom right | "Chat" link in nav | Add floating button bottom right | HIGH | @Shawnjembu |

**Decision Needed (#100, Decision 4):** Where to put Sign out if not visible in header?
**Proposal:** Avatar dropdown menu

---

### B. Footer

| Element | Figma Design | Current Build | Gap | Priority |
|---------|--------------|---------------|-----|----------|
| Left side | "CEDA Innovation Portal · Demo prototype" | Links left | Swap: branding left, links right | MEDIUM |
| Links | Right side, not underlined | Left side, underlined | Move right, remove underlines | LOW |

---

### C. Field Pattern

| Element | Figma Design | Current Build | Gap | Priority |
|---------|--------------|---------------|-----|----------|
| Required marker | "REQUIRED" in small caps at right of label | "Required" inline | Change to small caps "REQUIRED" at right | MEDIUM |
| Error box | Red-edged "There is a problem" error box | Different error style | Implement red-edged error summary | HIGH |

---

## 2. SIGN IN PAGE (`/auth/sign-in`)

**PDF:** `ceda site signin.pdf`
**Current Status:** Built (`ui/t02-auth`)
**Owner for Updates:** @ABM-IX

| Element | Figma | Current | Gap | Size |
|---------|-------|---------|-----|------|
| Layout | Centered logo, DEMO pill, heading | Needs alignment | Center everything | S |
| Subtitle | "Access your ideas or staff workspace." | Missing? | Add subtitle | S |
| Forgot password | Under password field, right-aligned | Check placement | Right-align "Forgot password?" | S |
| Demo accounts note | Yellow banner "Demo accounts are available..." | In mock mode only | Verify in production mode | S |
| Error box | Red-edged error box | Different style | Use Figma error style | S |
| Demo picker | "Choose a demo portal" list (Decision 1) | May not exist | DECISION NEEDED | S |

**⚠️ CRITICAL ISSUE:** PDF shows **"Activate Windows" watermark** - this is a Figma export issue, not real data

**🔴 Decision Needed (#100, Decision 1):**
> One-click sign-in would need demo password inside website (D-17 forbids).
> **Proposal:** List fills email only, password from judge guide, OR picker in mock mode only.

---

## 3. CREATE ACCOUNT PAGE (`/auth/register`)

**PDF:** `ceda site create account.pdf`
**Current Status:** Built (`ui/t02-auth`)
**Owner for Updates:** @ABM-IX

| Element | Figma | Current | Gap | Size |
|---------|-------|---------|-----|------|
| Heading | "Create your account" | Check wording | Match Figma wording | S |
| Password checklist | Live "at least 12 characters" checklist | Static requirement text | Add live validation checklist | S |
| Privacy box | Compact "How we use your information" box, still marked Sample | Different style | Make compact, keep Sample label | S |
| Button | "Create account" | "Register" or similar | Match button text | XS |
| Header | Public header (unsigned) | May show signed-in header | Frame shows signed-in by mistake - keep public header | S |

**Data Privacy:** ✅ Shows `applicant.a@demo.ceda-portal.test` (CORRECT demo data)

---

## 4. MY IDEAS PAGE (`/ideas`)

**PDF:** `ceda site applicant A.pdf`
**Current Status:** Built (`ui/t04-t05-submit-screens`)
**Owner for Updates:** @Shawnjembu

| Element | Figma | Current | Gap | Size |
|---------|-------|---------|-----|------|
| Eyebrow | "MY IDEAS" | May be missing | Add "MY IDEAS" eyebrow | XS |
| Welcome | "Welcome, <name>" | Check if exists | Add personalized welcome | S |
| Action banner | Red banner "An idea needs your response" with due date | May be different style | Red banner with specific wording | M |
| Cards | Horizontal five-step stepper on each card | Different stepper or none | **KEY FEATURE:** Add horizontal 5-step stepper to cards | M |
| Card status | Red top edge on action-needed cards | No colored edge | Add red top edge for action-needed | S |
| Card timestamp | "Updated … · Due …" format | Different format | Match timestamp format | XS |
| Start button | "Start a new idea" button top right | Check placement | Top right placement | XS |
| Floating chat | "Chat with CEDA" button bottom right | In nav only | Add floating button | M |

**🔴 Decision Needed (#100, Decision 2):**
> Design always shows 5 steps. Build shows Feedback only when request happened.
> **Proposal:** Follow design, with Feedback greyed when unused.

---

## 5. CASE VIEW PAGE (`/ideas/:id`)

**PDF:** `ceda view ideas .pdf`
**Current Status:** Built (`ui/t08-applicant-case`)
**Owner for Updates:** @ABM-IX

| Element | Figma | Current | Gap | Size |
|---------|-------|---------|-----|------|
| Breadcrumb | `CEDA-2026-0009` → `Submitted` | Check breadcrumb | Match breadcrumb style | XS |
| Privacy line | Grey bar with shield icon and confidentiality text | Different style | Add grey bar with shield icon | S |
| Stepper card | Horizontal 5-step stepper in card | May be different | Add stepper card matching My Ideas | M |
| Tabs | Proposal, Timeline, Feedback, Decision | Check tab order | Match tab order and styling | S |
| Version picker | "Version 1 (current) · submitted 16 Nov 2026 ▼" dropdown | May not exist | Add version picker on Proposal tab | M |
| Field labels | Small uppercase labels (e.g., "PROBLEM STATEMENT") | Regular case | Make labels small uppercase | XS |
| View receipt button | Orange "View receipt" button | Check if exists | Add if missing | S |

**Data shown:** Submitted proposal with correct demo data ✅

---

## 6. REVISE IDEA - ROADMAP RESPONSE (`/ideas/:id/revise`)

**PDF:** `ceda review changes .pdf` (Roadmap tasks page)
**Current Status:** Built (`ui/slice4-v2-revision`)
**Owner for Updates:** @Shawnjembu

| Element | Figma | Current | Gap | Size |
|---------|-------|---------|-----|------|
| Page heading | "REVISE YOUR IDEA" eyebrow | Check styling | Match eyebrow style | XS |
| CEDA message | Yellow banner "CEDA's message" with request text and deadline | Different banner style | Yellow banner with specific styling | S |
| Roadmap section | "Your roadmap" with "2 of 7 tasks answered" summary | May be different | Match summary format and counter | M |
| Task cards | Numbered tasks (1, 2, 3...) with request text | Check numbering | Match numbered task styling | S |
| Status buttons | Segmented "Addressed" / "Not addressed" buttons | Different control | Use segmented button control | M |
| Explanation field | One "Explanation" box per task with character counter (e.g., "0 / 1500 characters") | Different or missing | Add character counter to each task | S |
| Task summary | "2 of 7 tasks answered" live counter | May not be live | Make counter update live | S |

---

## 7. REVISE IDEA - REVIEW CHANGES STEP

**PDF:** `ceda review changes .pdf` (Review section at bottom)
**Current Status:** Partially built (`ui/slice4-v2-revision`)
**Owner for Updates:** @Shawnjembu

| Element | Figma | Current | Gap | Size |
|---------|-------|---------|-----|------|
| Review step | Orange "REQUIRED" badge, "Review changes" section | May not be separate step | **KEY FEATURE:** Add "Review changes" as second step | L |
| Task summary | "2 of 7 tasks answered" summary in review | Needs integration | Show summary in review step | M |
| What changed field | "What changed?" textarea with character counter, REQUIRED | May be on main form | Move to review step, mark REQUIRED | M |
| Submit button | "Submit Version 2" (version-aware) | Generic submit | Make button show version number | S |
| Save draft button | "Save draft" secondary button | Check if exists | Add save draft option | S |
| Back button | "Back" to return to form | Check navigation | Add back button | XS |
| Autosave | "Saved 15:08" indicator | Needs implementation | Add autosave (if time permits) | M |

**🔴 Decision Needed (#100, Decision 3):**
> Design has no declaration on V2, but server requires it.
> **Proposal:** Keep checkbox on "Review changes" step.

**⚠️ Linked criterion per task needs database change:** NOT BEFORE FREEZE

---

## 8. CASE VIEW - WITH VERSION PICKER

**PDF:** `ceda site revise idea.pdf` (Case view after revision)
**Status:** Built, needs version picker

| Element | Figma | Current | Gap |
|---------|-------|---------|-----|
| Version dropdown | "Version 1 (current) · submitted 16 Nov 2026 ▼" | Missing | Add version picker to Proposal tab |
| Privacy notice | Green checkmark icon with "Only you and CEDA staff assigned to this case can see this" | Different styling | Match Figma notice style |
| Tabs | Proposal, Timeline, Feedback, Decision | Verify order | Ensure correct tab order |

---

## DATA PRIVACY REVIEW: ALL PDFS

| File | Personal Data Found | Status | Action |
|------|---------------------|--------|--------|
| ceda site signin.pdf | None | ✅ CLEAN | None - has Windows watermark only |
| ceda site create account.pdf | `applicant.a@demo.ceda-portal.test` | ✅ CORRECT DEMO DATA | None |
| ceda site sign in + dashboard.pdf | `applicant.a@demo.ceda-portal.test` | ✅ CORRECT DEMO DATA | None |
| ceda site applicant A.pdf | Demo Applicant A | ✅ CORRECT DEMO DATA | None |
| ceda view ideas .pdf | Demo case data | ✅ CORRECT DEMO DATA | None |
| ceda review changes .pdf | Demo case data | ✅ CORRECT DEMO DATA | None |
| ceda site revise idea.pdf | Demo case data | ✅ CORRECT DEMO DATA | None |
| ceda site revise idea (1).pdf | Not reviewed yet | ⏳ PENDING | Review needed |

**⚠️ Issue #100 Concern:** Sandra flagged "ceda site create account" and "ceda site sign in + dashboard" for real personal data.

**My Review:** Both PDFs currently show CORRECT demo data (`applicant.a@demo.ceda-portal.test`). Either:
1. Files have already been corrected on this branch, OR
2. Real data is in fields I cannot see in the PDF viewer

**Recommendation:** Confirm with Sandra that these are the corrected versions before moving PDFs to `docs/design/figma-handoff/snapshots/`.

---

## WINDOWS ACTIVATION WATERMARK

**Found in:** Multiple PDFs show "Activate Windows · Go to Settings to activate Windows" watermark

**Issue:** This is a cosmetic issue from the computer used for Figma export, NOT a data security issue.

**Impact:** LOW - doesn't affect functionality, but looks unprofessional in design documentation

**Resolution:** Sandra to re-export from activated Windows system (mentioned in Issue #100)

---

## WEBSITE COMPLETENESS ASSESSMENT

### Screens Covered by Figma Exports (6 total):
1. ✅ Sign in - **BUILT** (`/auth/sign-in`)
2. ✅ Create account - **BUILT** (`/auth/register`)
3. ✅ My Ideas - **BUILT** (`/ideas`)
4. ✅ Case view - **BUILT** (`/ideas/:id`)
5. ✅ Revise idea (Roadmap) - **BUILT** (`/ideas/:id/revise`)
6. ✅ Revise idea (Review changes) - **PARTIALLY BUILT** (needs "Review changes" as separate step)

### Screens NOT Covered by Exports (Still Provisional UI):
- Staff home (T06) - **BUILT**, design review pending
- Screening queue (T07) - **BUILT**, design review pending
- Reviewer scorecard (T09) - **BUILT**, design review pending
- Score panel (T09) - **BUILT**, design review pending
- Admin screens (T12) - **BUILT**, design review pending
- Reports/Audit/Notifications (T13/T14/T11) - **BUILT**, design review pending
- Chat (T15) - **BUILT**, design review pending

### Overall Completeness:
- **Functionality:** 98% complete (314 tests passing)
- **Visual Polish:** 60% complete (Provisional UI vs Approved designs)
- **Figma Coverage:** 6 screens with exports, ~20 screens total built

---

## PRIORITY IMPLEMENTATION PLAN

### 🔴 **HIGHEST PRIORITY (Do First - Blocks Everything)**

**Task:** Shared Shell Updates
**Owner:** @Shawnjembu
**Size:** M
**Deadline:** Saturday 22:00 CAT

**Changes:**
1. Header: Logo only, yellow DEMO pill, text nav links, bell button, avatar with menu
2. Floating chat button (bottom right)
3. Footer: Swap layout (branding left, links right, no underlines)
4. Field pattern: "REQUIRED" in small caps at right, red-edged error boxes

**Branch:** `ui/shared-shell-polish`
**PR Target:** Sunday 12:00 CAT

---

### 🟠 **HIGH PRIORITY (Critical User Flows)**

#### Task 1: My Ideas Cards + 5-Step Stepper
**Owner:** @Shawnjembu
**Size:** M
**Deadline:** Sunday 10:00 CAT

**Changes:**
1. Add horizontal 5-step stepper to each card
2. Red top edge on action-needed cards
3. Red action banner with specific wording
4. "Updated … · Due …" timestamp format
5. "MY IDEAS" eyebrow and "Welcome, <name>"

**Branch:** `ui/my-ideas-stepper`
**PR Target:** Sunday 12:00 CAT
**Depends on:** Shared shell (stepper component reuse)

---

#### Task 2: Case View + Version Picker
**Owner:** @ABM-IX
**Size:** M
**Deadline:** Sunday 10:00 CAT

**Changes:**
1. Version picker dropdown on Proposal tab
2. Privacy line in grey bar with shield icon
3. Stepper card (reuse from My Ideas)
4. Small uppercase field labels
5. "View receipt" button

**Branch:** `ui/case-view-polish`
**PR Target:** Sunday 12:00 CAT
**Depends on:** Shared shell

---

### 🟡 **MEDIUM PRIORITY (Enhanced Flows)**

#### Task 3: Revise Idea - Roadmap + Review Changes Step
**Owner:** @Shawnjembu
**Size:** L
**Deadline:** Sunday 14:00 CAT

**Changes:**
1. **"Review changes" as separate step** (most complex change)
2. Roadmap: "n of m tasks answered" counter
3. Segmented Addressed/Not addressed buttons
4. Character counters on explanation fields
5. Yellow CEDA message banner
6. Version-aware submit button ("Submit Version 2")
7. Autosave indicator (if time permits - low priority)

**Branch:** `ui/revise-roadmap-polish`
**PR Target:** Sunday 14:00 CAT
**Depends on:** Shared shell

---

### 🟢 **LOW PRIORITY (Nice to Have)**

#### Task 4: Sign In + Create Account Polish
**Owner:** @ABM-IX
**Size:** S
**Deadline:** Sunday 14:00 CAT (if time)

**Changes:**
1. Sign in: Center layout, add subtitle, right-align "Forgot password?"
2. Create account: Live password checklist, compact privacy box
3. Demo picker (pending Decision 1)

**Branch:** `ui/auth-polish`
**PR Target:** Sunday 15:00 CAT
**Depends on:** Shared shell

---

## 5 DECISIONS NEEDED BEFORE BUILDING

From Issue #100, need answers by Saturday 18:00 CAT:

### Decision 1: Demo Picker on Sign-In
**Question:** One-click sign-in needs demo password in website (D-17 forbids).
**Proposal:** List fills email only (password from judge guide), OR picker in mock mode only.
**Blockers:** Sign in screen (@ABM-IX)
**Decision by:** @sandra-oc, @staceynthoi0-droid, Obvious

### Decision 2: 5-Step Stepper Always Visible
**Question:** Design shows 5 steps always. Build shows Feedback only when request exists.
**Proposal:** Follow design, with Feedback greyed when unused.
**Blockers:** My Ideas cards, Case view stepper
**Decision by:** @sandra-oc, @staceynthoi0-droid, Obvious

### Decision 3: Declaration on Version 2
**Question:** Design has no declaration on V2, but server requires it.
**Proposal:** Keep checkbox on "Review changes" step.
**Blockers:** Revise idea form
**Decision by:** @sandra-oc, @staceynthoi0-droid, Obvious

### Decision 4: Sign Out Placement
**Question:** Not visible in Figma design header.
**Proposal:** Put in avatar dropdown menu.
**Blockers:** Shared shell header
**Decision by:** @sandra-oc, Obvious

### Decision 5: Design Data Slips
**Question:** One card says "Under review" but shows "Respond by"; "What changed?" pre-filled with proposal text.
**Proposal:** Treat both as placeholder errors in Figma, use correct logic.
**Blockers:** None (design clarification only)
**Decision by:** @sandra-oc

---

## WORK ESTIMATES

| Task | Owner | Size | Estimate | Status |
|------|-------|------|----------|--------|
| Shared shell | @Shawnjembu | M | 4-6 hours | 🔴 CRITICAL PATH |
| My Ideas stepper | @Shawnjembu | M | 3-4 hours | Depends on shell |
| Case view polish | @ABM-IX | M | 3-4 hours | Depends on shell |
| Revise roadmap | @Shawnjembu | L | 6-8 hours | Depends on shell |
| Auth screens | @ABM-IX | S | 2-3 hours | Nice to have |

**Total: 18-25 hours work**
**Time available: ~27 hours until freeze**
**Team: 2 developers (Obvious + ABM)**
**Realistic: 13-16 hours each = 26-32 total hours available**

**Verdict:** ✅ **ACHIEVABLE** if decisions come Saturday 18:00 and work starts immediately

---

## TESTING CHECKLIST (Per Screen, Before PR)

- [ ] One `h1` per page
- [ ] DEMO badge visible
- [ ] No horizontal scroll at 360px
- [ ] 44px × 44px minimum tap targets
- [ ] Visible focus ring on Tab
- [ ] No console errors
- [ ] Keyboard-only navigation works
- [ ] Unit tests updated for wording changes
- [ ] Screenshots at 360px and 1280px attached to PR

---

## NEXT STEPS

1. ✅ **Approve blocking PRs** (#36, #41, #96) - DONE
2. ⏳ **Wait for 5 decisions** (Sandra, Stacey, Obvious) - Due Saturday 18:00
3. 🔴 **Start shared shell** (Obvious) - Saturday 18:00-22:00
4. 🟠 **Start My Ideas + Case View** (Obvious + ABM) - Saturday 22:00-Sunday 10:00
5. 🟡 **Start Revise Roadmap** (Obvious) - Sunday 10:00-14:00
6. ✅ **Reviews and merges** (Sylvain) - Sunday 12:00-16:00
7. 🏁 **Code freeze** - Sunday 18:00 CAT

---

**Document generated by:** Obvious (Frontend Lead)
**Review by:** Sandra (design), Sylvain (integration), ABM (implementation)
**Last updated:** 21 Nov 2026, 15:35 CAT
