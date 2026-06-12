# NFL/NCAAF Keeper Defaults Audit

## Summary

Keeper creation had working late-stage Prisma column defaults through `mapKeeperCreationFromWizard`, but it did not have the same canonical creation contract that redraft now has. Minimal keeper creates could seed `League.keeper*` columns and `DraftSession.keeperConfig`, while the broader settings snapshot, player pool rules, mock/live draft behavior, tabs, and NCAAF launch-ready preset coverage were incomplete or inconsistent.

This pass adds a single canonical keeper defaults contract for NFL and NCAAF and routes it through concept presets, the preset engine, foundation defaults, canonical creation, legacy creation normalization, draft room config, and create-league option surfaces.

## What Was Found

- `lib/keeper/mapKeeperCreationFromWizard.ts` already defaulted core keeper values: 3 keepers, 3 years, round-based cost, auction value for auction drafts, 1-round penalty, 20 percent auction increase, waiver keepers allowed, `any` eligibility, `player_chooses` conflicts, and `auto_no_keepers` missed deadlines.
- Those defaults were only applied late and narrowly. The settings snapshot did not consistently include keeper roster mode, player pool rules, tabs, draft surface behavior, trade/waiver settings, or devy/C2C/taxi/future-pick guardrails.
- NFL keeper had a thin concept preset. NCAAF keeper did not have launch-ready concept presets.
- Keeper validation accepted snake, linear, auction, and execution modes through normalization, but slow and mock keeper drafts were not part of the keeper format allowlist.
- The draft pool resolver already excludes `DraftSession.keeperSelections` by player name/id, so kept-player pool exclusion support exists once keeper selections are present.

## Files Changed

- `lib/league-concepts/keeperDefaults.ts`
- `lib/league-concepts/resolveConceptPreset.ts`
- `lib/league-concepts/conceptPresetCatalog.ts`
- `lib/league-creation/preset-engine/runPresetEngine.ts`
- `lib/league-defaults/getLeagueDefaults.ts`
- `lib/league-creation/canonical/createCanonicalLeagueInTransaction.ts`
- `app/api/league/create/route.ts`
- `lib/draft-types/draftTypeRegistry.ts`
- `lib/league/format-engine.ts`
- `lib/create-league-v2/rules-engine.ts`
- `lib/league-creation/options-catalog-seed-data.ts`
- `lib/sport-defaults/SportDefaultsRegistry.ts`
- `lib/keeper/mapKeeperCreationFromWizard.ts`
- `lib/live-draft-engine/keeper/types.ts`
- `__tests__/keeper-defaults-nfl-ncaaf.test.ts`

## Final NFL Keeper Defaults

- Sport: `NFL`
- League type / roster mode: `keeper`
- Teams: 12
- Scoring preset: `fb_half_ppr` by default; `fb_ppr` and `fb_standard` are launch-ready concept presets
- Roster: QB, RB, RB, WR, WR, TE, FLEX, K, DST
- Bench: 7
- IR: 2
- Taxi/devy/C2C/contracts/salary cap/future rookie picks: disabled
- Player pool: active NFL fantasy players only
- Keeper policy: enabled, max 3 keepers, max 3 years, `any` eligibility, waiver keepers allowed
- Default cost system: `round_based`, 1-round penalty
- Auction keeper cost: `auction_value`, 20 percent increase, budget deductions enabled
- Kept players: excluded from draft pool or marked unavailable for mock/live surfaces
- Draft settings: 90-second timer, queue limit 60, ADP ranking, roster needs account for keepers
- Tabs: overview, teams, rosters, standings, matchups, draft, mock draft, live draft, keeper declarations, trade center, waivers, settings, commissioner tools

## Final NCAAF Keeper Defaults

- Sport: `NCAAF`
- League type / roster mode: `keeper`
- Teams: 12
- Scoring preset: `ncaaf_half_ppr` by default; `ncaaf_ppr` and `ncaaf_standard` are launch-ready concept presets
- Roster: QB, RB, RB, WR, WR, TE, FLEX, K, DEF
- Bench: 8
- IR: 2
- Taxi/devy/C2C/contracts/salary cap/future picks: disabled for plain keeper
- Player pool: NCAAF college players only; NFL pool explicitly excluded
- Keeper policy: enabled, max 3 keepers, max 3 years, `any` eligibility, waiver keepers allowed
- Draft settings: 90-second timer, queue limit 70, NCAAF ADP/projection/rank fallback, roster needs account for keepers

## Keeper Draft Type Behavior

- `snake`: snake engine, round-based keeper costs, kept players removed from pool, draft round adjustments enabled, 90-second timer.
- `linear`: linear engine, same order every round, round-based keeper costs, kept players removed from pool, draft round adjustments enabled, 90-second timer.
- `auction`: auction engine, `$200` budget, `auction_value` keeper costs, 20 percent keeper increase, budget deductions enabled, nomination order enabled.
- `slow_draft`: snake engine by default, 8-hour pick window, overnight pause and reminders enabled, kept players removed from pool.
- `mock_draft`: keeper settings applied, keeper costs visible, real rosters and keeper declarations are not mutated.
- `offline`: snake engine, offline mode enabled, commissioner pick entry enabled, timer disabled in settings, keeper costs visible.
- `auto`: snake engine, queue-first autopick, eligible pool excludes keepers, roster needs account for keepers.
- `team`: snake engine, co-manager controls enabled, keeper declaration permissions flagged, eligible pool excludes keepers.

Plain keeper rejects `devy_*` and `c2c_*` draft types. Those remain reserved for explicit devy/C2C overlays.

## Remaining Gaps

- The keeper declaration deadline is seeded as the policy `before_draft` default, but no concrete timestamp is generated until a commissioner sets one or a draft date exists.
- Existing keeper UI/routes can render keeper tools, and the creation snapshot enables the tabs, but this pass did not redesign keeper UI flows.
- Offline pick persistence, keeper pick adjustments, and auction keeper cost display rely on existing draft/keeper services; this pass seeded complete config for those services but did not rewrite their workflows.
- Dynasty, devy, C2C, salary-cap keeper-style overlays, future rookie pick trading, and full carryover mechanics remain outside this scoped plain keeper pass.

## Verification

- `npm test -- --run keeper-defaults-nfl-ncaaf`
- `npm test -- --run redraft-defaults-nfl-ncaaf`
- `npm test -- --run keeper-defaults-nfl-ncaaf redraft-defaults-nfl-ncaaf draft-defaults-by-sport canonical-league-creation-legacy-payload create-league-v2-submit-api-leagues`
