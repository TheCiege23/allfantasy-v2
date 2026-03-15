# Prompt 52 — League Promotion / Relegation System (Deliverable)

## 1. Architecture

- **Purpose:** League hierarchy where teams can promote and relegate between divisions (tiers) at season end.
- **Core modules:**
  - **DivisionResolver** (`lib/promotion-relegation/DivisionResolver.ts`): `listDivisionsByLeague(leagueId, sport?)`, `getDivisionById(divisionId)`, `resolveDivisionForTeam(teamId)`. Returns division views with team counts.
  - **StandingsEvaluator** (`lib/promotion-relegation/StandingsEvaluator.ts`): `getStandingsWithZones(divisionId, promoteCount, relegateCount)` — ordered standings plus `inPromotionZone` (top N) and `inRelegationZone` (bottom N). `getStandingsForDivision(divisionId)` when no rule exists.
  - **PromotionEngine** (`lib/promotion-relegation/PromotionEngine.ts`): `runPromotionRelegation(leagueId, dryRun?)`. Loads PromotionRules and divisions; for each rule, takes top `promoteCount` from lower tier and bottom `relegateCount` from higher tier; returns planned transitions; if not dry run, updates `LeagueTeam.divisionId`.
- **Data flow:** Divisions and rules are stored in DB. Standings are computed from LeagueTeam (rank, pointsFor, wins). Season-end run applies moves by updating team divisionId.

---

## 2. Schema Additions

- **LeagueDivision** (`league_divisions`):
  - `id` (divisionId), `leagueId`, `tierLevel` (Int, 1 = top), `sport`, `name` (optional).
  - Unique `(leagueId, tierLevel)`. Index `leagueId`.
- **PromotionRule** (`promotion_rules`):
  - `id` (ruleId), `leagueId`, `fromTierLevel`, `toTierLevel`, `promoteCount`, `relegateCount`.
  - Unique `(leagueId, fromTierLevel, toTierLevel)`. Index `leagueId`.
  - Semantics: top `promoteCount` from `toTierLevel` (lower tier) promote to `fromTierLevel`; bottom `relegateCount` from `fromTierLevel` relegate to `toTierLevel`.
- **LeagueTeam:** Added optional `divisionId` (FK to LeagueDivision, ON DELETE SET NULL). Index `divisionId`.

Migration: `20260326000000_add_promotion_relegation`. Apply with `npm run db:migrate:deploy` or `.\scripts\apply-migrations.ps1`.

---

## 3. UI Integration

- **Divisions tab:** New “Divisions” tab in the league shell. Renders `DivisionsTab`:
  - Lists divisions (from GET `/api/leagues/[leagueId]/divisions`). Division buttons show name and team count.
  - Selecting a division loads GET `/api/leagues/[leagueId]/divisions/[divisionId]/standings` and shows a standings table with columns: #, Team, Owner, W-L-T, PF, Zone.
  - **Promotion indicators:** “Promotion” (green) and “Relegation” (red) badges in the Zone column when a promotion rule exists for that tier.
  - **Season end transitions:** “Season end transition” section with “Dry run” and “Run promotion / relegation” buttons. Results show planned or applied moves (team name, type, to tier).
- **APIs used:** GET divisions, GET division standings, POST promotion/run (body: dryRun). Optional: POST divisions/create, POST promotion/rules/create for commissioner setup.

---

## 4. Audit Results

| Location | Element | Handler | State / API | Result |
|----------|--------|---------|-------------|--------|
| League shell | Divisions tab | onChange('Divisions') | Renders DivisionsTab | OK |
| DivisionsTab | Division buttons | setSelectedDivisionId(d.divisionId) | Refetch standings for selected division | OK |
| DivisionsTab | Division standings | — | GET divisions/[divisionId]/standings | OK |
| DivisionsTab | Promotion / Relegation badges | — | inPromotionZone, inRelegationZone from standings | OK |
| DivisionsTab | Dry run button | handleRunSeasonEnd(true) | POST promotion/run { dryRun: true } | OK |
| DivisionsTab | Run promotion / relegation button | handleRunSeasonEnd(false) | POST promotion/run { dryRun: false }; refresh divisions | OK |
| DivisionsTab | Run result | setRunResult | Shows transitions list and “Applied” or “Planned” | OK |

**Division views:** Division list and per-division standings with zone indicators are wired. **Promotion indicators:** Shown in standings table Zone column. **Season end transitions:** Dry run and apply buttons call promotion run API and display result.

---

## 5. QA Checklist

- [ ] Open league → Divisions tab. With no divisions, empty state shows.
- [ ] Create divisions via API or seed: POST divisions/create (tierLevel, sport, name). Confirm they appear in Divisions tab.
- [ ] Create promotion rule: POST promotion/rules/create (fromTierLevel, toTierLevel, promoteCount, relegateCount). Confirm standings for affected divisions show Promotion / Relegation zones.
- [ ] Assign teams to divisions (LeagueTeam.divisionId) and set ranks/points. Select a division; confirm standings and zone badges (top N = Promotion, bottom N = Relegation).
- [ ] Click “Dry run”; confirm response shows planned moves (no DB change). Click “Run promotion / relegation”; confirm moves applied and division membership updated; refresh and confirm new standings.
- [ ] Verify GET /api/leagues/[leagueId]/divisions returns divisions; GET .../divisions/[id]/standings returns standings and zone flags; POST .../promotion/run returns transitions and applies when dryRun is false.
- [ ] Confirm no regression to Standings, League, or other tabs.
