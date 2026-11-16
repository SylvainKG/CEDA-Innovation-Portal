# Claim register

**Owner:** Sylvain · **Status:** Draft · 15 Nov 2026
One row per claim made in the proposal, README, manual, judge guide or demo video. A claim may be made publicly only when *Observed result* is **Passed** with an evidence link. Otherwise, use the status word in the claim's wording ("Simulated", "Deferred", "Not run").

| # | Claim | Proposed check | Observed result | Evidence link | Unresolved gap |
|---|---|---|---|---|---|
| C-01 | An applicant cannot read another applicant's proposal | N1 (pgTAP + Playwright) | Not run | — | — |
| C-02 | Attachment links are private and expire after 60 seconds | N2 | Not run | — | — |
| C-03 | An unassigned reviewer sees nothing of a case | N3 | Not run | — | — |
| C-04 | Applicants never receive an unpublished decision | N4 | Not run | — | — |
| C-05 | An award can only follow a published approval | N5 | Not run | — | — |
| C-06 | Submitted versions and audit entries cannot be changed or deleted, even by an administrator | N6 | Not run | — | — |
| C-07 | Support consultants cannot see proposals or scores | N7 | Not run | — | — |
| C-08 | Administrators cannot grant themselves roles | N8 | Not run | — | — |
| C-09 | Closed challenges refuse submissions and keep the draft | N9 | Not run | — | — |
| C-10 | Reviewers must declare conflicts before seeing a proposal | N10, N11 | Not run | — | — |
| C-11 | Submitting twice never creates two cases | S1 idempotency + concurrency script | Not run | — | — |
| C-12 | Reviewers score independently; peer scores are hidden until they submit | S3 peer isolation | Not run | — | — |
| C-13 | Version 1 scores are kept after a resubmission | S4 | Not run | — | — |
| C-14 | Every workflow action is recorded in the audit trail | SEC-01 pgTAP per RPC + step 17 | Not run | — | — |
| C-15 | The full lifecycle works end to end on the hosted build | Main journey on judging build | Not run | — | — |
| C-16 | Live updates don't leak to other accounts | S3 leak test | Not run | — | — |
| C-17 | No proposal data is sent to external AI services | Code review + network check on T04 (INN-03) | Not run | — | — |
| C-18 | Page loads within the proposed p95 targets | QA-01 timed sample (D-16, Proposed) | Not run | — | Targets not yet agreed |
| C-19 | Works in Chrome, Edge, Firefox and on mobile | QA-01 matrix | Not run | — | — |
| C-20 | Backups can be restored | OPS-01 restore drill | Not run | — | — |
| C-21 | Designed with reference to the Data Protection Act, 2024 (never "compliant", D-18) | Data-handling note reviewed | Not run | — | Wording only; no compliance claim |
| C-22 | Email alerts | NTF-02 outbox check | Not run | — | Shown as **Simulated** if SMTP is not ready |
