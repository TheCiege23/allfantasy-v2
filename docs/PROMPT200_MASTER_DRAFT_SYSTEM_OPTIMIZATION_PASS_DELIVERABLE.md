# PROMPT 200 — Master Draft System Optimization Pass Deliverable

## Overview

Final optimization pass completed across the AllFantasy draft ecosystem with focus on:

- performance
- reliability
- reduced AI API usage
- sports API asset delivery efficiency
- mobile usability / reconnect stability
- commissioner flow stability
- lower latency and fewer duplicate calculations

Covered systems:

- live drafts
- mock drafts
- auction drafts
- slow drafts
- keeper drafts
- devy drafts
- C2C drafts
- AI helper
- CPU/AI drafter modes
- asset pipeline
- chat sync
- notifications
- post-draft summaries

---

## 1. Bottleneck List

| # | Bottleneck | Location | Impact |
|---|------------|----------|--------|
| B1 | Draft poll loop triggered queue/settings/chat every tick for every open client tab. | `components/app/draft-room/DraftRoomPageClient.tsx` | High request volume and avoidable reconnect churn on long drafts. |
| B2 | Poll loop allowed overlapping in-flight runs (new interval before prior completed). | `components/app/draft-room/DraftRoomPageClient.tsx` | Duplicate backend calls and UI reconnect noise. |
| B3 | Recommendation fetch could re-run for the same pick context. | `components/app/draft-room/DraftRoomPageClient.tsx` | Duplicate deterministic compute calls and avoidable helper latency. |
| B4 | Draft events endpoint ran keeper/slow/auction automation ticks on every request without per-league throttle. | `app/api/leagues/[leagueId]/draft/events/route.ts` | Excessive automation load during heavy polling and multi-tab usage. |
| B5 | Draft pool route duplicated provider fetches for non-NFL and IDP path. | `app/api/leagues/[leagueId]/draft/pool/route.ts` | Unnecessary sports data calls and latency spikes. |
| B6 | Draft pool route had no server-side response cache/dedupe. | `app/api/leagues/[leagueId]/draft/pool/route.ts` | Recomputed identical payloads repeatedly. |
| B7 | AI recap generation repeated identical OpenAI calls for unchanged post-draft content. | `app/api/leagues/[leagueId]/draft/recap/route.ts` | Wasted AI tokens and slower recap refresh. |
| B8 | Queue AI explanation generation repeated identical OpenAI calls for same deterministic reorder outcome. | `app/api/leagues/[leagueId]/draft/queue/ai-reorder/route.ts` | Wasted AI tokens and higher provider load. |

---

## 2. Wasted AI API Call List

| # | Wasted AI pattern | Location | Resolution |
|---|-------------------|----------|------------|
| A1 | Repeated AI recap calls with unchanged deterministic sections. | `draft/recap` | Added deterministic fingerprint cache + in-flight dedupe for AI recap payloads. |
| A2 | Repeated AI queue explanation calls for same deterministic reorder context. | `draft/queue/ai-reorder` | Added short/medium TTL cache keyed by deterministic reorder context hash. |
| A3 | Burst retries after transient AI timeout/errors. | `draft/recap` | Added short fallback cache window to suppress immediate repeated AI retries. |

Notes:

- `draft/recommend` remains deterministic (no LLM usage).
- Core draft mechanics remain deterministic-first.

---

## 3. Deterministic Replacement Opportunities

| # | Existing behavior | Deterministic replacement opportunity | Status |
|---|-------------------|---------------------------------------|--------|
| D1 | AI queue reorder explanation is optional text polish. | Keep deterministic reorder engine output as primary explanation; AI only optional rewrite. | Implemented with cache-backed optional AI layer. |
| D2 | AI post-draft recap rewrite optional. | Always return deterministic recap sections first; AI only overlays text when allowed. | Preserved and optimized with cache/dedupe. |
| D3 | AI ADP retrieval at runtime. | Continue using precomputed snapshots, not live LLM inference. | Already deterministic snapshot-based. |

---

## 4. Sports API Caching Opportunities

| # | Opportunity | Location | Applied |
|---|-------------|----------|---------|
| S1 | Add in-memory server response cache for normalized draft pool payload. | `draft/pool` route | Yes |
| S2 | Dedupe concurrent identical draft-pool requests (single-flight). | `draft/pool` route | Yes |
| S3 | Eliminate duplicate player-pool fetches in non-NFL path (reuse fetched pool rows). | `draft/pool` route | Yes |
| S4 | Eliminate duplicate IDP fetch by deriving IDP rows from already fetched pool rows. | `draft/pool` route | Yes |
| S5 | Keep existing asset resolver + stat snapshot caches as source of truth for headshot/logo/stat fallback behavior. | `lib/draft-sports-models/player-asset-resolver.ts`, `lib/draft-asset-pipeline` | Already in place |

---

## 5. Frontend Rendering Improvements

| # | Improvement | Location | Applied |
|---|-------------|----------|---------|
| F1 | Prevent overlapping poll cycles with in-flight guard. | `DraftRoomPageClient` | Yes |
| F2 | Poll cadence tuning: queue/settings/chat fetched on different cadences instead of every tick. | `DraftRoomPageClient` | Yes |
| F3 | Prioritize queue refresh when current user is on the clock. | `DraftRoomPageClient` | Yes |
| F4 | Keep AI ADP polling skip window to avoid stale duplicate fetches. | `DraftRoomPageClient` | Yes |
| F5 | Deduplicate recommendation requests for identical pick context using a request key ref. | `DraftRoomPageClient` | Yes |

---

## 6. Backend Event/Realtime Improvements

| # | Improvement | Location | Applied |
|---|-------------|----------|---------|
| R1 | Per-league throttled automation tick execution (keeper/slow/auction). | `draft/events` route | Yes |
| R2 | In-flight dedupe for per-league automation tick run. | `draft/events` route | Yes |
| R3 | Bounded global tick-state map with pruning. | `draft/events` route | Yes |
| R4 | Response cache headers for recap and pool endpoints to support private SWR behavior. | `draft/recap`, `draft/pool` routes | Yes |

---

## 7. Recommended Optimization Fixes

### Implemented in this pass

- Add server-side cache + in-flight dedupe to `GET /api/leagues/[leagueId]/draft/pool`.
- Remove duplicate sports-provider fetch paths in draft pool assembly.
- Add recap deterministic cache and AI recap cache keyed by deterministic section fingerprint.
- Add queue AI explanation cache keyed by deterministic reorder context.
- Throttle + dedupe automation ticks in `GET /api/leagues/[leagueId]/draft/events`.
- Harden draft-room polling loop with in-flight lock and staggered fetch cadence.
- Add recommendation request de-duplication for same on-clock context.

### Recommended next

- Optional SSE/WebSocket stream for session/queue/chat to replace short-interval polling.
- Optional combined “draft-state” endpoint for session+queue+settings in one round trip.
- Optional client-side virtualized player list for very large pool payloads.

---

## 8. Full Merged Code for Most Important Optimizations

Merged files:

- `app/api/leagues/[leagueId]/draft/pool/route.ts`
- `app/api/leagues/[leagueId]/draft/recap/route.ts`
- `app/api/leagues/[leagueId]/draft/queue/ai-reorder/route.ts`
- `app/api/leagues/[leagueId]/draft/events/route.ts`
- `components/app/draft-room/DraftRoomPageClient.tsx`

---

## Mandatory QA Verification

- [x] No dead UI in advanced draft click-audit flows.
- [x] No overuse of AI APIs in recap / queue explanation paths (cache + dedupe applied).
- [x] No duplicate provider calls in optimized pool/event paths.
- [x] No unnecessary sports API refetches in optimized pool route.
- [x] No broken player assets (asset pipeline untouched except lower request pressure).
- [x] No broken commissioner flows.

Automated verification:

- `npm run test:e2e -- "e2e/auction-draft-room-click-audit.spec.ts" "e2e/slow-draft-room-click-audit.spec.ts" "e2e/keeper-draft-room-click-audit.spec.ts" "e2e/devy-draft-room-click-audit.spec.ts" "e2e/c2c-draft-room-click-audit.spec.ts" "e2e/draft-import-click-audit.spec.ts" "e2e/cpu-ai-drafter-modes-click-audit.spec.ts" "e2e/draft-asset-pipeline-click-audit.spec.ts" "e2e/draft-notifications-click-audit.spec.ts" "e2e/draft-room-click-audit.spec.ts" "e2e/commissioner-control-panel-click-audit.spec.ts" --project=chromium`
- Result: **19 passed**.
