# NFL/NCAAF Devy Defaults Audit

## Summary

NFL and NCAAF devy league creation now has a canonical defaults contract in `lib/league-concepts/devyDefaults.ts`.
The contract feeds the concept preset resolver, preset engine, foundation defaults, canonical creation transaction, legacy create route normalization, create draft options, and the sport defaults registry.

## Product Decision

NCAAF devy is launch-mode Option A: a college fantasy dynasty league with active NCAAF players in the startup/current roster pool plus a separate future college prospect/devy rights pool.

That means:

- NFL devy startup pool: active NFL fantasy players.
- NFL devy devy pool: NCAAF prospects from the devy player pipeline.
- NFL devy rookie pool: NFL rookies, excluding devy-held promoted players.
- NCAAF devy startup pool: active NCAAF fantasy players only.
- NCAAF devy future/devy pool: NCAAF future or prospect assets from `DevyPlayer`.
- NCAAF devy does not use or leak the NFL pro player pool.

## Canonical Defaults

- League type: `devy`
- Roster mode: `dynasty`
- Teams: `12`
- Timer: `90` seconds
- Startup draft rounds: starter slots plus bench slots
- Taxi slots: `6`
- Devy slots: `6`
- Rookie draft rounds: `4`
- Devy draft rounds: `4`
- Rookie pick order: `reverse_standings`
- Devy pick order: `reverse_standings`
- Future rookie picks: enabled
- Future devy picks: enabled
- C2C: disabled
- Keeper: disabled
- Best ball: disabled
- Guillotine: disabled
- Salary cap/contracts: disabled by default

## Draft Types

Supported create draft inputs:

- `devy_snake`
- `devy_linear`
- `devy_auction`
- `snake`
- `linear`
- `auction`
- `mock_draft`
- `offline`
- `auto`

Base `snake`, `linear`, and `auction` map into the corresponding devy contract. Unsupported strings no longer collapse into `devy_snake`.

Lifecycle drafts are modeled inside the devy settings contract:

- `startup_draft`
- `rookie_draft`
- `devy_draft`
- `supplemental_draft`

## Files Updated

- `lib/league-concepts/devyDefaults.ts`
- `lib/league-concepts/resolveConceptPreset.ts`
- `lib/league-creation/preset-engine/runPresetEngine.ts`
- `lib/league-defaults/getLeagueDefaults.ts`
- `lib/league-creation/canonical/createCanonicalLeagueInTransaction.ts`
- `app/api/league/create/route.ts`
- `lib/draft-types/draftTypeRegistry.ts`
- `lib/create-league-v2/rules-engine.ts`
- `lib/sport-defaults/SportDefaultsRegistry.ts`
- `lib/league-concepts/conceptPresetCatalog.ts`
- `__tests__/devy-defaults-nfl-ncaaf.test.ts`

## Remaining Gaps

The defaults contract points NCAAF future/devy assets at the existing `DevyPlayer` pipeline. It does not create a new recruit-only ingestion system. If product later needs high-school recruit separation, that should be a dedicated data/pool project rather than a league creation default change.

NBA/NCAAB devy support was not changed. Existing registry hooks remain, but this audit only makes NFL/NCAAF launch-ready.

## Verification

Focused coverage is in `__tests__/devy-defaults-nfl-ncaaf.test.ts`:

- NFL/NCAAF devy contract shape
- NCAAF no-NFL-pool guardrail
- supported devy draft inputs
- rejection of unsupported devy draft strings
- resolver and merge invariants
- preset engine and foundation defaults wiring
- launch-ready concept preset catalog rows
- NCAAF sport defaults registry coverage
