# Release note: v1.0-judging

**Owner:** Sylvain (release coordinator) · **Status:** Draft, 22 Nov 2026. The tag, commit and included PRs are filled in at the tag, after the 18:00 CAT code freeze (release checklist §2).
**Product:** Peolwane · CEDA Innovation Portal. A demonstration prototype with fictional data, built for CEDA's Innovation Fund.

| | |
|---|---|
| Tag | `v1.0-judging` **[at tag]** |
| Commit | **[at tag]** |
| Date | **[at tag]** (CAT) |
| Release URL | **[confirm at release]** |
| Included PRs | **[at tag]**: every PR merged into `main` up to the tagged commit (`git log --oneline v1.0-judging`) |

## What is in this release

The full applicant and staff lifecycle, with every rule enforced in the database:

**submit → screen → two independent evaluations → revision request with a Feedback Roadmap → version 2 → adjudication → published decision → award**

It also includes:
- live chat with CEDA consultants;
- notifications;
- reports with CSV export;
- the audit log;
- administration of challenges, forms, rubrics, content, users and roles.

The full main journey (steps 0–17) passed through the real screens against the hosted backend on 21 Nov (run 44909107002), and again on a throwaway stack from `main` on 22 Nov (run 44959243058). See the claim register (`docs/testing/claim-register.md`) for every claim and its evidence.

## Demo configuration that must change for real use

- **Demo staff accounts skip two-step sign-in.** The `demo_mfa_exempt` setting is **on**, so judges can sign in to the seeded staff accounts without an authenticator app. Every other staff account still needs two-step sign-in. **Switch it off for any real use** (D-07, BCR-001 Part C; runbook). There is no settings screen for it: only the backend team can change it.
- **Demo data:** every person, organisation, idea and contact is fictional and labelled DEMO or Sample. The demo data is wiped after judging (D-15).
- **Demo passwords** are set from the environment and given to judges separately. They are never in the repository, the bundle or the video (D-17).

## Known limitations

| Item | Status |
|---|---|
| Email alerts | **Simulated:** no SMTP is connected. Alerts are queued and shown in the outbox. A new registration can't verify its email, so judges use the seeded demo accounts (C-22) |
| Peolwane AI (site-help assistant) | **[confirm at release]** whether it is live. It needs Leseding's knowledge base and instructions; in the 22 Nov check it asked for a name. If it isn't confirmed, the two `VITE_LESEDING_*` variables are removed and the assistant isn't shown (BCR-004) |
| Response-time targets | Agreed (D-16) but **not measured** (C-18) |
| Browser and device matrix | **Not run** as a full matrix (C-19); Chromium at 360 and 1280 px is tested |
| Malware scanning of uploads | **Deferred**: the file type is checked from the declared content type |
| Retention and data-subject requests | Proposed in the data-handling note; manual, not automated |
| Region comparison with Mumbai | **Not run**. EU Central, chosen; latency acceptable: p95 315 ms from Gaborone (D-14) |
| Restore into a full Supabase project, and file-storage backup | **Not run** (the database data restore drill passed, C-20) |
| Settings screens for the review quorum and the demo two-step exemption | **Not built**: stored settings changed by the backend team |
| Peolwane AI processor terms | Leseding's location and its retention of transcripts are **not yet confirmed** (data-handling note §5, §7) |

## Release checks

Recorded as they're done, with links (release checklist §1–§6):
- **[at tag]** `main` green on the required checks
- **[at tag]** licence list up to date (`node scripts/third-party-licences.mjs --check`)
- **Done, 22 Nov:** staging write run (N9 and the full journey, [run 44996202242](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44996202242), 7 passed) between Stacey's snapshot (06:56:39 UTC) and her verified exact reset (07:06 UTC; #61)
- **[before freeze]** hosted pgTAP on `main`, all suites (Stacey; run record `artifacts/phase-00/hosted-supabase.md`). No pgTAP runner touches the project after 18:00 CAT (runbook §3 step 9)
- **[at tag]** staging at the demo baseline after Stacey's reset
- **[at release]** E2E against the release URL (smoke and security headers; read-only journey)
- **[at release]** source package: size and SHA-256
