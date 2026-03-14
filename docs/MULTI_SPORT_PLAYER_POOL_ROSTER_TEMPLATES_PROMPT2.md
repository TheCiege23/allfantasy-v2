# Multi-Sport Player Pool & Roster Templates (Prompt 2)

This document describes the **universal player pool** and **roster template** system in AllFantasy, supporting NFL, NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer while preserving existing NFL behavior.

---

## 1. Universal Player Pool Architecture

### 1.1 Universal Player Model

The canonical shape for a player in the multi-sport system is **`UniversalPlayerRecord`** (alias of `PoolPlayerRecord` in `lib/sport-teams/types.ts`):

| Field | Type | Description |
|-------|------|-------------|
| `player_id` | string | Primary key (SportsPlayer.id) |
| `sport_type` | SportType | NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER |
| `external_source_id` | string \| null | Sleeper/API external ID |
| `full_name` | string | Display name |
| `team` | string \| null | Team abbreviation (from `team_abbreviation`) |
| `position` | string | Primary position |
| `secondary_positions` | string[] | Optional; empty until ingestion supports it |
| `status` | string \| null | Active/inactive etc. |
| `injury_status` | string \| null | Optional; null until populated from source |
| `age` | number \| null | From SportsPlayer when available |
| `experience` | number \| null | Optional; null until added to schema/ingestion |
| `metadata` | Record<string, unknown> | Optional; empty object until used |

`team_id` and `team_abbreviation` are also on the record for roster/display; “team” in the table above is the display team (abbreviation).

### 1.2 Data Flow

- **Source of truth:** `SportsPlayer` (Prisma) and optionally `PlayerIdentityMap` for cross-source IDs.
- **Sport-scoped pool:** `SportPlayerPoolResolver.getPlayerPoolForSport(sportType, options)` reads from `SportsPlayer` filtered by `sport`, and maps rows to `PoolPlayerRecord` (and thus `UniversalPlayerRecord`). It now includes `age`; `experience`, `secondary_positions`, and `metadata` are placeholders (null/[]/{}).
- **League-scoped pool:** `getPlayerPoolForLeague(leagueId, leagueSport, options)` uses the league’s sport to return the same shape for draft room and waiver wire.

### 1.3 UniversalPlayerService

**Location:** `lib/sport-teams/UniversalPlayerService.ts`

- **`getUniversalPlayerPoolForSport(sportType, options?)`**  
  Returns `UniversalPlayerRecord[]` for a sport. Used for sport-level filtering and multi-sport ingestion readiness.

- **`getUniversalPlayerPoolForLeague(leagueId, leagueSport, options?)`**  
  Returns `UniversalPlayerRecord[]` for a league. Used for draft room and waiver wire when the league is known.

Both delegate to `SportPlayerPoolResolver` and expose the universal DTO. Optional filters: `limit`, `teamId`, `position`.

### 1.4 Other Pool Components

- **SportPlayerPoolResolver** – Builds pool from DB; used by UniversalPlayerService and LeaguePlayerPoolBootstrapService.
- **LeaguePlayerPoolBootstrapService** – Ensures a league’s player pool is available (e.g. at league creation); calls `getPlayerPoolForLeague`.
- **isPlayerInSportPool(playerIdOrExternalId, sportType)** – Checks membership in a sport’s pool (SportsPlayer or PlayerIdentityMap).

### 1.5 Future Ingestion Readiness

To fully populate `secondary_positions`, `injury_status`, `experience`, and `metadata`:

- Add columns to `SportsPlayer` (or a single `metadata` Json) as needed.
- Update the mapping in `SportPlayerPoolResolver` and any ingestion pipelines to set these fields so `UniversalPlayerRecord` remains the single contract for consumers.

---

## 2. Roster Template Schema (Additions & Current Mapping)

### 2.1 Requested vs Current Prisma

| Requested | Prisma / Code | Notes |
|-----------|----------------|-------|
| template_id | RosterTemplate.id | ✓ |
| sport_type | RosterTemplate.sportType | ✓ |
| slot_name | RosterTemplateSlot.slotName | ✓ |
| allowed_positions | RosterTemplateSlot.allowedPositions (Json) | ✓ Array of strings |
| starter_count | RosterTemplateSlot.starterCount | ✓ |
| bench_count | RosterTemplateSlot.benchCount | ✓ |
| reserve_count | RosterTemplateSlot.reserveCount | ✓ (IR/reserve) |
| taxi_count | RosterTemplateSlot.taxiCount | ✓ |
| devy_count | RosterTemplateSlot.devyCount | ✓ |
| is_flexible_slot | RosterTemplateSlot.isFlexibleSlot | ✓ |

**LeagueRosterConfig:** `leagueId`, `templateId`, `overrides` (Json). No schema changes required for the requested fields.

### 2.2 RosterTemplate (Prisma)

- `id`, `sportType`, `name`, `formatType` (e.g. standard, IDP).
- Unique on `(sportType, formatType)`.
- Related: `RosterTemplateSlot[]`.

### 2.3 RosterTemplateSlot (Prisma)

- `templateId`, `slotName`, `allowedPositions` (Json), `starterCount`, `benchCount`, `reserveCount`, `taxiCount`, `devyCount`, `isFlexibleSlot`, `slotOrder`.

### 2.4 In-Memory Defaults vs DB

- **RosterTemplateService** and **RosterDefaultsRegistry** build slot definitions from **SportDefaultsRegistry** (e.g. `ROSTER_DEFAULTS`, `flex_definitions`). Templates can be persisted via `getOrCreateLeagueRosterConfig` / bootstrap; if no DB template exists, the system uses in-memory defaults keyed by `(sportType, formatType)` so all sports (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER) and formats (e.g. IDP) are supported without schema additions.

---

## 3. Roster Validation Logic

### 3.1 RosterValidationEngine

**Location:** `lib/roster-defaults/RosterValidationEngine.ts`

- **`validateRoster(sportType, assignments, formatType?)`**  
  - Loads template via `getRosterTemplateDefinition(sportType, formatType)`.
  - For each slot: checks assigned count ≤ max and that each assignment’s position is allowed for that slot (via `PositionEligibilityResolver`).
  - Checks total roster size vs template totals (starters + bench + IR + taxi + devy).
  - Returns `{ valid, errors, slotCounts }`.

- **`canAddPlayerToSlot(sportType, slotName, position, currentAssignments, formatType?)`**  
  - Returns whether adding the player is allowed (slot exists, not over count, position eligible).

Used by: lineup editing, waiver eligibility checks, and trade validation when integrating with roster slots.

### 3.2 EligiblePositionResolver (PositionEligibilityResolver)

**Location:** `lib/roster-defaults/PositionEligibilityResolver.ts`

- **`getAllowedPositionsForSlot(sportType, slotName, formatType?)`** – Allowed positions for a slot (handles `*` for “any”).
- **`isPositionEligibleForSlot(sportType, slotName, position, formatType?)`** – Boolean eligibility (e.g. UTIL, G, F, P, SUPERFLEX).
- **`getPositionsForSport(sportType, formatType?)`** – All positions for the sport (for draft room filter list).

Slot definitions and flex rules come from `RosterDefaultsRegistry` → `SportDefaultsRegistry` (including flex_definitions for UTIL, G, F, FLEX, P, SUPERFLEX, IDP slots).

### 3.3 Where to Call Validation

- **Lineup submit:** Before saving, build `RosterAssignment[]` from lineup and call `validateRoster(league.sport, assignments, league.formatType)`.
- **Waiver add:** Before adding a player to a slot, call `canAddPlayerToSlot(sport, slotName, position, currentAssignments, formatType)`.
- **Trades:** Validate both rosters after the trade with `validateRoster`.

---

## 4. Draft and Waiver Integration Points

### 4.1 Draft Room

- **Player pool:** Use `getUniversalPlayerPoolForLeague(leagueId, league.sport, { limit, position })` or `getPlayerPoolForLeague(...)` so the pool is sport-scoped.
- **Position filter:** Use `getPositionsForSport(league.sport, formatType)` (from `PositionEligibilityResolver` or `SportRegistry`) to build the position dropdown/list.
- **Slots / template:** Use `getLeagueRosterTemplate(leagueSport, formatType)` or `RosterTemplateResolver.resolveRosterTemplateForLeague(leagueId, leagueSport, formatType)` for slot list and counts (e.g. “1 QB, 2 RB, …”).
- **Mock draft:** The mock-draft engine’s `validateRosterConstraints` is position-cap based; for full slot-aware validation, draft room or backend can also build assignments and call `validateRoster` when needed.

### 4.2 Waiver Wire

- **Available players:** Waiver API already uses `league.sport` and `sportsPlayer` filtered by sport; can be switched to `getUniversalPlayerPoolForLeague` or `getPlayerPoolForLeague` and then exclude rostered IDs for consistency and future filtering (e.g. by position/slot).
- **Eligibility:** When a user claims a player and assigns to a slot, validate with `canAddPlayerToSlot(sport, slotName, player.position, currentRosterAssignments, formatType)` and optionally `validateRoster` after the add.

**Waiver API:** `app/api/waiver-wire/leagues/[leagueId]/players/route.ts` – uses `league.sport`, queries `sportsPlayer` by sport, excludes rostered IDs. No change required for basic behavior; recommended enhancement is to use the universal pool and add slot/position validation on add.

---

## 5. Supported Positions (Reference)

| Sport | Positions |
|-------|-----------|
| NFL | QB, RB, WR, TE, K, DST |
| NBA | PG, SG, SF, PF, C, G, F, UTIL |
| MLB | SP, RP, P, C, 1B, 2B, 3B, SS, OF, DH, UTIL |
| NHL | C, LW, RW, D, G, UTIL |
| NCAA Football | QB, RB, WR, TE, K, DST, SUPERFLEX (if supported by league) |
| NCAA Basketball | G, F, C, UTIL |
| Soccer | GKP, DEF, MID, FWD, UTIL |

NFL IDP: add DE, DT, LB, CB, S; slots may include DL, DB, IDP_FLEX. Defined in `SportRegistry` and `SportDefaultsRegistry`.

---

## 6. Core Modules Summary

| Module | Location | Role |
|--------|----------|------|
| **UniversalPlayerService** | lib/sport-teams/UniversalPlayerService.ts | Exposes universal player DTO and sport/league-scoped pools |
| **RosterTemplateService** | lib/multi-sport/RosterTemplateService.ts | Get/create roster templates by sport and format |
| **RosterValidationEngine** | lib/roster-defaults/RosterValidationEngine.ts | validateRoster, canAddPlayerToSlot |
| **EligiblePositionResolver** | lib/roster-defaults/PositionEligibilityResolver.ts | Slot eligibility and positions per sport |
| **LeagueRosterInitializer** | lib/roster-defaults/LeagueRosterBootstrapService.ts | Bootstrap league roster config after creation |

---

## 7. Roster Template System Explanation

- **Templates** define, per sport (and optionally format like IDP), how many of each slot exist (e.g. QB: 1, RB: 2, FLEX: 1, BENCH: 7, IR: 2) and which positions can fill each slot. Flexible slots (FLEX, UTIL, G, F, P, SUPERFLEX) have `allowedPositions` listing multiple positions.
- **LeagueRosterConfig** links a league to a template (by `templateId`) and optional `overrides`. At league creation, **LeagueRosterBootstrapService** (or orchestrator) ensures a config exists so draft, waiver, and lineup use the correct slots.
- **Validation** uses the resolved template (from DB or in-memory defaults) to ensure roster actions respect slot counts and position eligibility. The same template drives draft room slot list, waiver slot selection, and lineup validation.

---

## 8. QA Checklist

- [ ] **NFL league:** Create league, open draft room; pool is NFL-only; positions show QB, RB, WR, TE, K, DST; roster template shows correct starter/bench/IR slots.
- [ ] **NBA league:** Same; pool is NBA; positions include PG, SG, SF, PF, C, G, F, UTIL; template matches SportDefaultsRegistry.
- [ ] **MLB / NHL / NCAAF / NCAAB:** Create one league per sport; confirm pool and position list match SportRegistry and roster defaults.
- [ ] **Waiver:** In a league, open waiver wire; available list is sport-scoped and excludes rostered players; (when implemented) adding a player to a slot checks position eligibility.
- [ ] **Lineup:** Submit lineup; (when wired) backend validates via `validateRoster` for that league’s sport and format.
- [ ] **UniversalPlayerService:** `getUniversalPlayerPoolForSport('NFL')` and `getUniversalPlayerPoolForLeague(leagueId, 'NFL')` return records with `player_id`, `sport_type`, `full_name`, `position`, `team`, `age` (if present), and optional fields as null/[]/{}.
- [ ] **IDP (NFL):** Create NFL IDP league; positions include DE, DT, LB, CB, S; roster template includes IDP slots; validation allows only those positions in IDP slots.
- [ ] **League creation:** After creating a league, LeagueRosterConfig exists (or in-memory template is used) and getLeagueRosterTemplate returns the correct slots for that sport/format.

---

*Document generated for Prompt 2 — Multi-Sport Player Pool and Roster Templates. Existing NFL player, roster, draft, and waiver behavior is preserved; universal model and services are ready for multi-sport ingestion and sport-aware roster rendering.*
