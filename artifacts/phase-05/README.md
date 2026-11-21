# phase-05: Slice 5: Decide and award · evidence record

**Backlog:** DEC-01, DEC-02 · **Blueprint:** §5, exit artifact `phase-05` · **Test plan:** §2 and §3

| | |
|---|---|
| Recorded by | Sylvain, 21 Nov 2026 (full browser journey added the same evening) |
| Database layer, CI | `main` at `99a5e06`, [Database run 44891824663](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44891824663), job "pgTAP (Supabase local stack)": `supabase test db` → `Files=13, Tests=502`, `Result: PASS` (21 Nov, 09:56 UTC / 11:56 CAT). Fresh local Supabase stack with migrations and the fictional seed |
| Database layer, hosted | Every suite against the hosted staging project (`hncwpxyuolfxafbemapb`): **493/493**, 21 Nov, 08:38 UTC, run by Stacey and reported on #97. Her run record for it is in #65 (open), so this row quotes #97 until #65 merges. The report reconciliation suite (`013`) was added after that run |
| Browser, real backend | Chromium at 1280 px; the app built in Supabase mode in GitHub Actions against hosted staging; spec `tests/e2e/hosted-journey.spec.ts` (#72, commit `00861d4`). Read-only [run 44886380703](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886380703): `4 passed, 1 skipped` (08:47 UTC). Write [run 44886824024](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886824024): `5 passed` (08:53 UTC), between Stacey's snapshot (08:50:29 UTC) and her verified exact reset (08:54 UTC, #61). Full journey [run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002): `6 passed` (2.0 m, 13:31–13:32 UTC), from `main` (`f035194`), between Stacey's snapshot (13:28:40 UTC) and her verified exact reset (~13:39 UTC; run record §3f, #120) |
| Status words | **Passed** names the layer it passed at. **Not run** means no run record exists. Nothing here is Simulated |


## Results

| Check | What must hold | Database layer (pgTAP) | Browser, real backend |
|---|---|---|---|
| N4, C-04 | The applicant gets no unpublished decision, not even through notifications | Passed: `001`, `006` (`N4: the applicant cannot read an unpublished decision`, `N4: and gets no hint through notifications`) | **Passed** ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), step 12): after Approved was recorded, the applicant still saw no outcome; it appeared only after publishing (steps 13, 15). Notifications not checked in the browser |
| N5, C-05 | No award without an approved, published decision | Passed: `001`, `006` (`N5: no award on a not-approved case`, `N5: no award while the decision is unpublished`, `N5 (data layer): …`) | Allowed path only ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), step 14: award recorded after the published approval). The refusal is **Not run** in the browser |
| N6 (full), C-06 | Audit rows can't be updated, deleted or truncated | Passed: `001` (`N6: audit rows cannot be updated`, `… cannot be deleted`, `… table cannot be truncated`) | n/a (database only) |
| S5, C-15 | **Full main journey (steps 0–17) passes on staging** | n/a | **Passed** ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002)): steps 0–4 (sign-ins, refusals, submit with lost-reply recovery) and steps 5–17 (clarification, screening, assignment, V1 and V2 scoring with 3 verified tasks, decision recorded then published, award, chat both ways, CSV export, audit log by case), through the real screens against hosted staging. Earlier attempt 44898204783 failed at step 16 (chat), fixed in #72. Registration of a new address Not run (no SMTP, C-22). **Deployed site:** read-only part passed against the Amplify staging URL in Supabase mode ([run 44953549649](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44953549649), 4 passed, nothing written); the write steps were run on the CI build only |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
