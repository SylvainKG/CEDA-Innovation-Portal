# phase-05: Slice 5: Decide and award · evidence record

**Backlog:** DEC-01, DEC-02 · **Blueprint:** §5, exit artifact `phase-05` · **Test plan:** §2 and §3

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
| N4, C-04 | The applicant gets no unpublished decision, not even through notifications | Passed: `001`, `006` (`N4: the applicant cannot read an unpublished decision`, `N4: and gets no hint through notifications`) | Not run |
| N5, C-05 | No award without an approved, published decision | Passed: `001`, `006` (`N5: no award on a not-approved case`, `N5: no award while the decision is unpublished`, `N5 (data layer): …`) | Not run |
| N6 (full), C-06 | Audit rows can't be updated, deleted or truncated | Passed: `001` (`N6: audit rows cannot be updated`, `… cannot be deleted`, `… table cannot be truncated`) | n/a (database only) |
| S5, C-15 | **Full main journey (steps 0–17) passes on staging** | n/a | Partly: steps 0–4 (submit, receipt, lost-reply recovery) passed in the browser (phase-01). Steps 5–17 (screening to award, chat, oversight) were run through the hosted API (#61), not in the browser: **Not run** in the browser |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
