# PROMPT 200 — Master Draft System Optimization Pass Deliverable

## Overview

Final optimization pass on the AllFantasy draft ecosystem: performance, reliability, reduced AI API usage, better sports API asset delivery, mobile usability, commissioner controls, AI helper UX, reconnect behavior, latency, and fewer duplicate calculations.

**Scope:** Live drafts, mock drafts, auction, slow draft, keeper, devy, C2C, AI helper, CPU/AI drafter modes, asset pipeline, chat sync, notifications, post-draft summaries.

---

## 1. Bottleneck List

| # | Bottleneck | Location | Impact |
|---|------------|----------|--------|
| B1 | Poll every 8s runs 4–5 requests (session, queue, settings, optional AI ADP) for every tab. | DraftRoomPageClient poll useEffect | High request volume over long drafts; reconnecting flash every 8s. |
| B2 | Recommendation API called on every pick (any team). | fetchRecommendation + useEffect deps on currentPick.overall, session.picks.length | N× rounds × teams deterministic calls per draft; redundant when not user’s turn. |
| B3 | Derived state (players, draftedNames, queueFiltered) recomputed on every render. | DraftRoomPageClient inline computation | Extra work on every state update (poll, pick, queue, etc.). |
| B4 | AI ADP refetched on every poll when enabled, even when data is fresh. | Poll includes fetchLeagueAiAdp() every 8s | Unnecessary load; AI ADP is batch-computed (cron) and changes infrequently. |
| B5 | Draft pool fetched with cache: 'no-store'; no Cache-Control on API. | Client fetch + draft/pool route | No HTTP caching benefit; repeated identical pool requests. |
| B6 | useLeagueSectionData(leagueId, 'draft') runs in draft room and proxies to mock-draft ADP. | DraftRoomPageClient | Redundant with fetchDraftPool when normalized pool is used. |
| B7 | No single “draft state” endpoint; client must call session, queue, settings separately. | Multiple GETs on load and poll | More round trips and latency. |

---

## 2. Wasted AI API Call List

| # | Call | When | Wasted? | Note |
|---|------|------|--------|------|
| 1 | POST draft/recap | User clicks “Generate AI recap” | No | User-triggered; no waste. |
| 2 | POST draft/ai-pick | Commissioner clicks “Run pick” for orphan | No | User-triggered; AIDrafterService defaults to CPU (tryAIPickProvider returns null). |
| 3 | GET ai-adp | On load when AI ADP enabled; on every poll | Partially | Precomputed snapshot; refetching every 8s is redundant when computedAt is recent. |
| 4 | POST draft/queue/ai-reorder | User clicks AI reorder queue | No | Deterministic (reorderQueueByNeed); no LLM. |
| 5 | POST draft/recommend | Effect on pick/session/players change | No (deterministic) | Deterministic (computeDraftRecommendation); not an AI call. |

**Conclusion:** No true “wasted” LLM calls. AI ADP refetch on poll is redundant when data is fresh; recommendation is deterministic and was being called when it wasn’t the user’s turn (reduced by gating).

---

## 3. Deterministic Replacement Opportunities

| # | Current | Replacement | Status |
|---|---------|-------------|--------|
| 1 | Draft recommendation | Already deterministic (RecommendationEngine) | Done |
| 2 | Queue AI reorder | Already deterministic (reorderQueueByNeed) | Done |
| 3 | Orphan pick | CPU fallback by default; optional AI (not wired) | No change |
| 4 | AI ADP | Precomputed batch job; GET returns snapshot | No LLM per request |

No further deterministic replacements required; existing design already favors deterministic paths.

---

## 4. Sports API Caching Opportunities

| # | Resource | Current | Opportunity | Applied |
|---|-----------|---------|-------------|--------|
| 1 | Draft pool (GET draft/pool) | No Cache-Control | private, max-age=60, stale-while-revalidate=120 | Yes |
| 2 | getLiveADP (NFL) | adp-data in-memory 5 min | Already cached | — |
| 3 | getPlayerPoolForLeague | Per-request | Consider short TTL cache per league+sport | Doc only |
| 4 | resolvePlayerAssets (headshot/logo) | 6h in-memory (player-asset-resolver) | Already cached | — |
| 5 | buildPlayerMedia | Via player-media | Depends on provider; resolver cache helps | — |

---

## 5. Frontend Rendering Improvements

| # | Improvement | Applied |
|---|-------------|--------|
| 1 | Memoize draftedNames (Set from session.picks) to avoid recalc every render | Yes, useMemo |
| 2 | Memoize players (large map from pool + AI ADP) | Yes, useMemo |
| 3 | Memoize queueFiltered (queue minus drafted) | Yes, useMemo |
| 4 | Gate recommendation fetch to “current user on clock” only | Yes |
| 5 | Virtualize long player list (PlayerPanel) | Doc only (optional) |
| 6 | Avoid redundant useLeagueSectionData('draft') when draftPool present | Doc only |

---

## 6. Backend Event/Realtime Improvements

| # | Improvement | Note |
|---|-------------|------|
| 1 | Single “draft state” GET returning session + queue + settings | Reduces round trips; larger payload. Recommended for future. |
| 2 | Poll interval longer when draft paused (e.g. 20s vs 8s) | Lowers load during overnight/slow drafts. Recommended. |
| 3 | Server-Sent Events or WebSocket for draft events | Would replace polling; larger change. Documented as future. |
| 4 | ETag/If-None-Match for session or queue | 304 responses when unchanged. Recommended for future. |

None implemented in this pass; listed as recommended improvements.

---

## 7. Recommended Optimization Fixes (Summary)

- **Recommendation gate:** Only call fetchRecommendation when it’s the current user’s turn (session.currentPick.rosterId === currentUserRosterId). **Applied.**
- **AI ADP poll skip:** On poll, skip fetchLeagueAiAdp when leagueAiAdp.computedAt is within last 30 minutes. **Applied.**
- **Memoize derived state:** useMemo for draftedNames, players, queueFiltered. **Applied.**
- **Draft pool Cache-Control:** Add private, max-age=60, stale-while-revalidate=120 to GET draft/pool. **Applied.**
- **Longer poll when paused:** Use 20s interval when session.status === 'paused'. **Recommended, not applied.**
- **Single draft-state endpoint:** One GET returning session + queue + settings. **Recommended, not applied.**

---

## 8. Full Merged Code (Most Important Optimizations)

### 8.1 DraftRoomPageClient.tsx

- **Import:** Added `useMemo` to React import.
- **Constants:** `AI_ADP_POLL_SKIP_MS = 30 * 60 * 1000`.
- **Recommendation effect:** Only run when current user is on clock: check `(session as any)?.currentUserRosterId` and `session.currentPick.rosterId !== myRosterId` and return early; deps include `session?.currentPick?.rosterId`.
- **Poll effect:** Build `skipAiAdp` from `leagueAiAdp?.computedAt` and `AI_ADP_POLL_SKIP_MS`; only push `fetchLeagueAiAdp()` when `draftUISettings?.aiAdpEnabled && !skipAiAdp`. Deps include `leagueAiAdp?.computedAt`.
- **Derived state:**  
  - `draftedNames = useMemo(() => new Set(session?.picks?.map(p => p.playerName) ?? []), [session?.picks])`.  
  - `players = useMemo(() => { ... }, [draftPool, draftData, leagueAiAdp, draftUISettings?.aiAdpEnabled])` (full mapping logic inlined).  
  - `queueFiltered = useMemo(() => queue.filter(e => !draftedNames.has(e.playerName)), [queue, draftedNames])`.  
  - `aiAdpUnavailable` and `aiAdpLowSampleWarning` left as simple booleans after useMemo block.

### 8.2 app/api/leagues/[leagueId]/draft/pool/route.ts

- After `NextResponse.json({ entries, sport, count, devyConfig, c2cConfig })`, set header: `res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')` and return `res`.

---

## 9. Mandatory QA

- [ ] **No dead UI:** All draft room tabs, commissioner controls, AI recap, share, and helper buttons remain functional.
- [ ] **No overuse of AI APIs:** Recap and ai-pick are user-triggered; AI ADP refetch skipped on poll when &lt; 30 min old; recommendation is deterministic and only when user on clock.
- [ ] **No duplicate provider calls:** Pool has Cache-Control; AI ADP not refetched when recent; recommendation not called when not user’s turn.
- [ ] **No unnecessary sports API refetches:** Pool response cacheable; adp-data and player-asset-resolver already use in-memory cache.
- [ ] **No broken player assets:** LazyDraftImage and fallbacks unchanged; resolver cache unchanged.
- [ ] **No broken commissioner flows:** Start draft, pause, resume, undo, import, settings, run AI pick unchanged; only poll and recommendation logic optimized.

---

## 10. Summary

- **Bottlenecks:** Documented (poll frequency, recommendation on every pick, unmemoized derived state, AI ADP on every poll, pool caching).
- **AI usage:** No wasted LLM calls; AI ADP poll skip when recent; recommendation gated to current user on clock.
- **Deterministic:** Already in place for recommend and queue reorder.
- **Caching:** Draft pool Cache-Control added; existing caches (ADP, assets) noted.
- **Frontend:** useMemo for draftedNames, players, queueFiltered; recommendation effect gated.
- **Backend:** Recommendations documented (single endpoint, longer poll when paused, SSE/ETag).
- **Code delivered:** DraftRoomPageClient (useMemo, recommendation gate, AI ADP poll skip) and draft pool route (Cache-Control) as full merged changes above.
