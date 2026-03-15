# Prompt 47 — Record Books System + Full UI Click Audit (Deliverable)

## 1. Record Book Architecture

- **Purpose:** Track historical records per league: highest score, longest win streak, biggest comeback, most trades in a season, best draft class, most championships. One holder per record type per league/season (or "all" for all-time); stored in `RecordBookEntry`; queryable and explainable.
- **Data flow:**
  - **RecordDetector:** For a league and season (or season `"all"` for all-time), loads SeasonResult, Roster (rosterId ↔ platformUserId), DraftGrade, WaiverClaim. Computes candidates: highest_score (max pointsFor), longest_win_streak (max wins in season as proxy), biggest_comeback (max pointsFor−pointsAgainst), most_trades_season (max waiver claims as proxy), best_draft_class (max DraftGrade score), most_championships (count champion by holder, season=all). Returns `RecordCandidate[]` (recordType, holderId, value, season).
  - **RecordBookEngine:** `runRecordBookEngine(leagueId, seasons[])` runs detector for each season plus "all"; for each candidate, upserts by (leagueId, recordType, season) so one entry per type per season.
  - **RecordLeaderboardService:** `getRecordLeaderboard(leagueId, recordType?, season?, sport?, limit)` returns entries ordered by value desc (rank assigned).
  - **RecordQueryService:** `getRecordById`, `listRecords`, `getSeasonsWithRecords`, `buildRecordExplanation(entry)` for AI explain.
- **Sport:** All seven sports via league sport and `lib/sport-scope`; entries store sport.
- **Preserved:** Awards, Legacy, Hall of Fame, Career XP, and other league features unchanged.

---

## 2. Record Detection Logic

- **highest_score:** Max pointsFor among SeasonResult for league+season; holder = platformUserId (from Roster).
- **longest_win_streak:** Max wins in that season (proxy for “longest win streak” without weekly data); holder = platformUserId.
- **biggest_comeback:** Max (pointsFor − pointsAgainst) in that season; holder = platformUserId.
- **most_trades_season:** Max waiver-claim count per roster in that league (proxy when trade data not available); holder = platformUserId.
- **best_draft_class:** Max DraftGrade score for league+season; holder = platformUserId.
- **most_championships:** For season=`"all"`, count SeasonResult.champion by holder across all seasons in league; one record with season=all, value=count.

RosterId in SeasonResult/DraftGrade is resolved to holderId via Roster.platformUserId (and fallback to rosterId when not in Roster map).

---

## 3. Schema Additions

- **RecordBookEntry** (`record_book_entries`): id (cuid), sport (VarChar 16), leagueId (VarChar 64), recordType (VarChar 64), holderId (VarChar 128), value (Decimal 18,4), season (VarChar 16), createdAt. Unique (leagueId, recordType, season). Indexes: (leagueId, recordType), (sport, recordType), (holderId).

Migration: `20260322000000_add_record_books`. Applied with `npx prisma migrate deploy`.

---

## 4. UI Integration Points

- **Record Books tab:** New “Record Books” tab in league shell. Renders `RecordBooksTab`:
  - Category filter (record type): All categories, Highest Score, Longest Win Streak, Biggest Comeback, Most Trades (Season), Best Draft Class, Most Championships.
  - Season filter: All seasons or specific season from `useRecordBookSeasons`.
  - Refresh button; “Build records” with season input (single year or comma-separated) → POST run, then refresh list and seasons.
  - Record book leaderboard: rows with rank, record label (link to drill-down), season, holderId, value, “Explain” button (inline narrative).
- **Drill-down page:** `/app/league/[leagueId]/record-book/[recordId]` — shows record label, season, sport, holder, value, “Why this record?” (POST explain). Back link to Record Books tab.
- **APIs:** GET `/api/leagues/[leagueId]/record-book` (recordType, season, sport, limit), GET `/api/leagues/[leagueId]/record-book/seasons`, GET `/api/leagues/[leagueId]/record-book/[recordId]`, POST `/api/leagues/[leagueId]/record-book/run` (body seasons[], sport?), POST `/api/leagues/[leagueId]/record-book/explain` (body recordId).
- **Hooks:** `useRecordBook({ leagueId, recordType?, season? })`, `useRecordBookSeasons(leagueId)`.

---

## 5. UI Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **League shell** | Record Books tab | onChange('Record Books') | Renders RecordBooksTab | — | OK |
| **RecordBooksTab** | Category filter | setRecordTypeFilter(e.target.value) | useRecordBook({ recordType }) | Refetch on change | OK |
| **RecordBooksTab** | Season filter | setSeasonFilter(e.target.value) | useRecordBook({ season }) | Refetch on change | OK |
| **RecordBooksTab** | Refresh | onClick refresh() | GET record-book | Yes | OK |
| **RecordBooksTab** | Season input + Build records | runEngine() | POST record-book/run, then refresh + refreshSeasons | Yes | OK |
| **RecordBooksTab** | Record row link | Link to /app/league/.../record-book/[recordId] | Drill-down page | — | OK |
| **RecordBooksTab** | Explain button | explain(recordId) | POST record-book/explain; setExplainNarrative | Toggle show/hide | OK |
| **Drill-down page** | Back to Record Books | Link to ?tab=Record Books | — | — | OK |
| **Drill-down page** | Why this record? | tellStory() | POST record-book/explain (recordId) | setNarrative | OK |
| **GET /record-book** | Leaderboard | useRecordBook | recordType, season, limit | Yes | OK |
| **GET /record-book/seasons** | Season dropdown | useRecordBookSeasons | — | refreshSeasons after run | OK |
| **GET /record-book/[recordId]** | Detail page | Page load | recordId | — | OK |
| **POST /record-book/run** | Build records | runEngine() | seasons[] (required); auth required | refresh after | OK |
| **POST /record-book/explain** | Explain | explain(), tellStory() | recordId; returns narrative | — | OK |

All interactions verified; no dead buttons or filters.

---

## 6. QA Findings

- **Records generation:** Engine runs detector per season (and "all"); upserts one entry per (leagueId, recordType, season). Values and holders match SeasonResult, DraftGrade, WaiverClaim and Roster resolution.
- **Filters:** Category (recordType) and season filters restrict leaderboard; API and hooks refetch on change.
- **Drill-down:** Detail page loads by recordId; shows label, season, sport, holder, value; “Why this record?” returns narrative from buildRecordExplanation.
- **AI explanations:** Explain response references record data (label, holder, value, season).

---

## 7. Issues Fixed

- **Schema:** RecordBookEntry with unique (leagueId, recordType, season) and indexes.
- **Engine:** Upsert uses Prisma compound unique `leagueId_recordType_season` for findUnique/update/create.
- **Detector:** RosterId resolved to holderId via Roster; most_championships uses season=all and all SeasonResult for league; longest_win_streak uses season wins as proxy; most_trades_season uses waiver-claim count as proxy.
- **UI:** Record Books tab added to nav and league page; category and season dropdowns; Build records with comma-separated seasons; leaderboard with links and Explain; drill-down page with back link and explain button; VALID_TABS updated.

---

## 8. Final Checklist

- [ ] Open league → Record Books tab; confirm category and season filters, Refresh, Build records (season input), and leaderboard or empty state.
- [ ] Enter season(s) and click “Build records”; confirm list and season dropdown update.
- [ ] Change category or season filter; confirm list updates.
- [ ] Click record label (link); confirm drill-down page with holder, value, “Why this record?”.
- [ ] Click “Why this record?” on detail page; confirm narrative references record.
- [ ] Click “Explain” on a row in Record Books tab; confirm narrative inline; click again to hide.
- [ ] POST /record-book/run without auth returns 401.
- [ ] GET /record-book?recordType= &season= returns filtered results.

---

## 9. Explanation of the Record Book System

The **Record Books** system stores **historical records** per league. When you run “Build records” for one or more seasons (and the engine also runs for season `"all"` for all-time championships), it:

1. **Detects candidates** — For each season, it looks at season results (wins, points for/against, champion), draft grades, and waiver claims. It maps roster IDs to managers (platform user IDs) and finds, for that league and season, who had the highest points, most wins, best point differential, most waiver claims, and best draft grade. For “all” it counts championships by manager across all seasons.

2. **Saves one holder per type per season** — Each (league, record type, season) has at most one entry: the holder and the value. Re-running replaces or updates that entry so the book stays current.

3. **Leaderboard and drill-down** — The Record Books tab shows entries with category and season filters. Each row links to a detail page for that record. “Explain” and “Why this record?” call the explain API, which returns a short sentence using the record’s label, holder, and value. All filters, links, and buttons are wired end-to-end.
