# Region latency (D-14)

**Recorded by:** Stacey · **Date:** 17 Nov 2026 · **Status:** Partly run (one region measured; location and network confirmed)

## Method used

Per `docs/process/ci-and-environments.md` §5, adapted: the hosted project already exists, so only its region was measured. No throwaway comparison project was created.

- Target: `POST https://hncwpxyuolfxafbemapb.supabase.co/rest/v1/rpc/health` with the publishable key (no data).
- 31 sequential requests from Node 25 `fetch`; the first warms the connection and is discarded; 30 are measured end to end (request sent to body read).
- From: Stacey's machine (Windows 11) in **Gaborone**, on a **mobile-data hotspot (BeMobile)**. Mobile data is a realistic network for applicants; a fixed line may be faster.

## Result

| Region | Project | Time (UTC) | n | p50 | p95 | min | max |
|---|---|---|---|---|---|---|---|
| EU Central (Frankfurt), `aws-0-eu-central-1` | `hncwpxyuolfxafbemapb` | 2026-11-17 10:16 | 30 | 263 ms | 315 ms | 246 ms | 321 ms |
| Mumbai | — | — | — | Not run | Not run | — | — |

## Reading

- The project was created in EU Central before this measurement, so D-14 is in practice settled by that choice. The numbers show it is usable from this network: a workflow round trip of about 0.3 s leaves room inside the proposed D-16 target of ≤ 1 s for a workflow action.
- **Not run:** the Mumbai comparison and a second time of day. The method asks for both before the decision is called measured; record them here if the team wants the comparison, or record D-14 as "EU Central, chosen; latency acceptable" in the decision register.
