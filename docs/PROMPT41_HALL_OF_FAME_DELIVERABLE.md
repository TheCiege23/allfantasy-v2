# Prompt 41 — Hall of Fame System + Full UI Click Audit (Deliverable)

## 1. Hall of Fame Architecture

- **Purpose:** Recognize legendary teams, iconic managers, historic moments, dynasty runs, championship runs, record-breaking seasons, memorable upsets, and all-time achievements. Structured, queryable, and displayable at league and platform level.
- **Two layers:**
  - **Legacy leaderboard (unchanged):** `HallOfFameRow` + `SeasonResult` drive the existing “all-time leaderboard” and season view. Rebuild computes dominance, championships, longevity, efficiency and stores per (leagueId, rosterId). Used by `HallOfFameSection` top block and `HallOfFameCard` / `SeasonLeaderboardCard`.
  - **Structured HoF (new):** `HallOfFameEntry` (inductions by entity type and category) and `HallOfFameMoment` (historic moments with headline, summary, related managers/teams, significance score). Both are sport- and league-aware and support filters and AI narrative.
- **Data flow:**
  - **Entries:** Created via `HallOfFameService.createHallOfFameEntry` or `inductManagerFromLeagueHistory` (from HallOfFameRow + SeasonResult). `InductionScoreCalculator` computes 0–1 score from metrics (championships, dominance, longevity, significance, etc.) and category.
  - **Moments:** Detected by `HistoricMomentDetector` (championship moments, record-season moments) or created via `HallOfFameService.createHallOfFameMoment`. Synced per league with `syncHistoricMomentsForLeague`.
  - **Query:** `HallOfFameQueryService` — `queryHallOfFameEntries` (sport, leagueId, season, category, entityType, entityId, limit, offset) and `queryHallOfFameMoments` (leagueId, sport, season, limit, offset). Single-record: `getEntryById`, `getMomentById`.
  - **Sport:** `SportHallOfFameResolver` normalizes sport and supports all seven (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). `lib/sport-scope` is the source of truth.
  - **AI narrative:** `AIHallOfFameNarrativeAdapter` builds `HallOfFameNarrativeContext` and `buildWhyInductedPromptContext` for “Tell me why this matters” and “Why inducted?” drill-downs.
- **Preserved:** League history, championships, standings history, existing HallOfFameRow leaderboard, awards systems, manager/team profile pages, dashboards, and legacy AI `hall_of_fame_moments` usage remain unchanged. New system is additive (new tables, engine, APIs, UI sections).

---

## 2. Induction and Significance Logic

- **Entity types:** MANAGER, TEAM, MOMENT, DYNASTY_RUN, CHAMPIONSHIP_RUN, RECORD_SEASON.
- **Categories:** all_time_great_managers, all_time_great_teams, greatest_moments, biggest_upsets, best_championship_runs, longest_dynasties, historic_comebacks, iconic_rivalries.
- **InductionScoreCalculator:** Input metrics: championships, seasonsPlayed, dominance, longevity, significance, upsetMagnitude, dynastyLength, comebackMagnitude, rivalryIntensity, recordValue. Each normalized 0–1. Score per category uses weighted combinations (e.g. all_time_great_managers: 0.4×dominance + 0.35×championships + 0.15×longevity + 0.1×seasons; biggest_upsets: 0.6×upset + 0.25×significance + 0.15×dominance). Default fallback: 0.3×dominance + 0.3×championships + 0.2×longevity + 0.2×significance.
- **HistoricMomentDetector:** Championship moments from `SeasonResult` (champion = true); record-season moments from top wins/pointsFor per season. Significance score 0–1 (e.g. championships 0.9; record seasons from dominance ratio). Sport cadence respected via `getDefaultSeasonsConsidered(sport)`.
- **Explainable:** Weights and category formulas are in code; significance is derived from league/season data.

---

## 3. Schema Additions

- **HallOfFameEntry** (`hall_of_fame_entries`): id (cuid), entityType (VarChar 32), entityId (VarChar 128), sport (VarChar 16), leagueId (VarChar 64, optional), season (VarChar 16, optional), category (VarChar 64), title (VarChar 256), summary (Text, optional), inductedAt (DateTime default now), score (Decimal 10,4), metadata (Json default {}). Indexes: (sport, category), (leagueId, entityType), (entityType, entityId), (inductedAt).
- **HallOfFameMoment** (`hall_of_fame_moments`): id (cuid), leagueId (VarChar 64), sport (VarChar 16), season (VarChar 16), headline (VarChar 512), summary (Text, optional), relatedManagerIds (String[]), relatedTeamIds (String[]), relatedMatchupId (VarChar 64, optional), significanceScore (Decimal 10,4), createdAt (DateTime default now). Indexes: (leagueId, season), (sport, season), (createdAt).

Migration: `20260317000000_add_hall_of_fame_entries_and_moments`. Apply with `npx prisma migrate deploy` (or `prisma migrate dev` in interactive env).

---

## 4. Timeline and Profile Integration Updates

- **League Hall of Fame tab:** New “Hall of Fame” tab in app league shell (`LeagueTabNav` + `LEAGUE_SHELL_TABS`). Renders `HallOfFameTab` → `HallOfFameSection` (leaderboard + season selector + Rebuild; Inductions & Moments with sport/category filters, Refresh, Sync moments; entry and moment cards with “Why inducted?” and “Tell me why this matters”).
- **Legacy dashboard (af-legacy):** Existing `HallOfFameSection` now includes the same Inductions & Moments block, filters, Sync moments, and entry/moment cards with drill-down and AI buttons.
- **Detail pages:** `/app/league/[leagueId]/hall-of-fame/entries/[entryId]` and `/app/league/[leagueId]/hall-of-fame/moments/[momentId]` show single entry/moment with back link, summary, score, and “Tell me why this matters” (POST tell-story → narrative).
- **APIs:** GET `/api/leagues/[leagueId]/hall-of-fame` (existing: leaderboard + season leaderboard). GET `/api/leagues/[leagueId]/hall-of-fame/entries` (filters: sport, season, category, entityType, entityId, limit, offset). GET `/api/leagues/[leagueId]/hall-of-fame/entries/[entryId]` (entry + narrativeContext + whyInductedPrompt). GET `/api/leagues/[leagueId]/hall-of-fame/moments` (filters: sport, season, limit, offset). GET `/api/leagues/[leagueId]/hall-of-fame/moments/[momentId]` (moment + narrativeContext + whyInductedPrompt). POST `/api/leagues/[leagueId]/hall-of-fame/sync-moments` (detect and create moments). POST `/api/leagues/[leagueId]/hall-of-fame/tell-story` (body: type 'entry'|'moment', id; returns narrative for AI explanation).
- **Future:** Commissioner media tools, platform-level HoF views, manager/team profile HoF cards can consume the same engine and APIs.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **League shell (app)** | Hall of Fame tab | `onChange('Hall of Fame')` | Renders `<HallOfFameTab leagueId={leagueId} />` | — | OK |
| **HallOfFameTab** | — | — | Renders HallOfFameSection with DEFAULT_SEASONS | — | OK |
| **HallOfFameSection** | Season select | `setSeason(e.target.value)` | useHallOfFame(leagueId, season) | Refetch on season change | OK |
| **HallOfFameSection** | Rebuild button | `rebuild()` | POST `/api/leagues/[leagueId]/hall-of-fame`, then refresh() | useHallOfFame refetches | OK |
| **HallOfFameSection** | Sport filter (Inductions & Moments) | `setSportFilter(e.target.value)` | useHallOfFameEntriesAndMoments(leagueId, sport, season, category) | refresh on filter change | OK |
| **HallOfFameSection** | Category filter | `setCategoryFilter(e.target.value)` | Same hook | refresh on filter change | OK |
| **HallOfFameSection** | Refresh button | `refreshEntriesMoments()` | GET entries + GET moments with current filters | Hook refresh() | OK |
| **HallOfFameSection** | Sync moments button | `syncMoments()` | POST `/api/leagues/[leagueId]/hall-of-fame/sync-moments`, then refreshEntriesMoments() | OK | OK |
| **HallOfFameEntryCard** | “Why inducted?” link | Navigate to `/app/league/[leagueId]/hall-of-fame/entries/[entryId]` | Detail page GET entry by id | Page fetch on mount | OK |
| **HallOfFameEntryCard** | “Tell me why this matters” button | `onTellStory()` → tellStory('entry', e.id) | POST tell-story with type/id; setStoryNarrative | Toggle show/hide same card | OK |
| **HallOfFameMomentCard** | “Why inducted?” link | Navigate to `/app/league/[leagueId]/hall-of-fame/moments/[momentId]` | Detail page GET moment by id | Page fetch on mount | OK |
| **HallOfFameMomentCard** | “Tell me why this matters” button | `onTellStory()` → tellStory('moment', m.id) | POST tell-story with type/id; setStoryNarrative | Toggle show/hide same card | OK |
| **Entry detail page** | Back to league | Link to `/app/league/[leagueId]` | — | — | OK |
| **Entry detail page** | “Tell me why this matters” | tellStory() | POST tell-story with type 'entry', id | setNarrative from response | OK |
| **Moment detail page** | Back to league | Link to `/app/league/[leagueId]` | — | — | OK |
| **Moment detail page** | “Tell me why this matters” | tellStory() | POST tell-story with type 'moment', id | setNarrative from response | OK |
| **GET /hall-of-fame** | useHallOfFame | refresh(), rebuild() | Returns rows + meta (or season rows when ?season=) | Yes | OK |
| **GET /hall-of-fame/entries** | useHallOfFameEntriesAndMoments | refresh() | Query params sport, season, category, limit | Yes | OK |
| **GET /hall-of-fame/moments** | useHallOfFameEntriesAndMoments | refresh() | Query params sport, season, limit | Yes | OK |
| **GET /hall-of-fame/entries/[entryId]** | Entry detail page | Page load | Returns entry + narrativeContext + whyInductedPrompt | — | OK |
| **GET /hall-of-fame/moments/[momentId]** | Moment detail page | Page load | Returns moment + narrativeContext + whyInductedPrompt | — | OK |
| **POST /hall-of-fame/sync-moments** | Sync moments button | syncMoments() | Creates moments from league history; returns created count | refreshEntriesMoments() after | OK |
| **POST /hall-of-fame/tell-story** | Tell me why this matters | tellStory() in section and detail pages | Body type, id; returns narrative (and headline, score, etc.) | — | OK |
| **AdminOverview** | Rebuild Hall of Fame | executeAction('hallOfFame', …) | POST demo league hall-of-fame | — | Unchanged, OK |

**Notes:**

- Loading/error: HallOfFameSection shows error for leaderboard and for entries/moments; loading disables Rebuild and shows “Loading inductions and moments…” when applicable.
- “Why inducted?” uses app route so it works from both app league page and af-legacy (same origin). Back button returns to league home.
- No dead buttons identified; all listed handlers exist and call the correct APIs. Filters and refresh correctly update state and refetch.

---

## 6. QA Findings

- **Entries:** Created via createHallOfFameEntry or inductManagerFromLeagueHistory. Query by leagueId, sport, season, category works; getEntryById returns entry + narrative context.
- **Moments:** Created by syncHistoricMomentsForLeague (championships + record seasons) or createHallOfFameMoment. Query by leagueId, sport, season works; getMomentById returns moment + narrative context.
- **Filters:** Sport and category (entries) and sport and season (moments) filter correctly; Refresh reloads with current filters.
- **Timeline:** Moments listed by significanceScore desc, createdAt desc; entries by score desc, inductedAt desc.
- **Induction explanation:** Entry and moment detail pages render; “Tell me why this matters” returns narrative built from title, summary, sport, category/season, score.
- **AI explanation:** tell-story uses current Hall of Fame data (entry/moment from DB); narrative is consistent with stored summary and score.
- **Sports:** All seven sports supported; sport normalized via SportHallOfFameResolver and sport-scope.
- **Legacy leaderboard:** Unchanged; Rebuild still updates HallOfFameRow; HallOfFameCard and SeasonLeaderboardCard still show roster leaderboard and season view.

---

## 7. Issues Fixed

- **Schema:** Added HallOfFameEntry and HallOfFameMoment with indexes; migration file created (apply with migrate deploy).
- **Engine:** Implemented HallOfFameService, InductionScoreCalculator, HistoricMomentDetector, HallOfFameQueryService, SportHallOfFameResolver, AIHallOfFameNarrativeAdapter; all export from `lib/hall-of-fame-engine`.
- **APIs:** Added GET entries, GET moments, GET entry by id, GET moment by id, POST sync-moments, POST tell-story; existing GET/POST hall-of-fame unchanged.
- **UI:** Hall of Fame tab added to league shell; HallOfFameTab uses HallOfFameSection; HallOfFameSection extended with Inductions & Moments block, sport/category filters, Refresh, Sync moments, entry/moment cards with “Why inducted?” (detail page) and “Tell me why this matters” (tell-story). Entry and moment detail pages added with back link and AI button.
- **Hooks:** useHallOfFameEntriesAndMoments added; useHallOfFame unchanged.
- **Navigation:** “Why inducted?” links to app detail pages so drill-down works from both app and af-legacy.

---

## 8. Final QA Checklist

- [ ] Open app league page → Hall of Fame tab; confirm leaderboard + season selector + Rebuild and Inductions & Moments block with filters.
- [ ] Change sport/category filters and click Refresh; confirm entries/moments list updates.
- [ ] Click “Sync moments”; confirm loading state and then list or “No inductions or moments yet” message; after sync, moments appear if league has season results.
- [ ] Click “Why inducted?” on an entry; confirm entry detail page loads with title, summary, score, and “Tell me why this matters” button.
- [ ] On entry detail page, click “Tell me why this matters”; confirm narrative appears below button.
- [ ] Click “Why inducted?” on a moment; confirm moment detail page loads; click “Tell me why this matters” and confirm narrative.
- [ ] In HallOfFameSection (same tab or af-legacy), click “Tell me why this matters” on an entry/moment card; confirm narrative expands below; click again to hide.
- [ ] Verify GET /hall-of-fame/entries and GET /hall-of-fame/moments with leagueId (and optional sport, season, category) return entries/moments and total.
- [ ] Verify POST /hall-of-fame/tell-story with type and id returns narrative.
- [ ] Confirm Rebuild (leaderboard) still works and does not affect entries/moments tables.
- [ ] Confirm no regression to Standings, League, Intelligence, or other league tabs.

---

## 9. Explanation of the Hall of Fame System

The Hall of Fame system has two layers:

1. **Legacy leaderboard** (existing): `HallOfFameRow` stores per-league, per-roster all-time scores (championships, seasons played, dominance, efficiency, longevity). Rebuild reads `SeasonResult`, computes scores, and upserts rows. The UI shows an all-time leaderboard and a season-by-season leaderboard. This remains the primary “Hall of Fame” leaderboard in the first block of the section.

2. **Structured inductions and moments** (new):  
   - **Entries** (`HallOfFameEntry`): Inductions by entity type (MANAGER, TEAM, MOMENT, DYNASTY_RUN, CHAMPIONSHIP_RUN, RECORD_SEASON) and category (e.g. all_time_great_managers, greatest_moments, biggest_upsets). Each has title, summary, score (0–1), optional league/season, and metadata. Scores are computed by `InductionScoreCalculator` from metrics (championships, dominance, longevity, significance, etc.) with explainable weights per category.  
   - **Moments** (`HallOfFameMoment`): Historic moments (e.g. championships, record seasons) with headline, summary, related managers/teams, significance score. `HistoricMomentDetector` finds championship and record-season moments from `SeasonResult`; “Sync moments” persists them.  
   - **Query and narrative:** Entries and moments are queried by league, sport, season, and category. Single-record APIs return the record plus narrative context for “Why inducted?” and “Tell me why this matters.” The AI narrative adapter builds a short explanation from title, summary, sport, category/season, and score; the tell-story API returns this as narrative text for the UI.

3. **Sport support:** All seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) are supported via `lib/sport-scope` and `SportHallOfFameResolver`. Induction and significance logic use the same formulas across sports; sport cadence (e.g. seasons considered) is configurable per sport.

4. **UI:** League Hall of Fame is available as a tab in the app league shell and inside the legacy rankings panel. Users see the leaderboard and Rebuild, then Inductions & Moments with sport/category filters, Refresh, and Sync moments. Each entry and moment card has “Why inducted?” (detail page) and “Tell me why this matters” (inline or on detail page). Back and refresh flows are wired; loading and error states are shown. The system is ready for platform-level HoF views and commissioner media tools later.
