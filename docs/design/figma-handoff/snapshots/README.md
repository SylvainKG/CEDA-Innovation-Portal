# Snapshots

Approved and provisional screen exports. They are the visual reference developers build from when Figma is unavailable (blueprint §8.6, §9).

- **Name:** `<template>-<screen>__<variant-or-role>__<mobile|desktop>__<YYYY-MM-DD>.png`. Example: `T04-proposal-form__applicant-review__mobile__2026-11-15.png`.
- **Format:** PNG or WebP, exported from Figma at 1x (2x only if text is unreadable), **≤ 300 KB each**. The folder total is **≤ 25 MB** (proposed).
- **Content:** fictional data only. No real names, emails or proposals; no credentials or personal account details visible.
- **Versions:**
  - Keep older snapshots until the screen is *Verified*.
  - `screen-status.md` records which snapshot is current.
- **Not here:** `.fig` files, large exports, video.

## Snapshot log

| Date | File | Screen | Source | Notes |
|---|---|---|---|---|
| 21 Nov 2026 | `T02-sign-in__default__desktop__2026-11-21.png` | Sign in | Figma export "ceda site signin" | Windows activation watermark at the bottom right is from the screen capture, not the design |
| 21 Nov 2026 | `T02-sign-in__error-and-demo-picker__desktop__2026-11-21.png` | Sign in: wrong password, demo picker | "ceda site sign in + dashboard" | **Redacted:** a real-looking email in the email field replaced with `applicant.a@demo.ceda-portal.test` |
| 21 Nov 2026 | `T02-register__error__desktop__2026-11-21.png` | Create account: missing name | "ceda site create account" | **Redacted:** a real-looking name and email replaced with Demo Applicant A's. The frame shows the signed-in header by mistake (`handoff-notes.md`) |
| 21 Nov 2026 | `T06-my-ideas__applicant__desktop__2026-11-21.png` | My ideas | "ceda site applicant A" | |
| 21 Nov 2026 | `T08-applicant-case__proposal-tab__desktop__2026-11-21.png` | Applicant case view, Proposal tab | "ceda view ideas" ("ceda site revise idea" is the same screen and was left out) | |
| 21 Nov 2026 | `T04-revise-v2__roadmap-and-form__desktop__2026-11-21.png` | Revise idea, step 1 | "ceda site revise idea (1)" | Watermark as above |
| 21 Nov 2026 | `T04-revise-v2__review-changes__desktop__2026-11-21.png` | Revise idea, step 2 | "ceda review changes" | |

All seven were rendered from the PDFs at 100 dpi, cropped to the page content and saved as 128-colour PNGs (19–49 KB each). Added by Sylvain on Sandra's behalf (assisted); Sandra re-exports the two redacted frames from Figma with demo data when back.
