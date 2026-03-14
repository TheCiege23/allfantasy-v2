# Soccer and NFL IDP Architecture

## Overview

The platform supports **Soccer** as a full sport and **NFL IDP** (Individual Defensive Player) as an NFL-specific league variant. The data model uses both **sport_type** and **league_variant** so that:

- **Soccer** behaves like a full sport (players, teams, logos, roster, scoring, schedule, draft, waiver).
- **NFL IDP** behaves as an NFL preset that adds IDP roster slots, IDP scoring, and IDP player-pool/lineup behavior without breaking existing NFL standard leagues.

## Data Model

### sport_type vs league_variant

| Concept | Where | Examples |
|--------|--------|----------|
| **sport_type** | `League.sport` (LeagueSport enum), `RosterTemplate.sportType`, `ScoringTemplate.sportType` | `NFL`, `SOCCER`, `NBA`, … |
| **league_variant** | `League.leagueVariant` (optional string, max 32) | `STANDARD`, `PPR`, `IDP`, `DYNASTY_IDP` for NFL; `STANDARD` for Soccer |

Examples:

- `sport_type = NFL`, `league_variant = IDP` → NFL IDP league (IDP slots + IDP scoring).
- `sport_type = NFL`, `league_variant = DYNASTY_IDP` → Dynasty NFL IDP.
- `sport_type = SOCCER`, `league_variant = STANDARD` → Soccer league (standard roster/scoring).

### Schema

- **Prisma:** `League` has optional `leagueVariant` (String, VarChar 32). `LeagueSport` enum includes `SOCCER`.
- **Sport types:** `SportType` and `SPORT_TYPES` in `lib/sport-defaults/types.ts` include `SOCCER`. Multi-sport `sport-types.ts` maps SOCCER/MLS/FPL to `SOCCER`.

## Sport Registry and Defaults

### SportRegistry (multi-sport)

- **SOCCER** positions: GKP, DEF, MID, FWD, UTIL.
- **NFL IDP** positions: DE, DT, LB, CB, S (used when format is IDP).
- **DEFAULT_FORMAT_BY_SPORT:** SOCCER = `'standard'`.

### SportDefaultsRegistry (sport-defaults)

- **SOCCER** has full defaults: league, roster (GKP, DEF, MID, FWD, UTIL, BENCH, IR), scoring (SOCCER_STANDARD: goal, assist, clean_sheet, etc.), draft, waiver, team metadata.
- **NFL** base defaults unchanged; IDP is applied via **LeagueVariantRegistry** overlay and format type.

### LeagueVariantRegistry

- **NFL variants:** `STANDARD`, `PPR`, `HALF_PPR`, `SUPERFLEX`, `IDP`, `DYNASTY_IDP`.
- **Other sports:** single variant `STANDARD`.
- **Helpers:** `getFormatTypeForVariant(sport, variant)` (e.g. NFL + IDP → `'IDP'`), `getRosterOverlayForVariant(sport, variant)` (IDP adds DE, DT, LB, CB, S slots), `isIdpVariant(variant)`, `getVariantsForSport(sport)` for UI.

## League Preset Resolution

### LeaguePresetResolver

- **resolveLeaguePreset(leagueSport, leagueVariant):**  
  - Resolves `formatType` from variant (e.g. NFL + IDP → `'IDP'`).  
  - Merges IDP roster overlay into `rosterDefaults.starter_slots` when variant is IDP/DYNASTY_IDP.  
  - Loads **roster template** and **scoring template** by `(sportType, formatType)` (e.g. `getRosterTemplate('NFL','IDP')` returns IDP slots; `getScoringTemplate('NFL','IDP')` returns IDP rules).  
  - Returns `ResolvedLeaguePreset`: rosterDefaults, rosterTemplate, scoringTemplate, isIdp.

- **getScoringFormatForLeague(leagueSport, leagueVariant):** returns format type string for roster/scoring resolution.

### LeagueCreationDefaultsLoader

- **loadLeagueCreationDefaults(leagueSport, leagueVariant?):**  
  - When **NFL** and variant is **IDP** or **DYNASTY_IDP**, uses `resolveLeaguePreset()` and builds payload with IDP roster and scoring.  
  - Otherwise uses existing `getFullLeaguePreset(leagueSport)` (no variant).  
  - Payload includes optional `leagueVariant` for UI/API.

## Scoring and Roster Templates

### Scoring

- **ScoringDefaultsRegistry:** SOCCER has `SOCCER_STANDARD`; NFL has `NFL_IDP_RULES` (NFL_PPR + IDP stats). Keys `NFL-IDP` / `NFL-idp` and sport+format resolution return IDP template for NFL + IDP/DYNASTY_IDP.
- **getDefaultScoringTemplate(sport, format):** fallback logic uses IDP template for NFL+IDP and SOCCER template for SOCCER.

### Roster

- **RosterTemplateService:** `defaultNflIdpSlots()` = base NFL + IDP slots (DE, DT, LB, CB, S). `defaultSoccerSlots()` = GKP, DEF, MID, FWD, UTIL, BENCH, IR. `defaultSlotsForSport(sportType, formatType)` branches for NFL+IDP and SOCCER; in-memory default uses `formatType` so `getRosterTemplate('NFL','IDP')` returns IDP slots.

## League Creation Flow

1. **UI:** User selects sport (including Soccer) and, for NFL, league variant (STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP). `useSportPreset(sport, variant)` calls `GET /api/sport-defaults?sport=NFL&load=creation&variant=IDP` when variant is set.
2. **API sport-defaults:** `loadLeagueCreationDefaults(leagueSport, variant)` with optional `variant`/`leagueVariant` query param; returns roster, rosterTemplate, scoringTemplate, and metadata including `leagueVariant`.
3. **API league/create:** Request body accepts `sport` and optional `leagueVariant`. On create, `leagueVariant` is stored on `League`. When variant is IDP or DYNASTY_IDP, bootstrap format is set to `'IDP'` and passed to `runLeagueBootstrap` so roster/scoring config uses IDP templates.

## Integration Points

| Area | Usage |
|------|--------|
| **League create** | `leagueVariant` in body; stored on League; drives bootstrap format for IDP. |
| **League list/detail** | `leagueVariant` included in list select so UI can show or filter by variant. |
| **Sport defaults API** | `?sport=SOCCER` or `?sport=NFL&variant=IDP` → loadLeagueCreationDefaults(sport, variant). |
| **Roster/scoring resolution** | RosterTemplateService and ScoringTemplateResolver use (sportType, formatType); formatType comes from LeaguePresetResolver / getFormatTypeForVariant. |

## Backward Compatibility

- Existing NFL leagues without `leagueVariant` (or with STANDARD/PPR/etc.) behave as before; they use standard roster and scoring.
- League creation without `leagueVariant` uses existing `getFullLeaguePreset(leagueSport)` path.
- IDP and DYNASTY_IDP are opt-in via explicit variant selection and bootstrap format `'IDP'`.
