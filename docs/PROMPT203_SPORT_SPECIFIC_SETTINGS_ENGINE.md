# PROMPT 203 — Sport-Specific Settings Engine

## Objective

League creation and league settings adapt dynamically by sport. The **SportRulesEngine** is the single backend authority for:

- **Valid roster slots** — starter/flex/bench/IR and allowed positions per slot
- **Valid scoring settings** — formats (e.g. PPR, Standard) and category type
- **Valid player pools** — positions and pool limits for draft/waiver
- **Draft options** — allowed draft types, default rounds, timer, min/max rounds

## Supported sports

NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER).

## Backend

- **`lib/sport-rules-engine/`**
  - `types.ts` — `SportRules`, `RosterRules`, `RosterSlotRule`, `ScoringRules`, `PlayerPoolRules`, `DraftOptionRules`
  - `SportRulesEngine.ts` — `getRulesForSport(sport, format?)`, `getValidRosterSlotNames()`, `getValidPositions()`, `isSportSupported()`, `getSupportedSports()`
  - `index.ts` — re-exports
- Engine delegates to existing registries: `getRosterDefaults`, `getScoringDefaults`, `getDraftDefaults`, `getVariantsForSport`, `getPositionsForSport`, `getSportConfig` (sport-defaults + multi-sport). NFL IDP is supported via `format` / variant.

- **`GET /api/sport-rules?sport=NFL&format=PPR`**  
  Returns full `SportRules` JSON for the given sport and optional format/variant.

## Frontend

- **`hooks/useSportRules.ts`** — `useSportRules(sport, format?)` fetches `/api/sport-rules` and returns `{ rules, loading, error, refetch }`.
- **League creation wizard**
  - **Step 4 (Team setup)** — Shows “Default roster for {sport}: QB, RB, WR, …” from engine roster slots.
  - **Review step (LeagueSummaryPanel)** — Shows “Roster slots” line from engine when rules are loaded.

League creation continues to use `GET /api/sport-defaults?load=creation` for the full creation payload; sport-rules is used to display and validate sport-specific roster (and future scoring/draft constraints) in the UI.

## Example roster slots by sport

- **NFL:** QB, RB, WR, TE, FLEX, K, DST, BENCH, IR
- **NBA:** PG, SG, SF, PF, C, G, F, UTIL, BENCH, IR
- **MLB:** C, 1B, 2B, 3B, SS, OF×3, DH, UTIL, SP×2, RP×2, P, BENCH, IR
- **NHL:** C×2, LW×2, RW×2, D×2, G, UTIL, BENCH, IR
- **NCAAF / NCAAB / Soccer:** Use engine output per sport.

## Deliverable

Merged backend (`lib/sport-rules-engine`, `app/api/sport-rules`) and frontend (hook, Step4, LeagueSummaryPanel) as above.
