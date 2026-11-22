# phase-04: Slice 4: Revise · evidence record

**Backlog:** REV-04, APP-04, NTF-02 · **Blueprint:** §5, exit artifact `phase-04` · **Test plan:** §2 and §3

| | |
|---|---|
| Recorded by | Sylvain, 21 Nov 2026; evidence audited against the latest runs on 22 Nov (Sylvain, for ABM) |
| Database layer, CI | `main` at `0973233`, [Database run 44991618847](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44991618847) (attempt 2; attempt 1 failed on a container-registry download limit), job "pgTAP (Supabase local stack)": `supabase test db` → `Files=13, Tests=507`, `Result: PASS` (22 Nov, 06:52 UTC / 08:52 CAT). Fresh local Supabase stack with migrations and the fictional seed. Earlier: `99a5e06`, run 44891824663, 502 tests (21 Nov) |
| Database layer, hosted | Every suite against the hosted staging project (`hncwpxyuolfxafbemapb`), from `main` (`694dc65`), hosted at migration 015 and level with `main`: **`TOTAL 507 assertions, 0 failed`**, 21 Nov, 10:29:40 UTC, run by Stacey (run record `artifacts/phase-00/hosted-supabase.md` §2, #65). No migration has changed since, so this still matches `main` |
| Browser, real backend | Chromium at 1280 px, spec `tests/e2e/hosted-journey.spec.ts`. The app is built in Supabase mode in GitHub Actions unless a site is named. Staging write runs sit between Stacey's snapshot and her verified exact reset (#61; run record §3e, §3f):<br>• [run 44886380703](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886380703) (read-only, 4 passed) and [run 44886824024](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886824024) (tests 1–5, 5 passed), `00861d4`, staging, 21 Nov 08:45–08:53 UTC<br>• [run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002): **6 passed, the full journey (steps 0–17)**, `main` `f035194`, staging, 21 Nov 13:29 UTC<br>• [run 44953549649](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44953549649): read-only, 4 passed, **against the deployed Amplify site** in Supabase mode, `main` `3bcb402`, 21 Nov 21:49 UTC<br>• [run 44992947269](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44992947269): 6 passed on a **throwaway Supabase stack** (no staging data), `main` `cbb1df3`, 22 Nov 06:15 UTC<br>• N9: [run 44994702069](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44994702069) (attempt 2): 7 passed on a throwaway stack, branch `test/n9-closed-challenge` `2ab98e8`, 22 Nov 06:43 UTC. **staging:** [run 44996202242](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44996202242), 7 passed, branch `test/n9-closed-challenge` (`a6f1a93`), 22 Nov 07:00 UTC, between Stacey's snapshot (06:56:39 UTC) and her verified exact reset (07:06 UTC, #61) |
| Status words | **Passed** names the layer it passed at. **Not run** means no run record exists. Nothing here is Simulated |


## Results

| Check | What must hold | Database layer (pgTAP) | Browser, real backend |
|---|---|---|---|
| S4, C-13 | Version 1 scores are kept after version 2 | Passed: `005` (`… V1 scorecard is kept`) | Not run |
| S4 | A clarification reply creates no new version; a clarification has no tasks | Passed: `005` (`D-21: a clarification reply creates no new version`, `D-21: a clarification has no tasks`) | Partly ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), staging, step 5): the applicant answered CEDA's question and the case showed "Answered"; that no new version was created is proven at the database layer (and on hosted in #65) |
| S4 | Version 2 is refused while any task lacks a response | Passed: `005` (`INN-02: every task needs a response`) | Allowed path only ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), step 10): with every task answered, version 2 was submitted. The refusal with a task unanswered is **Not run** in the browser (the screen keeps Submit disabled with the reason; unit-tested) |
| S4 | Every task must be verified before the V2 scorecard; "Not verified" needs a note | Passed: `005` (`INN-02: the V2 scorecard needs every task verified first`, `"Not verified" needs a note`) | Allowed path only ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), step 11): both reviewers verified all 3 tasks ("3 of 3 tasks verified") before submitting V2 scorecards. The refusal is **Not run** in the browser |
| S4 | An unassigned reviewer can't verify a task | Passed: `005` (`N3: an unassigned reviewer cannot verify`) | Not run |
| S4 | The applicant can't see verifications before a published decision | Passed: `005` (`B6: the applicant cannot see verifications before a published decision`) | Not run |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
