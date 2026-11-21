# phase-04: Slice 4: Revise · evidence record

**Backlog:** REV-04, APP-04, NTF-02 · **Blueprint:** §5, exit artifact `phase-04` · **Test plan:** §2 and §3

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
| S4, C-13 | Version 1 scores are kept after version 2 | Passed: `005` (`… V1 scorecard is kept`) | Not run |
| S4 | A clarification reply creates no new version; a clarification has no tasks | Passed: `005` (`D-21: a clarification reply creates no new version`, `D-21: a clarification has no tasks`) | Not run |
| S4 | Version 2 is refused while any task lacks a response | Passed: `005` (`INN-02: every task needs a response`) | Not run |
| S4 | Every task must be verified before the V2 scorecard; "Not verified" needs a note | Passed: `005` (`INN-02: the V2 scorecard needs every task verified first`, `"Not verified" needs a note`) | Not run |
| S4 | An unassigned reviewer can't verify a task | Passed: `005` (`N3: an unassigned reviewer cannot verify`) | Not run |
| S4 | The applicant can't see verifications before a published decision | Passed: `005` (`B6: the applicant cannot see verifications before a published decision`) | Not run |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
