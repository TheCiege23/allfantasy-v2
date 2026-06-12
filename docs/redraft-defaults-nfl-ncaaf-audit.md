# NFL/NCAAF Redraft Defaults Audit

Date: 2026-06-12

## Scope

This audit covers standard redraft league creation defaults for NFL and NCAAF only. It does not change playoffs, champion finalization, standings logic, trades, commissioner workflow, roster workflow beyond default roster templates, or broader league mechanics.

## Current Creation Paths

- `app/api/league/create/route.ts` has two paths:
  - Manual leagues now delegate to the canonical pipeline through `buildLegacyManualCanonicalCreatePayload()`, `validateCreatePayload()`, and `executeCanonicalLeagueCreation()`.
  - External/import paths still use the legacy Prisma shell with defaults from `LeagueDefaultsOrchestrator`.
- Canonical creation stores the full settings snapshot on `League.settings`, then creates supporting rows such as `LeagueSettings`, `RedraftLeagueDraftProfile`, and `DraftSession`.
- Post-create bootstrap can merge sport defaults into existing settings. Existing settings win, so the creation snapshot must already carry the correct redraft keys.

## Issues Found

- NCAAF had no launch-ready redraft concept preset. Only NCAAF devy and C2C beta presets existed.
- NCAAF base roster defaults included `SUPERFLEX` by default, which leaked into standard redraft.
- The static create-options catalog advertised NCAAF scoring ids such as `ncaaf_half_ppr`, but the scoring preset resolver did not define them.
- NFL catalog ids `fb_ppr` and `fb_std` were not resolver aliases, while legacy payloads could still emit `fb_full_ppr` and `fb_standard`.
- The legacy redraft leakage guard ran before later settings merges, so `settings`, `rosterSettings`, `rules`, or specialty settings could reintroduce taxi/devy/C2C/salary-cap flags.
- `slow_draft` and `mock_draft` were registered draft definitions, but redraft validation did not allow them.
- Draft room config did not normalize `slow_draft`, `offline`, `auto`, or `team` to a runtime draft core, and it did not read nested `draftSettings` fallbacks.

## Final Default Contract

### NFL Redraft

- Teams: 12 default.
- Scoring: `fb_half_ppr` default.
- Draft types supported at creation/API level: `snake`, `linear`, `auction`, `slow_draft`, `mock_draft`, `offline`, `auto`.
- Runtime draft core: `snake`, `linear`, or `auction`; slow/mock/offline/auto map to runtime `snake`.
- Roster: `QB 1`, `RB 2`, `WR 2`, `TE 1`, `FLEX 1`, `K 1`, `DST 1`.
- Bench: 6.
- IR: 1.
- Draft rounds: 15, matching starter plus bench slots.
- Timer: 90 seconds.
- Queue limit: 50.
- Ranking source: `adp`.
- Player pool: NFL active fantasy players only, no college-only/rookie-only pool.
- Disabled by default: taxi, keepers, devy, C2C, contracts, salary cap.

### NCAAF Redraft

- Teams: 12 default.
- Scoring: `ncaaf_half_ppr` default.
- Draft types supported at creation/API level: `snake`, `linear`, `auction`, `slow_draft`, `mock_draft`, `offline`, `auto`.
- Runtime draft core: `snake`, `linear`, or `auction`; slow/mock/offline/auto map to runtime `snake`.
- Roster: `QB 1`, `RB 2`, `WR 2`, `TE 1`, `FLEX 1`, `K 1`, `DEF 1`.
- Bench: 8.
- IR: 1.
- Draft rounds: 17 when the roster template is available, matching starter plus bench slots. Registry fallback remains 20 if no roster-sized contract is available.
- Timer: 90 seconds.
- Queue limit: 70.
- Ranking source: `adp_projection_rank_fallback`.
- Player pool: NCAAF college players only, no NFL player pool leakage, no rookie-only pool.
- Disabled by default: taxi, keepers, devy, C2C, contracts, salary cap.

## Implementation Summary

- Added `lib/league-concepts/redraftDefaults.ts` as the canonical NFL/NCAAF redraft contract.
- Wired the contract into:
  - `resolveConceptPreset()` and `mergeConceptPresetSettings()`
  - `runPresetEngine()`
  - `getLeagueDefaults()`
  - canonical transaction draft rows
  - legacy `/api/league/create` external/import settings normalization
  - draft-room config resolution
- Added NCAAF redraft concept presets and scoring preset resolver entries.
- Updated NCAAF/NFL base sport defaults and NCAAF roster-engine redraft template to remove default Superflex.
- Expanded redraft draft-type validation/options for slow/mock plus execution modes.

## Risks And Caveats

- Existing leagues are not migrated by this change. A separate backfill would be required to normalize old redraft leagues already carrying Superflex, taxi, devy, or C2C settings.
- NCAAF `DEF` is now the default team-defense slot. Draft/player availability still depends on the NCAAF `SportsPlayer` data containing compatible team-defense rows or future synthetic DEF support.
- The registry fallback for NCAAF draft rounds remains 20 by design; newly created canonical redraft leagues use the roster-sized 17-round contract.

## Verification

- Added `__tests__/redraft-defaults-nfl-ncaaf.test.ts`.
- Focused coverage verifies:
  - NFL and NCAAF default contracts.
  - NCAAF scoring ids.
  - redraft draft-type validation for snake, linear, auction, slow, mock, offline, and auto.
  - v2 create draft options expose the full redraft set.
  - preset engine and foundation defaults use the same NCAAF contract.
  - invalid redraft leakage is normalized while valid draft overrides are preserved.
  - mock and live draft surfaces share the same resolved draft config.
