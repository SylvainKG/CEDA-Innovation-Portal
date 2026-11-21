# phase-01: Slice 1: Submit · evidence record

**Backlog:** IAM-02/03, ADM-01, APP-01/02/03, SEC-01 · **Blueprint:** §5, exit artifact `phase-01` · **Test plan:** §2 and §3

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
| N1 | Applicant B can't read, edit or submit Applicant A's idea | Passed: `002` (`N1: Applicant B cannot read A`, `… reads no drafts`, `… cannot edit A`, `… cannot submit A`) | Passed: test 4, "N-a". As Applicant B, A's idea and its receipt show "We can't find this page", with nothing of the idea |
| N2 | Applicant B can't upload into or get a download link for A's files; links expire after 60 s | Passed: `002` (`N2: … cannot upload into A`, `N2: … cannot get a download link for A`) | Not run (the 60-second expiry in a browser was not scripted) |
| N6 (V1) | A submitted version can't be updated or deleted | Passed: `001` (`N6: a submitted version cannot be updated, even by the table owner`, `N6: versions cannot be deleted`) | n/a (database only) |
| N9 | Submitting to a closed challenge is refused and the draft is kept | Passed: `002` (`N9: no new draft on a closed challenge`, `N9: submitting to a closed challenge is refused`) | Not run |
| S1, C-11 | Submitting twice never creates two cases | Passed: `002` (`retry with the same key returns the same reference`); concurrency script on the Supabase stack, same run: `same request key, two connections at once … 1 version, 1 submitted case` and `different request keys … PT409 INVALID_STATE … 1 submitted case`, `RESULT PASSED` | Passed: test 5 (write run). The submit reply was cut after the server handled it; **Check status** found the receipt and exactly one card carries the reference. Stacey confirmed on the server before her reset: exactly one case `CEDA-2026-0009`, one version (#61) |
| S1 | Lost reply on submit shows "Not confirmed yet" and the status check finds the reference | n/a | Passed: test 5, as above |
| Sign-in | Each demo account signs in to its own home; a wrong password is refused without saying which part | n/a (Supabase Auth) | Passed: tests 1 and 2 (7 accounts: applicant A and B, screening, reviewer 1, adjudicator, admin, consultant) |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
