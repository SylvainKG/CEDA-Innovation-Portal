# BCR-002 — Blueprint v0.4: reconcile with the product backlog

**Status:** Proposed · **Author:** Sylvain (Integration, Testing & Documentation Lead) · **Date:** 16 Nov 2026
**Source:** [`docs/requirements/Portal_Backlog.md`](../../requirements/Portal_Backlog.md) (10 Nov 2026 baseline, added in PR #8)
**Affects:** `docs/blueprint/01-mvp-blueprint.md` v0.3 (§1.2, §1.3, §5 Phase 7, §6, §10)
**Approval rule:** as BCR-001. Applied together with BCR-001 in the v0.4 pull request.
**Schedule impact:** none to the build slices (D-27). Items 1–4 add packaging and judging-period tasks to **Phase 7 and a new Phase E**, mostly for Sylvain.

The blueprint was written from the backlog but before the backlog was in the repository. Comparing the two found these gaps. Each one names the backlog ID and acceptance check it comes from.

## Gaps and proposed changes

| # | Backlog says | Blueprint v0.3 | Proposed change | Owner |
|---|---|---|---|---|
| 1 | **DOC-01:** "A research log is kept from 13 November as evidence" | Not mentioned | Add to §10 and Phase 7. Log started at `docs/submission/research-log.md` (16 Nov) and backfilled from dated repository history | Sylvain |
| 2 | **REL-01:** installation files "a container build or install script as the default"; source "lists third party licences"; live URL loads on a separate device | Phase 7 lists the source package and licence list only | Add to Phase 7: an install script (default) or container build, tested from a clean machine; a licence list generated from the lockfile; the separate-device check | Sylvain (Obvious contributes) |
| 3 | **SUB-01:** bundle folder named after the team; check every item against the brief; personal documents (ID copies, certificates, CVs) kept out of the source; upload on Skillsranker by 12:00 CAT, fallback `hackathon@bih.co.bw`; keep the submission confirmation before 17:00 | Phase 7 says "upload by 12:00" only | Add a submission checklist to Phase 7 and `docs/submission/` | Sylvain (team lead submits) |
| 4 | **Phase E: OPS-03, DEF-01, PRE-01.** Hosted URL and judge accounts stay available **until results on 3 Dec**; monitoring alerts reach a named person; no deploys after the deadline unless organisers approve, and any approved change is logged. A named contact replies the same working day, 08:00–17:00 weekdays. Top-5 presentation on 3 Dec | No Phase E. **D-15 says "demo data is wiped after judging"**, which could be read as before 3 Dec | Add Phase E (24 Nov – 3 Dec) to §5. Amend D-15: wipe demo data **after results on 3 Dec**. Keep Supabase Pro and Amplify running until then (cost note for OPS-01). Name the DEF-01 contact | Sylvain (OPS-03), team lead (DEF-01), demo lead (PRE-01) |
| 5 | **Rubric: "Innovation and creativity", 10 points**, mapped to INN-01 in the backlog | INN-02 is the primary differentiator (D-24); INN-01 is P2 and second-last in the cut order | No scope change. The proposal (DOC-01) and demo (DEM-01) present INN-02 (Feedback Roadmap) with INN-01 (version compare) as one innovation story worth the 10 points. Map both IDs to the criterion in the traceability matrix | Sylvain (proposal) |
| 6 | **ADM-02:** an admin can "edit or remove content, **uploaded files** and unused drafts" | "Delete is only for unused drafts" | Clarify: admins can remove **admin-uploaded files** (templates, guidance) from a challenge; files attached to submitted cases are never removed (they stay with the version) | Stacey |
| 7 | **Briefing, 13 Nov:** confirm judging access, install package format, upload size, video length, brand direction, personal documents, and **restrictions on hosting, open-source libraries or external tools** | No record of the answers | Record the briefing answers in §6. The hosting answer confirms AWS Amplify is allowed (D-44) | Sylvain |
| 8 | Backlog path `docs/requirements/Portal_Backlog.md` | Header cites `requirements/Portal_Backlog.md` | Correct the path in the blueprint header | Sylvain |

## Observations (no change proposed)

- **Where the points are.** 37.5 of the 100 rubric points sit in cross-cutting quality: navigation, aesthetics, ease of use (UX-01, QA-01: 15), role-based access, security and audit (IAM-01, SEC-01/02/03, APP-02: 15), response time and compatibility (QA-01: 7.5). These are earned in every slice, not in one task, so the Phase 7 hardening time (21–23 Nov) must not be squeezed.
- **"CEDA layout, colours and fonts" (2 points).** D-04 is confirmed (project owner, 16 Nov): Sandra's Make palette and type are the brand. The Make file already uses the CEDA logo and orange.
- **Already consistent:**
  - deadlines (aim 12:00, hard 17:00 CAT);
  - the five public stages; two reviewers; award after approval;
  - chat hours 09:00–16:00 Gaborone; email validation (phone is "or");
  - SEC-02's HTTPS-only (Amplify plus the HSTS header), rate-limited sign-in and recorded dependency scan;
  - FND-01's "repository created on or after 13 November": created 14 Nov 2026.

## Sign-off

| Member | Items 1–8 | Date |
|---|---|---|
| Sandra | Agree all items 1–8 | 21 Nov 2026 |
| Obvious | Agree all items 1–8 | 21 Nov 2026 |
| Stacey | Agree all items 1–8 | 21 Nov 2026 |
| Sylvain | Agree all items 1–8 | 21 Nov 2026 |
