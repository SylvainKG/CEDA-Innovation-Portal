# phase-02: Slice 2: Screen and assign · evidence record

**Backlog:** REV-01, IAM-01 · **Blueprint:** §5, exit artifact `phase-02` · **Test plan:** §2 and §3

| | |
|---|---|
| Recorded by | Sylvain, 21 Nov 2026; evidence audited against the latest runs on 22 Nov (Sylvain, for ABM) |
| Database layer, CI | `main` at `0973233`, [Database run 44991618847](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44991618847) (attempt 2; attempt 1 hit a container-registry download limit while generating types, after the tests), job "pgTAP (Supabase local stack)": `supabase test db` → `Files=13, Tests=507`, `Result: PASS` (22 Nov, 06:52 UTC / 08:52 CAT). Fresh local Supabase stack with migrations and the fictional seed. Earlier: `99a5e06`, run 44891824663, 502 tests (21 Nov) |
| Database layer, hosted | Every suite against the hosted staging project (`hncwpxyuolfxafbemapb`), from `main` (`694dc65`), hosted at migration 015 and level with `main`: **`TOTAL 507 assertions, 0 failed`**, 21 Nov, 10:29:40 UTC, run by Stacey (run record `artifacts/phase-00/hosted-supabase.md` §2, #65). No migration has changed since, so this still matches `main` |
| Browser, real backend | Chromium at 1280 px, spec `tests/e2e/hosted-journey.spec.ts`. The app is built in Supabase mode in GitHub Actions unless a site is named. Staging write runs sit between Stacey's snapshot and her verified exact reset (#61; run record §3e, §3f): - [run 44886380703](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886380703) (read-only, 4 passed) and [run 44886824024](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886824024) (tests 1–5, 5 passed), `00861d4`, staging, 21 Nov 08:45–08:53 UTC; - [run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002): **6 passed, the full journey (steps 0–17)**, `main` `f035194`, staging, 21 Nov 13:29 UTC; - [run 44953549649](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44953549649): read-only, 4 passed, **against the deployed Amplify site** in Supabase mode, `main` `3bcb402`, 21 Nov 21:49 UTC; - [run 44992947269](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44992947269): 6 passed on a **throwaway Supabase stack** (no staging data), `main` `cbb1df3`, 22 Nov 06:15 UTC; - N9: [run 44994702069](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44994702069) (attempt 2): 7 passed on a throwaway stack, branch `test/n9-closed-challenge` `2ab98e8`, 22 Nov 06:43 UTC. **The staging run of N9 is pending** (Stacey's snapshot, #61) |
| Status words | **Passed** names the layer it passed at. **Not run** means no run record exists. Nothing here is Simulated |


## Results

| Check | What must hold | Database layer (pgTAP) | Browser, real backend |
|---|---|---|---|
| N3 | Unassigned Reviewer 3 sees no assignment, no case and can't add notes or score | Passed: `003`, `004`, `005` (`N3: Reviewer 3 still sees no assignments and no cases`, `N3: an unassigned reviewer cannot add notes`, `N3: Reviewer 3 cannot score someone else…`) | **Passed** ([run 44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), staging, step 6): after Reviewers 1 and 2 were assigned, Reviewer 3's **My reviews** doesn't list the case, and opening its score page shows Not found/Forbidden with nothing of the case. Adding notes is proven at the database layer only |
| N7 | Support consultant reads zero cases and scorecards and can't act on cases | Passed: `001`–`004` (`N7: support consultant reads zero cases`, `… zero scorecards`, `… cannot record screening`) | Partly: test 3, the consultant gets "You don't have access to this page" on All cases (`/staff/cases`). Direct reads are covered at the database layer |
| N8 | An administrator can't grant a role to themself; the attempt is audited | Passed: `001`, `003` (`N8: an admin cannot grant a role to themself`, `N8: no role was added`, `N8: the refused self-grant is audited`) | Not run as a browser attempt: the screen disables the admin's own row (#79), so the refusal is proven at the database layer |
| Route access | Roles see Forbidden on staff screens they may not use | n/a | Passed: test 3. Applicant A on the screening and decision queues, Reviewer 1 on Users and roles, the consultant on All cases, the screening officer on the decision queue |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
