# Prompt 47 — Record Books System + Full UI Click Audit (Deliverable)

## 1. Record Book Architecture

- **Core stack:** `RecordDetector` (candidate extraction) → `RecordBookEngine` (season runs + persistence) → `RecordLeaderboardService` / `RecordQueryService` (read + explain).
- **Storage model:** `RecordBookEntry` in `record_book_entries` with league/sport/category holder/value/season.
- **Run flow:** `runRecordBookEngine(leagueId, seasons)` processes requested seasons plus `"all"` (for all-time championships), then upserts one row per `(leagueId, recordType, season)`.
- **Read flow:** record dashboard reads `GET /api/leagues/[leagueId]/record-book` + seasons endpoint; drill-down reads `GET /api/leagues/[leagueId]/record-book/[recordId]`; explain buttons call `POST /api/leagues/[leagueId]/record-book/explain`.
- **Sport scope:** engine now resolves sport from explicit request value or league sport via `lib/sport-scope.ts` and persists normalized sport values.

---

## 2. Record Detection Logic

- **highest_score:** maximum `SeasonResult.pointsFor` in a league-season.
- **longest_win_streak:** max `SeasonResult.wins` (season-level streak proxy).
- **biggest_comeback:** max `(pointsFor - pointsAgainst)` (season comeback proxy).
- **most_trades_season:** highest count of accepted trade offers in season scope (`TradeOfferEvent.verdict` accepted + season/year window).
- **best_draft_class:** maximum `DraftGrade.score` in the league-season.
- **most_championships:** for season `"all"`, championship count by holder across all seasons in league.
- **Identity resolution:** holder uses roster-to-manager mapping via `buildSeasonResultManagerMap` with fallback to roster id.

---

## 3. Schema Additions

- `RecordBookEntry` schema already present and active:
  - fields: `id`, `sport`, `leagueId`, `recordType`, `holderId`, `value`, `season`, `createdAt`
  - unique: `(leagueId, recordType, season)`
  - indexes: `(leagueId, recordType)`, `(sport, recordType)`, `holderId`
- Migration: `20260322000000_add_record_books`.
- No new schema migration required in this patch.

---

## 4. UI Integration Points

- **Dashboard tab:** `components/app/tabs/RecordBooksTab.tsx`
  - category filter, sport filter, season filter
  - refresh action
  - “Build records” action with season input (single/comma-separated)
  - leaderboard rows with detail links + inline explain toggle
- **Drill-down page:** `app/app/league/[leagueId]/record-book/[recordId]/page.tsx`
  - holder/value/season/sport display
  - “Why this record?” explanation action
- **Hooks/APIs:**
  - `useRecordBook({ leagueId, recordType?, season?, sport? })`
  - `useRecordBookSeasons(leagueId)`
  - API routes under `app/api/leagues/[leagueId]/record-book/*`

---

## 5. Audit Findings

- **Record book dashboard:** all controls wired; category, sport, and season filters trigger data reload.
- **Leaderboards:** rows render rank, category, holder, value, and link to drill-down page.
- **Category filters:** functional, with server-side validation for invalid record types.
- **Drill-down pages:** correctly load detail by `leagueId + recordId` and show clear errors on failure.
- **AI explanation buttons:** tab and detail explain buttons now handle HTTP errors explicitly and display deterministic responses.
- **Key hardening fixes from audit:** league-scoped record lookups, route validation (`recordType`, `sport`), run status feedback, seasons-fetch error visibility.

---

## 6. QA Findings

- **Type safety:** `npm run typecheck` passes.
- **Automated tests added and passing:**
  - `__tests__/record-book-routes-contract.test.ts`
  - `__tests__/record-book-engine.test.ts`
- **Executed test command:** `npx vitest run __tests__/record-book-routes-contract.test.ts __tests__/record-book-engine.test.ts` (6/6 passing).
- **Coverage includes:**
  - filter forwarding and validation for leaderboard route
  - unauthorized run rejection (401)
  - sport normalization on run
  - league-scoped detail/explain lookups
  - engine create/update behavior with sport persistence

---

## 7. Issues Fixed

- Aligned `most_trades_season` detection to accepted trades (not waiver proxy).
- Normalized sport resolution in engine using league sport fallback and valid sport inputs.
- Updated engine updates to persist corrected sport values on existing entries.
- Added league-scoped record fetch helper (`getRecordByIdInLeague`) and enforced it in detail/explain routes.
- Added contextual explanation resolver (`resolveRecordExplanation`) that includes detector context when available.
- Hardened dashboard/detail click paths with explicit `res.ok` handling, run status, and error surfacing.
- Added route validations for invalid `recordType` and invalid `sport`.

---

## 8. Final Checklist

- [x] Record book dashboard loads and renders leaderboard rows.
- [x] Category filters update results correctly.
- [x] Sport and season filters update results correctly.
- [x] Build records action persists records and refreshes dashboard data.
- [x] Drill-down pages render and resolve by league + record id.
- [x] AI explanation buttons return record-linked narratives.
- [x] `/record-book/run` rejects unauthenticated requests.
- [x] `/record-book` rejects invalid filters and honors valid filters.
- [ ] Optional manual browser pass across multiple sport leagues for visual QA.

---

## 9. Explanation of Record Book System

The Record Books system is a deterministic historical tracker for league milestones. Running the engine for one or more seasons computes category winners from seasonal data and upserts one entry per record type per season, with an additional all-time championships entry under season `"all"`. The dashboard then exposes these records as a searchable leaderboard with category/sport/season filters, while drill-down pages and explain buttons provide human-readable context for why a holder owns a specific record. The result is a stable, rerunnable history layer that supports league storytelling and future prestige/meta features.
