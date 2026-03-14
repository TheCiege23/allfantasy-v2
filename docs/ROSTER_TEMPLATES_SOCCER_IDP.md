# Default Roster Templates: Soccer and NFL IDP

## Overview

Default roster templates ensure **Soccer** leagues start with soccer-specific slots (GK/GKP, DEF, MID, FWD, UTIL, BENCH, IR) and **NFL IDP** leagues start with offensive plus defensive slots (including DL, DE, DT, LB, DB, CB, S, IDP_FLEX). The same validation, lineup editor, draft room, and waiver logic use these templates so that slot counts and position eligibility are consistent.

## Roster defaults architecture

- **SportDefaultsRegistry** — Per-sport (and per-format for NFL) roster defaults: `starter_slots`, `bench_slots`, `IR_slots`, `flex_definitions`. `getRosterDefaults(sportType, formatType?)` returns base defaults; for NFL with `formatType === 'IDP'` it merges the IDP overlay (DE, DT, LB, CB, S) and adds DL, DB, IDP_FLEX to starter_slots and flex_definitions.
- **RosterDefaultsRegistry** — Builds a **RosterTemplateDefinition** (ordered slots, counts, allowed positions) from SportDefaultsRegistry. `getRosterTemplateDefinition(sportType, formatType?)` is the single entry for “what slots does this sport/format have.” Used by validation and eligibility. BENCH allowed positions are derived from all player positions (union of flex allowedPositions and non-flex slot names) so IDP BENCH includes DE, DT, LB, CB, S.
- **RosterTemplateService (multi-sport)** — In-memory default templates when no DB template exists. `defaultSlotsForSport(sportType, formatType)` returns:
  - **NFL:** `defaultNflSlots()` for standard/PPR; `defaultNflIdpSlots()` for IDP.
  - **SOCCER:** `defaultSoccerSlots()` (GKP, DEF, MID, FWD, UTIL, BENCH, IR; GKP allows GK alias).
- **LeagueRosterBootstrapService** — Uses `resolveLeagueRosterConfig` and `getRosterTemplateForLeague` with the league’s `formatType` (e.g. 'IDP' for IDP leagues). League create passes format from `leagueVariant` so IDP leagues get the IDP template at bootstrap.

## Soccer roster template

- **Positions (SportRegistry):** GKP, DEF, MID, FWD, UTIL. GKP = Goalkeeper; “GK” is accepted as an alias for the GKP slot in eligibility.
- **Default starter slots:** GKP 1, DEF 4, MID 4, FWD 2, UTIL 1. UTIL is flexible (GKP, DEF, MID, FWD).
- **BENCH:** 4 slots; all positions allowed.
- **IR:** 1 slot; all positions allowed.
- **Customization:** Structure is in SportDefaultsRegistry and RosterTemplateService; commissioner overrides can be supported later via LeagueRosterConfig overrides.

## NFL IDP roster template

- **Offense (unchanged):** QB 1, RB 2, WR 2, TE 1, FLEX 1, K 1, DST 1, BENCH 7, IR 2.
- **IDP fixed slots:** DE 2, DT 1, LB 2, CB 2, S 2 (player position = slot name).
- **IDP flexible slots:**
  - **DL:** 1 slot; allowed positions DE, DT.
  - **DB:** 1 slot; allowed positions CB, S.
  - **IDP_FLEX:** 1 slot; allowed positions DE, DT, LB, CB, S.
- **BENCH / IR:** Same counts as standard NFL; allowed positions include all offensive and IDP positions (QB, RB, WR, TE, K, DST, DE, DT, LB, CB, S).
- **Flexible defensive mapping:** DL and DB provide position-group flex; IDP_FLEX allows any IDP. Validation and lineup logic use these allowed-position lists.

## Validation and eligibility

- **RosterValidationEngine:** `validateRoster(sportType, assignments, formatType?)` and `canAddPlayerToSlot(..., formatType?)` use `getRosterTemplateDefinition(sportType, formatType)`. When `formatType` is `'IDP'`, IDP slots and position rules are enforced.
- **PositionEligibilityResolver:** `getAllowedPositionsForSlot(sport, slot, formatType?)`, `isPositionEligibleForSlot(sport, slot, position, formatType?)`, `getPositionsForSport(sport, formatType?)` all take optional `formatType`. For NFL IDP, DL/DB/IDP_FLEX resolve to the correct allowed positions; for Soccer, GKP accepts both GKP and GK.
- **MultiSportRosterService:** `isPositionAllowedForSport(sport, position, formatType?)` uses `getPositionsForSport(sportType, formatType)` so IDP positions are allowed when format is IDP.

## Draft room and waivers

- **Slot list:** From `getRosterTemplate(sportType, formatType)` or `getRosterTemplateDefinition(sportType, formatType)`. For IDP leagues, pass `formatType === 'IDP'` so the slot list includes IDP slots.
- **Position filtering:** Use `getPositionsForSport(sportType, formatType)` (from SportRegistry or from PositionEligibilityResolver’s template-based list) so IDP leagues show DE, DT, LB, CB, S in filters.
- **Waiver eligibility:** Same template and eligibility rules; IDP players can fill IDP slots and BENCH/IR when league is IDP.

## Lineup editor

- Lineup editor should resolve the league’s roster template (sport + format from league) and render slots in template order. Validation on submit should use `validateRoster(sport, assignments, formatType)` with the league’s format so Soccer and NFL IDP lineups are validated against the correct template.

## Summary

| Area | Soccer | NFL IDP |
|------|--------|---------|
| **Template source** | RosterTemplateService.defaultSoccerSlots; SportDefaultsRegistry SOCCER | RosterTemplateService.defaultNflIdpSlots; SportDefaultsRegistry getRosterDefaults(NFL, 'IDP') |
| **Key slots** | GKP, DEF, MID, FWD, UTIL, BENCH, IR | Offense + DE, DT, LB, CB, S + DL, DB, IDP_FLEX + BENCH, IR |
| **Format type** | standard | IDP |
| **Validation** | validateRoster(SOCCER, …, undefined) | validateRoster(NFL, …, 'IDP') |
| **Eligibility** | GKP slot accepts GKP or GK | DL/DB/IDP_FLEX use allowedPositions; IDP positions in BENCH/IR |

Existing NFL (non-IDP) behavior is unchanged: standard/PPR templates have no IDP slots, and callers that do not pass `formatType` continue to get the standard template.
