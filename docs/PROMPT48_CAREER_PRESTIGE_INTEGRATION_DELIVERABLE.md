# Prompt 48 — Career Prestige Integration Layer (Deliverable)

## 1. Integration Architecture

- **Purpose:** Unify GM Economy, Career XP, Reputation, Hall of Fame, Legacy Score, Awards Engine, and Record Books into a single **Career Prestige** layer that powers manager profiles, league prestige, dynasty recognition, historical storytelling, and AI narrative explanations.
- **Components:**
  - **UnifiedCareerQueryService:** Aggregates from all seven systems. `getUnifiedCareerProfile(managerId, { leagueId?, sport? })` returns a single profile with snapshots: GM Economy (franchise value, tier, championships, win%), XP (totalXP, tier, progress), Reputation (per league), Legacy (per league), Hall of Fame count/title, awards won count, records held count, and timeline hints (from awards + records). `getLeaguePrestigeSummary(leagueId, sport?)` returns league-level counts (manager count, GM/XP/Reputation/Legacy coverage, HoF/awards/record counts, top legacy score, top XP). `getCareerLeaderboard({ leagueId?, sport?, limit? })` returns managers ranked by a combined prestige score (franchise value, XP, championships, awards, records).
  - **SportPrestigeResolver:** Re-exports `normalizeSportForPrestige`, `getPrestigeSportLabel`, and adds `resolveSportForCareer(sport)` so the career layer uses one sport normalization (aligned with prestige-governance and sport-scope).
  - **CareerPrestigeOrchestrator:** `runAllForLeague(leagueId, { sport?, seasons? })` runs GM Economy (per roster), XP (per roster), Reputation engine for league, Legacy engine for league, Awards engine for given seasons, Record Book engine for given seasons. `runAllForManager(managerId, { sport? })` runs GM Economy and XP for that manager. Does not run Hall of Fame induction (handled in Hall of Fame tab).
  - **AICareerContextService:** `buildCareerContextForManager(managerId, { leagueId?, sport? })` returns `AICareerContextPayload` (narrativeHint, gmTier, xpTier, reputationTier, legacyScore, hofCount, awardsCount, recordsCount) for AI explain. `buildCareerContextForLeague(leagueId, sport?)` returns league narrative hint and `LeaguePrestigeSummary` for league dashboards.
- **Data flow:** UI and APIs call UnifiedCareerQueryService and AICareerContextService; filters (leagueId, sport) propagate to underlying engines. Orchestrator is optional (run all engines from one action); existing per-system run endpoints remain.

---

## 2. Backend Orchestration Updates

- **CareerPrestigeOrchestrator** implemented in `lib/career-prestige/CareerPrestigeOrchestrator.ts`:
  - `runAllForLeague`: Fetches rosters for league; runs GM Economy and XP for each manager (up to 100); calls `runReputationEngineForLeague`, `runLegacyScoreEngineForLeague`, `runAwardsEngine` per season, `runRecordBookEngine` for seasons + "all". Returns counts (gmProcessed, xpProcessed, reputation processed, legacy processed, awards created, record book entries created/updated).
  - `runAllForManager`: Runs `runGMEconomyForManager` and `runForManager` (XP); returns same shape with managerId.
- **UnifiedCareerQueryService** uses existing query services; no changes to GM Economy, XP, Reputation, Legacy, Hall of Fame, Awards, or Record Books engines themselves. List/get signatures preserved; only new aggregator and leaderboard logic added.

---

## 3. UI Integration Points

- **Career tab (league context):** New “Career Prestige” block at the top of the Career tab when viewing a league:
  - **League prestige card:** Shows manager count and coverage (GM, XP, Reputation, Legacy, HoF, Awards, Records) from `getLeaguePrestigeSummary`. Data from `useLeaguePrestige(leagueId)`.
  - **Your prestige card:** When session has managerId, shows unified profile: GM tier badge, XP tier badge, Reputation tier, Legacy score, HoF count, Awards/Records counts; timeline hints (first 3); “Explain my career” button → POST `/api/career-prestige/explain` with managerId + leagueId → narrative shown inline. Data from `useCareerPrestigeProfile(managerId, leagueId)`.
  - **Prestige leaderboard:** Top 10 by combined prestige score (franchise value, XP, champs, awards, records). Data from `useCareerLeaderboard(leagueId)`.
  - **Actions:** “Refresh” (refetches profile, league summary, leaderboard); “Run all engines” (POST `/api/career-prestige/run` with leagueId, then refreshes all career data).
- **APIs:** GET `/api/career-prestige/profile?managerId=&leagueId=&sport=`, GET `/api/career-prestige/leaderboard?leagueId=&sport=&limit=`, GET `/api/career-prestige/league?leagueId=&sport=`, POST `/api/career-prestige/explain` (body managerId or leagueId, sport?), POST `/api/career-prestige/run` (body leagueId or managerId, sport?, seasons?).
- **Hooks:** `useCareerPrestigeProfile(managerId, leagueId)`, `useLeaguePrestige(leagueId)`, `useCareerLeaderboard(leagueId)` in `hooks/useCareerPrestige.ts`.

---

## 4. AI Integration

- **AICareerContextService** builds a single narrative hint string from all systems: GM Economy (tier, value, championships, win%), XP (total, tier, progress), Reputation (tier, score), Legacy (overall, championship score), HoF count, awards count, records count, and timeline hints. This is returned as `narrativeHint` in the explain API response and used for “Explain my career” and league explain.
- **Explain API:** POST `/api/career-prestige/explain` with `managerId` returns `buildCareerContextForManager` result (narrative + context); with `leagueId` only returns `buildCareerContextForLeague` (narrative + summary). AI explanation panels in the Career tab display this narrative; no separate LLM call in this layer (narrative is server-built from combined data).

---

## 5. UI Audit Findings

| Location | Element | Handler | State / API | Status |
|----------|--------|---------|-------------|--------|
| **Career tab** | Career Prestige block | — | useCareerPrestigeProfile, useLeaguePrestige, useCareerLeaderboard | OK |
| **Career tab** | Refresh (prestige) | onClick refreshCareerProfile + refreshLeaguePrestige + refreshCareerLeaderboard | GET profile, league, leaderboard | OK |
| **Career tab** | Run all engines | runPrestigeEngines() | POST career-prestige/run (leagueId), then refresh all | OK |
| **Career tab** | League prestige card | — | useLeaguePrestige(leagueId) | OK |
| **Career tab** | Your prestige card | — | useCareerPrestigeProfile(managerId, leagueId) | OK |
| **Career tab** | Explain my career | explainCareer() | POST career-prestige/explain (managerId, leagueId); setCareerExplainNarrative | OK |
| **Career tab** | Prestige leaderboard | — | useCareerLeaderboard(leagueId) | OK |
| **GET /career-prestige/profile** | Unified profile | useCareerPrestigeProfile | managerId, leagueId?, sport? | OK |
| **GET /career-prestige/league** | League summary | useLeaguePrestige | leagueId, sport? | OK |
| **GET /career-prestige/leaderboard** | Leaderboard | useCareerLeaderboard | leagueId?, limit? | OK |
| **POST /career-prestige/explain** | AI narrative | explainCareer() | managerId or leagueId; returns narrative | OK |
| **POST /career-prestige/run** | Run all | runPrestigeEngines() | leagueId or managerId; auth required | OK |

Filters: leagueId propagates from league page to Career tab; profile and leaderboard use it. Sport can be added to API params and hooks if needed. All click paths function end-to-end.

---

## 6. QA Findings

- **Cross-system integration:** Unified profile and league summary aggregate from GM Economy, XP, Reputation, Legacy, Hall of Fame, Awards, Record Books; data appears in one card and leaderboard.
- **Filters:** leagueId is passed to profile (for reputation/legacy/awards/records in that league), league summary, and leaderboard; refresh updates all.
- **Profile consistency:** Same managerId + leagueId always returns same unified shape; underlying systems unchanged.
- **AI explanations:** Explain uses combined data (narrativeHint from AICareerContextService); “Explain my career” shows it in the Career tab.
- **Click paths:** Refresh, Run all engines, Explain my career are wired; no dead buttons.

---

## 7. Issues Fixed

- **Orchestrator:** Corrected `runReputationForLeague` → `runReputationEngineForLeague`; `runRecordBookEngine` returns a single result object, not array; record book result uses `entriesCreated`/`entriesUpdated`.
- **UnifiedCareerQueryService:** League prestige summary uses a single rosters fetch then managerIds for GM/XP coverage counts; top legacy and top XP queried for league’s managers.
- **Career tab:** Uses `leagueId` (no longer `_leagueId`) so prestige section receives league context; added Career Prestige block with league summary, your prestige card, timeline, explain button, and prestige leaderboard.

---

## 8. Final QA Checklist

- [ ] Open league → Career tab; confirm “Career Prestige” block with League prestige, Your prestige (if logged in), Prestige leaderboard (if data exists).
- [ ] Click “Refresh”; confirm profile, league summary, and leaderboard refetch.
- [ ] Click “Run all engines” (with leagueId); confirm loading then data updates across GM, XP, and other sections.
- [ ] Click “Explain my career”; confirm narrative appears and references GM, XP, Reputation, Legacy, HoF, Awards, Records.
- [ ] Verify filters: league context (leagueId) is used for profile reputation/legacy/awards/records and for leaderboard.
- [ ] POST /career-prestige/run without auth returns 401.
- [ ] GET /career-prestige/profile?managerId= returns unified profile; with leagueId= includes league-scoped reputation/legacy/awards/records.

---

## 9. Explanation of the Career Prestige Layer

The **Career Prestige** layer is a single integration that ties together seven systems: **GM Economy** (franchise value, prestige score, tiers), **Career XP** (XP and tiers), **Reputation** (trust scores per league), **Hall of Fame** (inductions and moments), **Legacy Score** (long-term greatness per league), **Awards Engine** (season awards), and **Record Books** (historical records). It does not replace those systems; it aggregates their data so that:

1. **Manager profiles** — One API call returns a unified profile: GM tier and value, XP tier and progress, reputation and legacy for a given league, HoF count, how many awards and records the manager holds, and a short timeline (e.g. “2023 GM of the Year”, “2022 Highest Score”).

2. **League prestige** — One call returns how many managers are in the league and how many have GM, XP, Reputation, and Legacy data, plus HoF, Awards, and Record Book counts and top legacy/XP.

3. **Manager leaderboards** — A combined “prestige” score (from value, XP, championships, awards, records) ranks managers for a unified leaderboard.

4. **Orchestration** — “Run all engines” for a league runs GM Economy, XP, Reputation, Legacy, Awards, and Record Books for that league (and optionally seasons) so data stays current.

5. **AI narrative** — The explain API builds one narrative hint from all systems (tiers, scores, counts, timeline). The Career tab’s “Explain my career” button shows this so AI-style explanations use combined career data.

All of this is exposed in the **Career tab** via the “Career Prestige” block: league summary, your prestige cards and timeline, explain button, and prestige leaderboard, with filters (leagueId) propagating correctly and all click paths working end-to-end.
