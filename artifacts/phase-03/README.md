# phase-03: Slice 3: Evaluate · evidence record

**Backlog:** REV-02, REV-03, NTF-01 · **Blueprint:** §5, exit artifact `phase-03` · **Test plan:** §2 and §3

| | |
|---|---|
| Recorded by | Sylvain, 21 Nov 2026 |
| Database layer, CI | `main` at `99a5e06`, [Database run 44891824663](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44891824663), job "pgTAP (Supabase local stack)": `supabase test db` → `Files=13, Tests=502`, `Result: PASS` (21 Nov, 09:56 UTC / 11:56 CAT). Fresh local Supabase stack with migrations and the fictional seed |
| Database layer, hosted | Every suite against the hosted staging project (`hncwpxyuolfxafbemapb`): **493/493**, 21 Nov, 08:38 UTC, run by Stacey and reported on #97. Her run record for it is in #65 (open), so this row quotes #97 until #65 merges. The report reconciliation suite (`013`) was added after that run |
| Browser, real backend | Chromium at 1280 px; the app built in Supabase mode in GitHub Actions against hosted staging; spec `tests/e2e/hosted-journey.spec.ts` (#72, commit `00861d4`). Read-only [run 44886380703](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886380703): `4 passed, 1 skipped` (08:47 UTC). Write [run 44886824024](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886824024): `5 passed` (08:53 UTC), between Stacey's snapshot (08:50:29 UTC) and her verified exact reset (08:54 UTC, #61) |
| Status words | **Passed** names the layer it passed at. **Not run** means no run record exists. Nothing here is Simulated |


## Results

| Check | What must hold | Database layer (pgTAP) | Browser, real backend |
|---|---|---|---|
| N10 | An assigned reviewer can't read the case or score before declaring | Passed: `001`, `003`, `004` (`N10: before declaring, the reviewer cannot read the case`, `N10: scoring is refused before the declaration`) | Not run |
| N11 | Declaring a conflict removes the assignment and the case; the admin is told to reassign | Passed: `004` (`N11: declaring a conflict removes the assignment`, `N11: the case leaves the reviewer`, `N11: the admin is told to reassign`, `N11: a conflicted reviewer cannot be reassigned to the case`) | Not run |
| S3, C-12 | Peer scores are hidden until the reviewer submits their own | Passed: `004` (`REV-03: Reviewer 2 cannot see Reviewer 1's scores before submitting`, `after submitting, Reviewer 2 sees both scorecards`) | Not run |
| S3, C-16 | Live updates don't leak to other accounts | Partly: `004` checks that only `notifications` and `case_events` are published for live updates; both tables are protected by RLS. **The two-account leak test was not run** | Not run. The bell polls every 30 s rather than subscribing (#82) |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
