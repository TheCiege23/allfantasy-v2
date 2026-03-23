# Prompt 46 — Awards Engine + Full UI Click Audit (Deliverable)

## 1. Awards Architecture

- **Core stack:** `SeasonPerformanceAnalyzer` (data gathering) → `AwardScoreCalculator` (winner selection) → `AwardsEngine` (season write pipeline) → `AwardQueryService` (read/explain surface).
- **Data model:** `AwardRecord` rows in `award_records` (leagueId, sport, season, awardType, managerId, score, createdAt), indexed for league-season and manager queries.
- **Execution flow:** `runAwardsEngine(leagueId, season)` analyzes manager season performance, calculates award winners, and replaces the season rows in one transaction.
- **Read flow:** `GET /api/leagues/[leagueId]/awards` and `GET /api/leagues/[leagueId]/awards/seasons` feed tab data; `GET /api/leagues/[leagueId]/awards/[awardId]` powers detail pages; `POST /api/leagues/[leagueId]/awards/explain` builds explanation text.
- **Sport scope:** Sport resolves from league sport and normalizes via `lib/sport-scope.ts`, keeping behavior aligned with all supported sports.

---

## 2. Award Logic

- **GM of the Year:** `winPct * 50 + (champion ? 40 : 0) + min(10, pointsFor / 100)`.
- **Best Draft:** highest draft score in the target league-season.
- **Trade Master:** highest accepted trade count in the season (from `TradeOfferEvent.verdict = accepted`).
- **Waiver Wizard:** highest waiver claim count within season window (`createdAt` in target season year).
- **Best Comeback:** `winPct * 30 + max(0, min(70, (pointsFor - pointsAgainst) / 20))`.
- **Biggest Upset:** champions only, score `(1 - winPct) * 100` when winPct `< 0.7`.
- **Rookie King:** rookies only (`isRookie`), score `winPct * 60 + min(40, draftScore)`.
- **Dynasty Builder:** managers with >=2 seasons, score `seasonsInLeague * 20 + championshipCount * 50`.

---

## 3. Schema Additions

- `AwardRecord` already present and used as the single source of truth for generated awards.
- Migration: `20260321000000_add_awards_engine`.
- No additional schema changes were required for this pass.

---

## 4. UI Integration

- **Awards tab:** `components/app/tabs/AwardsTab.tsx`
  - Season filter dropdown, refresh action, year input, generate button.
  - Award cards with trophy display, score, detail link, inline AI explain toggle.
  - Added robust run/explain status handling and season-fetch error surfacing.
- **Award detail page:** `app/app/league/[leagueId]/awards/[awardId]/page.tsx`
  - Displays award metadata, winner, score.
  - “Why did they win?” explanation button with proper error handling.
- **Routes used by UI:**
  - `GET /api/leagues/[leagueId]/awards`
  - `GET /api/leagues/[leagueId]/awards/seasons`
  - `GET /api/leagues/[leagueId]/awards/[awardId]`
  - `POST /api/leagues/[leagueId]/awards/run`
  - `POST /api/leagues/[leagueId]/awards/explain`

---

## 5. UI Audit Findings

- **Awards tab navigation:** `?tab=Awards` opens the tab correctly and persists via league shell tab query state.
- **Season filter:** updates `useAwards` query and rerenders list correctly.
- **Generate awards button:** calls run endpoint, now checks `res.ok`, and reports success/failure status in UI.
- **Explain buttons (tab + detail):** now validate HTTP status and show deterministic failure text when API fails.
- **Award detail route safety:** detail API now enforces `awardId` belongs to requested `leagueId`, preventing cross-league leakage.
- **Validation hardening:** list/explain endpoints now reject unknown `awardType`; run endpoint validates sport input.

---

## 6. QA Findings

- **Type safety:** `npm run typecheck` passes.
- **Automated tests added and passing:**
  - `__tests__/award-score-calculator.test.ts`
  - `__tests__/awards-routes-contract.test.ts`
- **Executed command:** `npx vitest run __tests__/award-score-calculator.test.ts __tests__/awards-routes-contract.test.ts` (7/7 passing).
- **Coverage added:**
  - Formula conformance for GM of the Year / Dynasty Builder.
  - Biggest Upset champion-only behavior.
  - Trade/Waiver omission when no activity exists.
  - Route contract checks for list filter forwarding, awardType validation, run auth, sport normalization, and league-scoped detail lookup.

---

## 7. Fixes

- Aligned scoring formulas with prompt requirements in `AwardScoreCalculator`.
- Added season-bounded waiver counting and accepted-trade counting in `SeasonPerformanceAnalyzer`.
- Made awards write path transactional in `AwardsEngine` to avoid partial replace states.
- Added league-scoped award lookup (`getAwardByIdInLeague`) and used it in detail/explain APIs.
- Improved explanation pipeline with computed award rationale (`resolveAwardExplanation`) when available.
- Hardened tab/detail UI click flows with proper error handling and visible statuses.
- Added targeted tests for engine logic and route contracts.

---

## 8. Final Checklist

- [x] Awards generate for a target season and write records.
- [x] Season filters work on the awards list.
- [x] Award detail pages render and load from API.
- [x] AI explanation buttons return award-referenced narratives.
- [x] Invalid award type requests are rejected.
- [x] Unauthorized run requests return 401.
- [x] Detail route is league-scoped by `leagueId + awardId`.
- [ ] Full manual browser click-through across all leagues/sports (recommended follow-up in UI session).

---

## 9. Explanation of Awards Engine

The Awards Engine is a deterministic seasonal ranking pipeline for league awards. For a given league and season, it collects manager-level outcomes (record, scoring, playoffs/championship, draft grade, waiver activity, accepted trades, and multi-season tenure), applies award-specific scoring formulas, then persists one winner per award type to `AwardRecord`. The UI consumes those records in the Awards tab and detail pages, and explanation endpoints produce human-readable rationale that references the stored award data plus computed reasoning when available. This keeps awards reproducible, queryable, and safe to rerun each season.
