# QA Findings – Fantasy Core Systems

**Date:** 2025-03-12  
**Scope:** Waiver Wire, Live Draft Room, Mock Draft, AI Draft Assistant, Commissioner Control Center, multi-sport.

---

## 1. Waiver Wire

### Issues found and fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| **Missing Trash2 import** in `WaiverWirePage.tsx` | High | Added `Trash2` to lucide-react import; Cancel button would throw at runtime. |
| **Claims GET owner-only** | High | GET `/api/waiver-wire/leagues/[leagueId]/claims` required `leagueId + userId` (owner). League members with a roster could not load waiver claims. | Allow access if user has a roster in the league (owner OR roster exists). |
| **Settings GET owner-only** | High | Same as above; members could not load waiver settings for the page. | Allow access if user owns league OR has a roster. |
| **Players GET no access check** | Medium | Any authenticated user could call with any leagueId and get available players. | Require league owner or roster membership (403 otherwise). |
| **Rolling waiver order wrong** | High | `orderClaimsForProcessing` used `allRosters` but roster findMany did not select `waiverPriority`. Rolling order fell back to priorityOrder only. | Added `waiverPriority` to roster select in process-engine. |
| **Reverse standings order wrong** | Medium | `currentRank` was never populated (rosters don’t have it). All claims got rank 999. | Fetch LeagueTeam for league, build `rankByPlatformUserId` (externalId → currentRank), use in sort. |
| **FCFS createdAt handling** | Low | `(a as any).createdAt.getTime()` could throw if createdAt was string (e.g. from JSON). | Support both Date and string, fallback to 0. |

### Not changed (by design)

- **Duplicate claim processing:** Process runs in a single pass; each claim is marked processed/failed and rosteredByPlayer is updated in memory, so the same player cannot be awarded twice in one run. No double-processing.
- **League chat/activity after claim:** No league chat or activity feed hook in the waiver engine; left for future integration.

---

## 2. Live Draft Room

### Findings

- **Live draft room** in this codebase is the **Mock Draft Simulator** (simulated full draft) and the **Draft tab** (queue + “Run Draft AI”). There is no separate in-season “live draft room” with real-time picks and timer from a platform (e.g. Sleeper).
- **Commissioner draft controls** (`POST /api/commissioner/leagues/[leagueId]/draft`) are stubbed; they return “acknowledged” and “not yet wired to platform.”
- **Timer, autopick, queue, recent picks** are implemented in `MockDraftSimulatorClient` (live playback, step, best available, queue in legacy UI). No bugs found in timer advance or step logic.
- **Pause/resume** is implemented via `isLivePlaying` and Play/Pause button; **reset** clears draft state.

### No code changes

- No broken imports or obvious race conditions in draft tab or mock client for the existing flows.

---

## 3. Mock Draft & AI Draft Assistant

### Issues found and fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| **AI assistant params when no draft** | Low | When `draftResults.length === 0`, `aiAssistantParams` could still be built and sent to the panel; round/pick could be misleading. | Return `null` when `draftResults.length === 0` so the panel shows “Select a pick or start the draft.” |

### Not changed

- **Setup flow:** MockDraftSetup and MockDraftSimulatorWrapper work; “Go to league selector” skips setup; Start passes config to client.
- **Recap:** MockDraftRecap receives results and config; onBack works.
- **Restart:** Client “Reset” clears state; user can run a new mock from the same page.

---

## 4. Commissioner Control Center

### Findings

- **Commissioner-only access:** Tab is shown only when `GET /api/commissioner/leagues/[leagueId]/check` returns `isCommissioner: true`. All mutation routes use `assertCommissioner`.
- **403 handling:** If a commissioner request returned 403 (e.g. race or session change), the tab showed empty data with no error. | Set error to “Commissioner access denied” when any commissioner fetch returns 403.

### Not changed

- League settings edits (PATCH), draft controls (stub), broadcast (stub), orphan/public-post (operations) are implemented and permission-gated.
- Non-commissioners cannot call commissioner routes; they get 403.

---

## 5. Multi-Sport

### Findings

- **Waiver engine:** Process engine and roster-utils are position-agnostic; no NFL-only logic.
- **Player pool:** `/api/waiver-wire/leagues/[leagueId]/players` uses `league.sport` and `SportsPlayer` with sport filter; works for NFL, NBA, MLB where data exists.
- **Mock draft / ADP:** ADP and mock simulate are NFL-oriented (getLiveADP, NFL positions). NBA/MLB would need sport-specific ADP/player pools; no football-only assumption was fixed in this pass that would break other sports.
- **Commissioner:** No sport-specific logic; settings and operations are sport-agnostic.

### No code changes

- No changes made specifically for NBA/MLB/NHL; existing code does not assume a single sport in waiver processing or commissioner flows.

---

## 6. Summary of fixes (files touched)

| File | Change |
|------|--------|
| `components/waiver-wire/WaiverWirePage.tsx` | [UPDATED] Added Trash2 import. |
| `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts` | [UPDATED] GET: allow access if user owns league OR has roster. |
| `app/api/waiver-wire/leagues/[leagueId]/settings/route.ts` | [UPDATED] GET: allow access if user owns league OR has roster. |
| `app/api/waiver-wire/leagues/[leagueId]/players/route.ts` | [UPDATED] GET: require league owner or roster membership (403 otherwise). |
| `lib/waiver-wire/process-engine.ts` | [UPDATED] Roster select includes waiverPriority; fetch LeagueTeam for reverse_standings; orderClaimsForProcessing takes rankByPlatformUserId; FCFS handles Date/string createdAt. |
| `components/app/tabs/CommissionerTab.tsx` | [UPDATED] Set error when commissioner API returns 403. |
| `components/MockDraftSimulatorClient.tsx` | [UPDATED] aiAssistantParams returns null when draftResults.length === 0. |
