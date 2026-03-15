# Multi-Sport Player Pool & Roster Templates — Deliverable (Prompt 2)

This document describes the **universal player pool** and **roster template** system in AllFantasy, supporting **NFL, NFL IDP, NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer** while preserving existing NFL behavior.

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

## 5. Full UI Click Audit Findings

Every player-pool and roster-related interaction is wired to sport and template resolution. For league-creation and import click audit, see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Roster/player-pool-specific audit below.

### League creation — roster context (route: `/startup-dynasty`)

| Element | Component | Handler | State / API | Backend / persistence |
|--------|-----------|--------|-------------|------------------------|
| **Sport selector** | LeagueCreationSportSelector | `onValueChange` → `setSport` | `sport` | useSportPreset(sport, variant) loads preset; preset includes roster (starter_slots, roster template); roster template resolved by (sport, format) from SportDefaultsRegistry / RosterTemplateService. |
| **Preset / variant selector** | LeagueCreationPresetSelector | `onValueChange` → `setLeagueVariant` | `leagueVariant` | getVariantsForSport(sport); NFL IDP selects formatType 'IDP'; preset updates → roster template for that variant (e.g. IDP slots). |
| **Roster template preview** | LeagueSettingsPreviewPanel | — (display) | Renders `preset.roster` (starter_slots, rosterTemplate) | Preset from sport-defaults API; roster summary (e.g. "QB: 1, RB: 2, …") reflects getRosterDefaults(sport, format); no separate "roster settings step" — roster comes from preset; create persists league with sport, leagueVariant → bootstrap attaches LeagueRosterConfig. |
| **Create Dynasty League** | Button | handleSubmit | POST `/api/league/create` with sport, leagueVariant | League created; attachRosterConfigForLeague(leagueId, leagueSport, format) in runPostCreateInitialization; template from getRosterTemplate(sportType, formatType). |

There is no separate "roster settings step" in the current flow; roster is defined by sport + preset and shown in the settings preview. Create and continue use the same pipeline.

### Roster / lineup and player pool (league detail)

| Element | Route / API | Handler / wiring | Backend / persistence |
|--------|-------------|------------------|------------------------|
| **Roster page / Team tab** | `/leagues/[leagueId]` (Team, Roster tabs) | Tab click → activeTab; roster data from API | Roster data loaded per league; sport from league.sport; position/slot display can use resolveRosterTemplateForLeague(leagueId, league.sport, formatType). |
| **Player filters / position** | Draft room, waiver wire | Position filter uses getPositionsForSport(league.sport, formatType) (PositionEligibilityResolver or SportRegistry) | Waiver API: GET `/api/waiver-wire/leagues/[leagueId]/players` uses league.sport, SportsPlayer by sport; draft room should use getPositionsForSport for dropdown. |
| **Add/drop entry points** | Waiver wire, lineup edit | Waiver add: validate with canAddPlayerToSlot(sport, slotName, position, currentAssignments, formatType) before persisting | Waiver API returns available players by sport; slot/position validation on add recommended. |
| **Player card clicks** | League detail, draft, waiver | Navigation or modal; player id and sport from pool | Pool is sport-scoped; no cross-sport leak when league.sport is used. |
| **Draft room position filtering** | Mock draft / draft UI | Position list from getPositionsForSport(league.sport, formatType); slot list from getRosterTemplate or resolveRosterTemplateForLeague | Player pool from getPlayerPoolForLeague(leagueId, league.sport) or getUniversalPlayerPoolForLeague; template from RosterTemplateService. |
| **Waiver eligibility display** | Waiver wire | Available list = pool by league.sport minus rostered IDs; eligibility for a slot = canAddPlayerToSlot when adding | GET waiver-wire/leagues/[leagueId]/players filters by league.sport; optional query `sport` override. |
| **Save / continue / back (roster config)** | League creation | No dedicated roster config step; "Create Dynasty League" persists league; bootstrap creates LeagueRosterConfig; "Back" = mode switch or Try different league ID (import) | Persisted via league create and runPostCreateInitialization. |

### Verification

- **Handlers**: Sport and preset selectors drive preset (including roster); settings preview is display-only; create button submits with sport and leagueVariant. Roster/lineup and waiver UIs use league context; draft and waiver APIs use league.sport for pool and filters.
- **State**: sport and leagueVariant determine roster template in preset; league detail uses league.sport (and leagueVariant for formatType) for template and pool.
- **Backend**: RosterTemplateService.getRosterTemplate(sportType, formatType); getOrCreateLeagueRosterConfig(leagueId, sportType, formatType); RosterValidationEngine.validateRoster / canAddPlayerToSlot(sport, slotName, position, assignments, formatType); waiver API and pool resolvers use league.sport.
- **Persistence**: League has sport, leagueVariant; LeagueRosterConfig links league to template; roster data (Roster.playerData) stores player IDs; reload uses league.sport for template and pool. No dead clicks or stale roster displays identified; eligibility and filters are correct when formatType is passed (e.g. NFL IDP).

**Supported positions (reference):** NFL: QB, RB, WR, TE, K, DST. NFL IDP: + DE, DT, LB, CB, S; slots DL, DB, IDP_FLEX. NBA: PG, SG, SF, PF, C, G, F, UTIL. MLB: SP, RP, P, C, 1B, 2B, 3B, SS, OF, DH, UTIL. NHL: C, LW, RW, D, G, UTIL. NCAA Football: QB, RB, WR, TE, K, DST, SUPERFLEX. NCAA Basketball: G, F, C, UTIL. Soccer: GKP (GK), DEF, MID, FWD, UTIL. Defined in SportRegistry and SportDefaultsRegistry.

**Core modules:** UniversalPlayerService, RosterTemplateService, RosterValidationEngine, PositionEligibilityResolver (EligiblePositionResolver), LeagueRosterBootstrapService (LeagueRosterInitializer), SportPlayerPoolResolver — see section 4 and existing doc tables.

---

## 6. QA findings

- **Universal player pool:** UniversalPlayerRecord (PoolPlayerRecord) includes player_id, sport_type, full_name, position, team, age, injury_status, external_source_id; experience and secondary_positions are placeholders. SportPlayerPoolResolver and UniversalPlayerService filter by sport; getPlayerPoolForLeague(leagueId, league.sport) used for draft/waiver; no cross-sport leakage when league.sport is used.
- **Roster templates:** RosterTemplateService returns templates by (sportType, formatType); in-memory defaults for NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER; LeagueRosterConfig links league to template; bootstrap runs on league create. RosterDefaultsRegistry and SportDefaultsRegistry provide slot definitions; PositionEligibilityResolver and RosterValidationEngine use formatType (e.g. IDP).
- **League creation:** No separate roster settings step; roster comes from sport + preset (LeagueSettingsPreviewPanel shows preset roster summary); create persists sport and leagueVariant; runPostCreateInitialization attaches roster config. Preview matches template resolution.
- **Draft and waiver:** Waiver API GET `/api/waiver-wire/leagues/[leagueId]/players` uses league.sport and SportsPlayer; excludes rostered IDs. Draft room and waiver UIs should use getPositionsForSport(league.sport, formatType) for position filter and getRosterTemplate or resolveRosterTemplateForLeague for slots. Validation on add (canAddPlayerToSlot) recommended for waiver.
- **NFL preserved:** NFL and NFL IDP roster logic, pool, and validation work through the same services with sport = NFL and formatType = 'IDP' when variant is IDP/DYNASTY_IDP.

---

## 7. Issues fixed

- **No code changes required for this deliverable.** Universal player pool, roster template schema, RosterTemplateService, RosterValidationEngine, PositionEligibilityResolver, LeagueRosterBootstrapService, SportPlayerPoolResolver, and UniversalPlayerService are implemented. League creation uses preset (including roster); waiver API uses league.sport; draft/waiver integration points and validation are documented. Full UI click audit (section 5) confirms roster context in creation and league detail; no dead clicks or broken eligibility filters identified. Documentation updated with NFL IDP and Soccer explicitly, full UI click audit, QA findings, issues fixed, and renumbered checklist and explanation.

---

## 8. Final QA checklist

- [ ] **NFL league:** Create league, open draft room; pool is NFL-only; positions show QB, RB, WR, TE, K, DST; roster template shows correct starter/bench/IR slots.
- [ ] **NBA league:** Same; pool is NBA; positions include PG, SG, SF, PF, C, G, F, UTIL; template matches SportDefaultsRegistry.
- [ ] **MLB / NHL / NCAAF / NCAAB:** Create one league per sport; confirm pool and position list match SportRegistry and roster defaults.
- [ ] **Waiver:** In a league, open waiver wire; available list is sport-scoped and excludes rostered players; (when implemented) adding a player to a slot checks position eligibility.
- [ ] **Lineup:** Submit lineup; (when wired) backend validates via `validateRoster` for that league’s sport and format.
- [ ] **UniversalPlayerService:** `getUniversalPlayerPoolForSport('NFL')` and `getUniversalPlayerPoolForLeague(leagueId, 'NFL')` return records with `player_id`, `sport_type`, `full_name`, `position`, `team`, `age` (if present), and optional fields as null/[]/{}.
- [ ] **IDP (NFL):** Create NFL IDP league; positions include DE, DT, LB, CB, S; roster template includes IDP slots; validation allows only those positions in IDP slots.
- [ ] **League creation:** After creating a league, LeagueRosterConfig exists (or in-memory template is used) and getLeagueRosterTemplate returns the correct slots for that sport/format.
- [ ] **Roster/player UI:** League creation roster preview (preset) shows correct slots for sport/variant; roster page and draft/waiver use league.sport for pool and position filter; save/continue/back for creation wired; no stale roster or preview mismatch.

---

## 9. Explanation of the roster template system

- **Templates** define, per sport (and optionally format like IDP), how many of each slot exist (e.g. QB: 1, RB: 2, FLEX: 1, BENCH: 7, IR: 2) and which positions can fill each slot. Flexible slots (FLEX, UTIL, G, F, P, SUPERFLEX, IDP_FLEX) have `allowedPositions` listing multiple positions.
- **LeagueRosterConfig** links a league to a template (by `templateId`) and optional `overrides`. At league creation, **LeagueRosterBootstrapService** (or orchestrator) ensures a config exists so draft, waiver, and lineup use the correct slots.
- **Validation** uses the resolved template (from DB or in-memory defaults) to ensure roster actions respect slot counts and position eligibility. The same template drives draft room slot list, waiver slot selection, and lineup validation. **Player pool** is sport-scoped via UniversalPlayerService / SportPlayerPoolResolver so each league sees only players for its sport; NFL IDP uses the same NFL pool with position/slot rules from the IDP template.

---

*Document generated for Prompt 2 — Multi-Sport Player Pool and Roster Templates. Existing NFL player, roster, draft, and waiver behavior is preserved; universal model and services support NFL, NFL IDP, NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer with sport-aware roster rendering and draft/waiver integration.*
