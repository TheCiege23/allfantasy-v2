# Default Roster Settings by Sport

## Architecture

- **RosterDefaultsRegistry** (`lib/roster-defaults/RosterDefaultsRegistry.ts`) — Builds full roster template definitions from `SportDefaultsRegistry.getRosterDefaults(sport)`. Exposes `getRosterTemplateDefinition(sport)` and `getSlotNamesForSport(sport)` for a single canonical shape (starter slots, bench, IR, flex, utility, superflex, taxi/devy where applicable).
- **RosterTemplateResolver** (`lib/roster-defaults/RosterTemplateResolver.ts`) — Resolves the roster template for a sport (or league) by calling `RosterTemplateService.getRosterTemplate()`. Use for league creation, draft room slot list, and lineup/waiver rules.
- **PositionEligibilityResolver** (`lib/roster-defaults/PositionEligibilityResolver.ts`) — `getAllowedPositionsForSlot(sport, slotName)`, `isPositionEligibleForSlot(...)`, `getPositionsForSport(sport)`. Used by draft room filters, waiver eligibility, and lineup validation.
- **RosterValidationEngine** (`lib/roster-defaults/RosterValidationEngine.ts`) — `validateRoster(sport, assignments)` and `canAddPlayerToSlot(...)`. Validates roster against the sport template (slot counts and position eligibility).
- **LeagueRosterBootstrapService** (`lib/roster-defaults/LeagueRosterBootstrapService.ts`) — `bootstrapLeagueRoster(leagueId, leagueSport, format?)` ensures a league has a roster config and returns the resolved template. Optional alternative to `attachRosterConfigForLeague` when the caller needs the full template DTO.

League creation continues to use `attachRosterConfigForLeague(leagueId, sport, scoring)` so the league has a roster config; in-memory defaults now include **DST** and **IR** for NFL and **IR** for other sports (from `SportDefaultsRegistry`).

## Per-sport roster template definitions

Defined in `lib/sport-defaults/SportDefaultsRegistry.ts` (`ROSTER_DEFAULTS`) and reflected in `RosterTemplateService` in-memory defaults:

| Sport | Starter slots | Bench | IR | Flex/utility/superflex | Notes |
|-------|----------------|-------|----|------------------------|-------|
| **NFL** | QB, RB×2, WR×2, TE, FLEX, K, DST | 7 | 2 | FLEX (RB/WR/TE) | |
| **NBA** | PG, SG, SF, PF, C, G, F, UTIL | 4 | 1 | G (PG/SG), F (SF/PF), UTIL (all) | |
| **MLB** | C, 1B, 2B, 3B, SS, OF×3, UTIL, P×2 | 6 | 1 | UTIL (C/1B/2B/3B/SS/OF) | |
| **NHL** | C×2, LW×2, RW×2, D×2, G, UTIL | 6 | 1 | UTIL (C/LW/RW/D) | |
| **NCAAF** | QB, RB×2, WR×2, TE, FLEX, SUPERFLEX, K, DST | 7 | 2 | FLEX, SUPERFLEX (QB/RB/WR/TE) | |
| **NCAAB** | G×2, F×2, C, UTIL | 4 | 1 | UTIL (G/F/C) | |

## Validation and eligibility

- **Validation:** Use `RosterValidationEngine.validateRoster(sport, assignments)` to check a list of `{ playerId, position, slotName }` against the sport template. Use `canAddPlayerToSlot(sport, slotName, position, currentAssignments)` before adding a player.
- **Eligibility:** Use `PositionEligibilityResolver.getAllowedPositionsForSlot(sport, slotName)` and `isPositionEligibleForSlot(sport, slotName, position)`. Draft room and waiver wire should filter positions with `getPositionsForSport(sport)` and per-slot eligibility.

## Draft and waiver integration

- **Draft room:** Use `getPositionsForSport(sport)` or the resolved template slots (from `resolveRosterTemplate(sport)` or `getRosterTemplateForLeague(leagueSport)`) so position filters are sport-specific. Slot list comes from `RosterDefaultsRegistry.getSlotNamesForSport(sport)` or the template DTO.
- **Waiver:** Apply the same roster rules via `RosterValidationEngine.validateRoster` or `canAddPlayerToSlot` so waiver eligibility is sport-aware (slot caps and position eligibility).

## QA checklist

- [ ] **League creation** — Creating a league with each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB) loads the correct roster template (starter + bench + IR where defined); no regression to NFL.
- [ ] **NFL defaults** — NFL league shows QB, RB, WR, TE, FLEX, K, **DST**, BENCH, **IR** (2).
- [ ] **Draft room** — Draft room only shows positions valid for the league’s sport; slot list matches the template.
- [ ] **Waiver** — Waiver wire respects sport-specific roster rules (slot counts and position eligibility).
- [ ] **Lineup editing** — Lineup/roster UI is sport-aware (correct slots and allowed positions per slot).
- [ ] **Roster rendering** — Frontend roster view shows the correct slots and labels by sport.
