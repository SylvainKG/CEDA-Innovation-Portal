# phase-02: Slice 2: Screen and assign · evidence record

**Backlog:** REV-01, IAM-01 · **Blueprint:** §5, exit artifact `phase-02` · **Test plan:** §2 and §3

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
| N3 | Unassigned Reviewer 3 sees no assignment, no case and can't add notes or score | Passed: `003`, `004`, `005` (`N3: Reviewer 3 still sees no assignments and no cases`, `N3: an unassigned reviewer cannot add notes`, `N3: Reviewer 3 cannot score someone else…`) | Not run (Reviewer 3 is not among the journey's accounts) |
| N7 | Support consultant reads zero cases and scorecards and can't act on cases | Passed: `001`–`004` (`N7: support consultant reads zero cases`, `… zero scorecards`, `… cannot record screening`) | Partly: test 3, the consultant gets "You don't have access to this page" on All cases (`/staff/cases`). Direct reads are covered at the database layer |
| N8 | An administrator can't grant a role to themself; the attempt is audited | Passed: `001`, `003` (`N8: an admin cannot grant a role to themself`, `N8: no role was added`, `N8: the refused self-grant is audited`) | Not run as a browser attempt: the screen disables the admin's own row (#79), so the refusal is proven at the database layer |
| Route access | Roles see Forbidden on staff screens they may not use | n/a | Passed: test 3. Applicant A on the screening and decision queues, Reviewer 1 on Users and roles, the consultant on All cases, the screening officer on the decision queue |

Test names are quoted from the files in `supabase/tests/database/`. A test file number (`002`) is the pgTAP file, not a migration.
