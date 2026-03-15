# Prompt 46 — Awards Engine + Full UI Click Audit (Deliverable)

## 1. Awards Architecture

- **Purpose:** Automatically generate fantasy awards each season (GM of the Year, Best Draft, Trade Master, Waiver Wizard, Best Comeback, Biggest Upset, Rookie King, Dynasty Builder). One winner per award type per league/season; stored in `AwardRecord`; queryable and explainable.
- **Data flow:**
  - **SeasonPerformanceAnalyzer:** For a league+season, loads League (sport), Roster (platformUserId), SeasonResult (wins, losses, pointsFor, pointsAgainst, champion), DraftGrade (score per roster), WaiverClaim (count per roster). Resolves rosterId ↔ platformUserId (including SeasonResult where rosterId is either Roster.id or platformUserId). Computes per-manager metrics: wins, losses, points, champion, draftScore, waiverClaimCount, tradeCount (stubbed 0), isRookie (first season in league), seasonsInLeague, championshipCount. Output: `SeasonPerformanceInput` (byManager map).
  - **AwardScoreCalculator:** For each award type, computes a winner from `byManager`: GM of the Year (win% + champion bonus + points), Best Draft (max draft grade), Trade Master (max trade count; no trades → no award), Waiver Wizard (max waiver claims), Best Comeback (win% + points diff proxy), Biggest Upset (champion with sub-70% win rate), Rookie King (best rookie by win% + draft score), Dynasty Builder (multi-season + championships). Returns one winner per type with managerId, score, optional reason.
  - **AwardsEngine:** `runAwardsEngine(leagueId, season)` → analyze → calculate → delete existing AwardRecords for that league+season → create new records. `runAwardsEngineForLeague(leagueId, seasons[])` runs for multiple seasons.
  - **AwardQueryService:** listAwards(leagueId, season?, awardType?, limit), getAwardById(awardId), getSeasonsWithAwards(leagueId), buildAwardExplanation(record) for AI explain.
- **Sport:** All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) via league sport and `lib/sport-scope`; award records store sport.
- **Preserved:** Existing tabs, Legacy Score, Hall of Fame, Career XP, and other league features unchanged. Awards are additive.

---

## 2. Award Logic

- **GM of the Year:** Score = winPct×50 + (champion ? 40 : 0) + min(10, pointsFor/100). Winner = max score.
- **Best Draft:** Winner = manager with highest DraftGrade score for that league/season; no grade → no award.
- **Trade Master:** Winner = manager with highest trade count (currently 0; trade data can be wired later).
- **Waiver Wizard:** Winner = manager with highest WaiverClaim count; 0 claims → no award.
- **Best Comeback:** Score = winPct×30 + max(0, min(70, (pointsFor−pointsAgainst)/20)); winner = max (proxy for improvement).
- **Biggest Upset:** Among champions, score = (1−winPct)×100 if winPct < 0.7 else 0; winner = max.
- **Rookie King:** Among managers with isRookie (first season in league), score = winPct×60 + min(40, draftScore); winner = max.
- **Dynasty Builder:** Among managers with seasonsInLeague ≥ 2, score = seasonsInLeague×20 + championshipCount×50; winner = max.

---

## 3. Schema Additions

- **AwardRecord** (`award_records`): id (cuid), leagueId (VarChar 64), sport (VarChar 16), season (VarChar 16), awardType (VarChar 64), managerId (VarChar 128), score (Decimal 12,4), createdAt. Indexes: (leagueId, season), (leagueId, season, awardType), (managerId).

Migration: `20260321000000_add_awards_engine`. Apply with `npx prisma migrate deploy` when DB is available.

---

## 4. UI Integration

- **Awards tab:** New “Awards” tab in league shell (`LeagueTabNav` + `LEAGUE_SHELL_TABS`). Renders `AwardsTab`:
  - Season filter dropdown (seasons that have awards + “All seasons”).
  - Refresh button (refetches list and seasons).
  - Run section: season year input + “Generate awards” button (POST run).
  - List of award cards: trophy icon, award label (link to detail page), season, managerId, score, “Explain” button (AI explain inline).
- **Award detail page:** `/app/league/[leagueId]/awards/[awardId]` — shows award label, season, sport, winner (managerId), score, “Why did they win?” button (POST explain → narrative). Back link to Awards tab.
- **APIs:** GET `/api/leagues/[leagueId]/awards` (season, awardType, limit), GET `/api/leagues/[leagueId]/awards/seasons`, GET `/api/leagues/[leagueId]/awards/[awardId]`, POST `/api/leagues/[leagueId]/awards/run` (body season, sport?), POST `/api/leagues/[leagueId]/awards/explain` (body awardId or season+awardType).
- **Hooks:** `useAwards({ leagueId, season?, awardType? })`, `useAwardSeasons(leagueId)`.

---

## 5. UI Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **League shell** | Awards tab | onChange('Awards') | Renders AwardsTab | — | OK |
| **AwardsTab** | Season filter | setSeasonFilter(e.target.value) | useAwards({ season }) | Refetch on change | OK |
| **AwardsTab** | Refresh | onClick refresh() | GET awards, refreshSeasons | Yes | OK |
| **AwardsTab** | Season input + Generate awards | runEngine() | POST awards/run, then refresh + refreshSeasons | Yes | OK |
| **AwardsTab** | Award card link | Link to /app/league/.../awards/[awardId] | Detail page | — | OK |
| **AwardsTab** | Explain button | explain(awardId) | POST awards/explain; setExplainNarrative | Toggle show/hide | OK |
| **Award detail page** | Back to Awards | Link to ?tab=Awards | — | — | OK |
| **Award detail page** | Why did they win? | tellStory() | POST awards/explain (awardId) | setNarrative | OK |
| **GET /awards** | List | useAwards | season, awardType, limit | Yes | OK |
| **GET /awards/seasons** | Seasons dropdown | useAwardSeasons | — | refreshSeasons after run | OK |
| **GET /awards/[awardId]** | Detail page | Page load | awardId | — | OK |
| **POST /awards/run** | Generate awards | runEngine() | season (required); auth required | refresh after | OK |
| **POST /awards/explain** | Explain | explain(), tellStory() | awardId or season+awardType; returns narrative | — | OK |

**Notes:** All buttons and filters wired. Trophy display is icon + label + score on each card. Award detail page renders winner and score and AI explanation. No dead controls identified.

---

## 6. QA Findings

- **Awards generation:** Engine analyzes SeasonResult, DraftGrade, WaiverClaim (and roster ↔ manager mapping); calculator picks one winner per type; records replaced for that league+season on each run.
- **Filters:** Season filter on list; award type filter supported in API (optional in UI).
- **Award pages:** Detail page loads by awardId; shows award label, season, sport, managerId, score; “Why did they win?” returns narrative from buildAwardExplanation.
- **AI explanations:** Explain API returns narrative that references award data (label, managerId, score, season).

---

## 7. Fixes

- **Schema:** AwardRecord added with indexes; migration file created.
- **Analyzer:** RosterId resolution covers both Roster.id and platformUserId; merged season results by key to avoid double-count; rookie = first season in league (seasonsInLeague === 1); dynasty uses all SeasonResult rows in league for seasons/championships.
- **Calculator:** Trade Master and Waiver Wizard return null when no trades/claims; other awards have fallbacks (e.g. Best Comeback uses record + points diff).
- **UI:** Awards tab added to nav and league page; AwardsTab with season filter, run, list with trophy and Explain; award detail page with back link and explain button; VALID_TABS and renderTab updated.

---

## 8. Final Checklist

- [ ] Open league → Awards tab; confirm season dropdown, Refresh, Generate awards (year input), and list (or empty state).
- [ ] Enter season and click “Generate awards”; confirm loading then list or seasons dropdown updates.
- [ ] Change season filter; confirm list updates.
- [ ] Click award label (link); confirm award detail page with winner, score, “Why did they win?”.
- [ ] Click “Why did they win?” on detail page; confirm narrative references award data.
- [ ] Click “Explain” on a card in Awards tab; confirm narrative inline; click again to hide.
- [ ] POST /awards/run without auth returns 401.
- [ ] GET /awards?season= returns only that season’s awards.

---

## 9. Explanation of the Awards Engine

The Awards Engine generates **seasonal fantasy awards** for a league. When you run it for a given **league** and **season**, it:

1. **Analyzes performance** — Loads rosters, season results (wins, losses, points, champion), draft grades, and waiver claims for that league/season. It maps roster IDs to manager IDs (platform user IDs) so every metric is attached to the right manager.

2. **Calculates winners** — For each award type, a simple rule picks one winner:
   - **GM of the Year:** Best combination of win rate, championship, and points.
   - **Best Draft:** Highest draft grade.
   - **Trade Master / Waiver Wizard:** Most trades / waiver claims (if any).
   - **Best Comeback / Biggest Upset:** Derived from record and points (comeback) or champion with lower win rate (upset).
   - **Rookie King:** Best first-year manager (first season in that league).
   - **Dynasty Builder:** Best multi-season manager (seasons in league + championships).

3. **Saves awards** — Previous awards for that league+season are removed; new records are written (one per award type). Each record stores award type, winning managerId, and score.

4. **UI and explain** — The Awards tab lists awards with a season filter; each award links to a detail page. “Explain” and “Why did they win?” call the explain API, which returns a short narrative using the award’s label, winner, and score. All filters, links, and buttons are wired end-to-end.
