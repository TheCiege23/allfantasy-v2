# Prompt 44 — Franchise / GM Economy System + Full UI Click Audit

## 1. GM economy architecture

### Overview

The **Franchise / GM Economy System** represents long-term career progression across the platform. Managers accumulate:

- **Franchise value** — composite from prestige, championships, playoff appearances, tenure, win rate
- **GM prestige score** (0–100) — from championships, playoffs, tenure, win rate, league diversity
- **Career stats** — total career seasons, leagues played, championship count, playoff appearances, career win percentage
- **GM tier** — Legend, Elite, Veteran, Rising, Proven, Developing (from prestige score)

The system is **cross-league**: one profile per manager (keyed by `managerId` / platform user id), aggregating from all leagues and seasons where that manager has rosters and season results.

### Core modules

| Module | Path | Purpose |
|--------|------|---------|
| **GMEconomyEngine** | `lib/gm-economy/GMEconomyEngine.ts` | Runs career aggregation and upserts `ManagerFranchiseProfile` for one manager or all. |
| **GMPrestigeCalculator** | `lib/gm-economy/GMPrestigeCalculator.ts` | Computes GM prestige score 0–100 from profile inputs. |
| **CareerProgressionAggregator** | `lib/gm-economy/CareerProgressionAggregator.ts` | Aggregates career from Roster + SeasonResult (and optional legacy/reputation). |
| **FranchiseValueResolver** | `lib/gm-economy/FranchiseValueResolver.ts` | Computes franchise value from profile (prestige, championships, playoffs, tenure, win rate). |
| **GMProfileQueryService** | `lib/gm-economy/GMProfileQueryService.ts` | Query franchise profile by manager; list profiles (leaderboard); list progression events. |
| **SportCareerResolver** | `lib/gm-economy/SportCareerResolver.ts` | Sport normalization and labels (uses `lib/sport-scope.ts`). |
| **GMTierResolver** | `lib/gm-economy/GMTierResolver.ts` | Maps prestige score to tier label and badge color. |

### Data flow

- **Roster** + **SeasonResult**: aggregator finds all rosters for `managerId` (platformUserId), then all season results for those rosters (by rosterId or leagueId+rosterId). From these it computes totalCareerSeasons, totalLeaguesPlayed, championshipCount, playoffAppearances, careerWinPercentage.
- **GMPrestigeCalculator** and **FranchiseValueResolver** turn those into gmPrestigeScore and franchiseValue.
- **GMEconomyEngine** upserts **ManagerFranchiseProfile** and can create **GMProgressionEvent** records for timeline (championship, playoff, etc.) in a future pass.
- **GMProfileQueryService** and APIs expose profile and events to UI.

---

## 2. Progression logic

- **Career aggregation** (CareerProgressionAggregator):
  - Rosters where `platformUserId = managerId`.
  - SeasonResults where `rosterId = managerId` (when app uses platform user id as rosterId) **or** where (leagueId, rosterId) matches the roster ids from step 1.
  - Dedupe by (leagueId, season). Sum championships, count playoff appearances (any completed season), total wins/losses for win percentage.
- **Prestige** (GMPrestigeCalculator): weighted combination of championship score (capped), playoff score (capped), tenure score (capped), win rate, league diversity (capped). Weights: championship 0.3, playoff 0.15, tenure 0.2, win rate 0.2, league diversity 0.15.
- **Franchise value** (FranchiseValueResolver): base + prestige×2.5 + championships×500 + playoffs×50 + seasons×20 + winPct×200 (scale arbitrary but consistent).
- **Tiers** (GMTierResolver): Legend (90+), Elite (75–89), Veteran (60–74), Rising (45–59), Proven (25–44), Developing (0–24).

---

## 3. Schema additions

**ManagerFranchiseProfile** (table `manager_franchise_profiles`):

- `id` (cuid), `managerId` (unique), `totalCareerSeasons`, `totalLeaguesPlayed`, `championshipCount`, `playoffAppearances`, `careerWinPercentage` (Decimal 6,4), `gmPrestigeScore` (Decimal 10,4), `franchiseValue` (Decimal 12,4), `updatedAt`.

**GMProgressionEvent** (table `gm_progression_events`):

- `id` (cuid), `managerId`, `sport`, `eventType`, `valueChange`, `sourceReference`, `createdAt`. Indexes on managerId, (managerId, sport), (eventType, createdAt).

Migration: `prisma/migrations/20260319000000_add_gm_economy/migration.sql`.

---

## 4. UI integration points

| Surface | Integration |
|---------|-------------|
| **League page** | New **Career** tab: GM leaderboard (order by franchise value or prestige), Refresh, Run GM economy, per-row “Explain career” (POST explain). |
| **League Settings** | New **GM Economy** subtab: short description, “Open Career tab” link, “Run GM economy” button. |
| **Widget** | **FranchiseValueWidget** (`components/FranchiseValueWidget.tsx`): accepts `managerId`, shows value, optional prestige, optional tier badge; can be embedded in profile cards or dashboards. |
| **Hooks** | **useGMFranchiseProfile(managerId)**, **useGMLeaderboard({ orderBy, limit })** for data and refresh. |

---

## 5. Full UI click audit findings

| # | Element | Component / Route | Handler | State / redirect | API / backend | Cache / reload | Fix / note |
|---|--------|-------------------|---------|------------------|---------------|----------------|------------|
| 1 | Career tab | LeagueTabNav, league page | renderTab → CareerTab | — | — | — | OK |
| 2 | Order by (franchise value / GM prestige) | CareerTab | `setOrderBy` | useGMLeaderboard({ orderBy }) refetches | GET leaderboard?orderBy= | refresh() | OK |
| 3 | Refresh | CareerTab | `onClick={() => refresh()}` | Hook refresh | GET leaderboard | Leaderboard refetched | OK |
| 4 | Run GM economy | CareerTab | `runEngine` | setRunLoading; then refresh() | POST /api/gm-economy/run | Leaderboard refetched after run | OK |
| 5 | Explain career (per row) | GMCareerCard | `onExplain` | setExplainManagerId, setExplainNarrative, setExplainLoading | POST /api/gm-economy/explain | — | OK |
| 6 | Open Career tab | GMEconomyPanel (Settings) | Link to `?tab=Career` | Client nav | — | — | OK |
| 7 | Run GM economy (Settings) | GMEconomyPanel | `runEngine` | setRunLoading | POST /api/gm-economy/run | — | OK (no leaderboard in Settings; user can open Career to see) |
| 8 | Settings subtab GM Economy | LeagueSettingsTab | onClick setActive | Active subtab | — | — | OK |
| 9 | FranchiseValueWidget | Any | useGMFranchiseProfile(managerId) | profile, loading, error | GET /api/gm-economy/profile?managerId= | — | OK |

All handlers exist, state updates are correct, API wiring matches routes. Progression events API (GET progression) is implemented; UI timeline for events can be added later (e.g. Career tab “Timeline” section).

---

## 6. QA findings

- **GM profiles generate correctly**: Run GM economy creates/updates ManagerFranchiseProfile from Roster + SeasonResult; profile API returns tier and scores.
- **Career progression events**: Table and API exist; engine does not yet write GMProgressionEvent records (future: on championship/playoff/league join).
- **Sport filters**: Leaderboard is global (no sport filter); progression events API supports sport filter. SportCareerResolver and sport-scope used for all seven sports.
- **Prestige calculations**: GMPrestigeCalculator and FranchiseValueResolver produce consistent values; tier from GMTierResolver.
- **AI explanations**: POST /api/gm-economy/explain returns narrative (tier, prestige, value, career stats); “Explain career” button wired in Career tab.
- **Click paths**: Career tab (order, refresh, run, explain), Settings → GM Economy (link, run), FranchiseValueWidget (load profile) verified.

---

## 7. Issues fixed

- None identified as broken; new feature. Implemented: schema, engine, APIs, Career tab, Settings panel, widget, hooks.

---

## 8. Final QA checklist

- [ ] **Career tab**: Open league → Career tab. Select “By franchise value” / “By GM prestige” → list reorders. Click Refresh → list refetches. Click “Run GM economy” → runs then refresh; leaderboard updates if new data. Click “Explain career” on a row → narrative appears; click again → Hide.
- [ ] **Settings → GM Economy**: Open Settings → GM Economy. Click “Open Career tab” → league page with Career tab active. Click “Run GM economy” → request succeeds.
- [ ] **Profile API**: GET `/api/gm-economy/profile?managerId=<id>` returns profile or null. GET `/api/gm-economy/leaderboard?orderBy=franchiseValue` returns profiles and total.
- [ ] **Run API**: POST `/api/gm-economy/run` with body `{}` runs for all; with body `{ managerId: "x" }` runs for one. Returns processed, created, updated, results.
- [ ] **Explain API**: POST `/api/gm-economy/explain` with body `{ managerId }` returns narrative, source, tierLabel, gmPrestigeScore, franchiseValue.
- [ ] **Progression API**: GET `/api/gm-economy/progression?managerId=<id>&sport=&limit=50` returns events and total (may be empty until events are written).
- [ ] **FranchiseValueWidget**: Render with managerId; shows value, prestige, tier when profile exists; loading/empty when not.
- [ ] **Sports**: All flows respect sport-scope (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER); aggregation is cross-sport; progression events are sport-aware.

---

## 9. Explanation of the GM economy system

The **Franchise / GM Economy System** gives the platform a **career layer** that:

- **Tracks long-term progression** across leagues and seasons: total seasons, leagues played, championships, playoff appearances, win rate.
- **Scores managers** with a **GM prestige score** (0–100) and a **franchise value** (single number for ranking and display).
- **Assigns a GM tier** (Legend, Elite, Veteran, Rising, Proven, Developing) from prestige for badges and recognition.
- **Exposes career data** via profile API, leaderboard API, and progression-events API (timeline ready for future use).
- **Powers UI**: Career tab (leaderboard, run engine, explain), Settings → GM Economy (link + run), and FranchiseValueWidget for embedding in cards/dashboards.

The system is **cross-league**: one profile per manager (same identity as Roster.platformUserId). It does not replace draft, waiver, trade, reputation, or legacy; it sits alongside them and can be extended to consume reputation/legacy/HoF for richer prestige or events. **Sport support** is full (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) via SportCareerResolver and sport-scope; career aggregation is global with optional sport-scoped progression events for timeline. **Future extensions**: write GMProgressionEvent on championship/playoff/join; badges/cosmetics/titles; manager comparison tool; “Explain my career” from profile page using session.
