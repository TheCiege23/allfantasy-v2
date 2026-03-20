# Prompt 17 Deliverable - Draft Defaults by Sport

Status: COMPLETE
Date: 2026-03-20

## 1. Draft Defaults Architecture

The draft defaults system is implemented as a layered, sport-aware and variant-aware pipeline:

1. Source of truth registry
- File: lib/sport-defaults/SportDefaultsRegistry.ts
- Stores per-sport draft defaults and variant overlays.

2. Draft defaults facade
- File: lib/draft-defaults/DraftDefaultsRegistry.ts
- Exposes getDraftPreset and variant discovery helpers.

3. Preset resolver
- File: lib/draft-defaults/DraftPresetResolver.ts
- Resolves preset plus derived capabilities for downstream consumers.

4. League bootstrap
- File: lib/draft-defaults/LeagueDraftBootstrapService.ts
- Idempotently merges missing draft keys into league settings.
- Preserves commissioner overrides.

5. Draft room runtime resolver
- File: lib/draft-defaults/DraftRoomConfigResolver.ts
- Resolves effective draft config using per-key fallback from settings to defaults.

6. Order behavior resolver
- File: lib/draft-defaults/DraftOrderRuleResolver.ts
- Resolves snake/linear and third-round reversal behavior for UI and processing context.

7. Ranking context resolver
- File: lib/draft-defaults/DraftRankingContextResolver.ts
- Resolves ranking source context for AI draft assistant and queue/ranking UX.

## 2. Per-Sport and Per-Variant Draft Preset Definitions

All presets define:
- draft_type
- rounds_default
- timer_seconds_default
- pick_order_rules
- snake_or_linear_behavior
- third_round_reversal
- autopick_behavior
- queue_size_limit
- draft_order_rules
- pre_draft_ranking_source
- roster_fill_order
- position_filter_behavior
- keeper_dynasty_carryover_supported

### NFL variants

- STANDARD
  - snake, 15 rounds, 90s timer, queue 50, adp, starter_first, by_eligibility
- PPR
  - snake, 15 rounds, ecr ranking source
- HALF_PPR
  - snake, 15 rounds, adp ranking source
- SUPERFLEX
  - snake, 16 rounds, queue 55, ecr, need_based, by_need
- IDP
  - snake, 18 rounds, queue 60, tiers, position_scarcity, by_need
- DYNASTY_IDP
  - same draft overlay behavior as IDP
- devy_dynasty
  - preserved dynamic rounds based on active + bench + taxi slots

### NBA
- snake, 13 rounds, queue 40, adp, by_eligibility

### MLB
- snake, 26 rounds, queue 60, projections, position_scarcity

### NHL
- snake, 18 rounds, queue 50, adp, by_eligibility

### NCAA Football
- snake, 20 rounds, queue 70, adp, position_scarcity

### NCAA Basketball
- snake, 12 rounds, queue 40, adp, by_eligibility

### Soccer
- snake, 15 rounds, queue 40, sport_default ranking source, position_scarcity, by_eligibility

## 3. Backend Bootstrap and Resolver Updates

Implemented updates:

1. LeagueDraftBootstrapService
- File: lib/draft-defaults/LeagueDraftBootstrapService.ts
- Changed from all-or-nothing gate to key-level merge behavior.
- Applies only missing draft keys.
- Returns no-op when all keys already exist.

2. DraftRoomConfigResolver
- File: lib/draft-defaults/DraftRoomConfigResolver.ts
- Added per-key fallback resolution for partial settings states.
- Prevents null/undefined config fields in runtime draft room context.

3. DraftPresetResolver
- File: lib/draft-defaults/DraftPresetResolver.ts
- Added:
  - supportsIdpPlayers
  - supportsKeeperCarryover
  - defaultOrderMode

4. DraftOrderRuleResolver
- File: lib/draft-defaults/DraftOrderRuleResolver.ts
- Added getDraftOrderBehavior with 3RR awareness.

5. DraftRankingContextResolver
- File: lib/draft-defaults/DraftRankingContextResolver.ts
- Context labels now include sport + variant for clearer ranking context.

6. DraftDefaultsRegistry facade
- File: lib/draft-defaults/DraftDefaultsRegistry.ts
- Added preset definition enumeration and supported variant lookup helpers.

## 4. Draft Room Integration Updates

Integration impact was kept resolver-focused and non-breaking:

- Draft room config now safely resolves from:
  1) explicit league settings
  2) sport/variant defaults

- Player pool and filter behavior remain aligned with sport/variant through existing draft pool pipeline.

- NFL IDP draft context is explicitly represented in preset capabilities and ranking context.

No changes were made to core pick processing mechanics, timer execution loop, or queue mutation APIs.

## 5. QA Findings

New Prompt 17 test suite added:
- File: __tests__/draft-defaults-by-sport.test.ts
- Coverage includes:
  - required draft fields for all sports
  - NFL variant matrix behavior
  - sport-specific expectations for MLB/NHL/NCAA/Soccer
  - preset definitions and supported variant discovery
  - ranking context and order behavior
  - bootstrap idempotency and partial-merge behavior
  - draft room per-key fallback behavior

Regression matrix run included:
- __tests__/draft-defaults-by-sport.test.ts
- __tests__/league-creation-sport-initialization-e2e.test.ts
- __tests__/league-creation-defaults-loader-variants.test.ts
- __tests__/league-create-defaults-api.test.ts
- __tests__/league-create-wizard-idp-variant.test.ts
- __tests__/sport-defaults-api.test.ts
- __tests__/sport-defaults-api-variants.test.ts
- __tests__/sport-default-roster-settings.test.ts
- __tests__/sport-default-scoring-settings.test.ts
- __tests__/sport-team-player-pool-mapping.test.ts

Result: 80/80 passing in the prompt-17 regression matrix.

## 6. Issues Fixed

1. Bootstrap partial-settings gap
- Previous behavior could skip key population if draft_rounds existed.
- Fixed by key-level missing-value merge.

2. Runtime config partial fallback gap
- Previous behavior switched to settings mode too early.
- Fixed by per-key fallback to defaults.

3. Variant-context discoverability
- Added explicit variant enumeration and capability metadata for consumers.

## 7. Final QA Checklist

- [x] Draft defaults exist for all required sports.
- [x] NFL variant draft defaults resolved for STANDARD/PPR/HALF_PPR/SUPERFLEX/IDP/DYNASTY_IDP.
- [x] NFL IDP defaults include deeper rounds and IDP-aware ranking/filter behavior.
- [x] NBA defaults remain basketball-appropriate.
- [x] MLB defaults use deeper rounds and scarcity-aware fill defaults.
- [x] NHL defaults support skater/goalie filtering behavior via eligibility-driven filters.
- [x] NCAA Football defaults support larger rounds/queue assumptions.
- [x] NCAA Basketball defaults updated and validated.
- [x] Soccer defaults support sport-specific ranking source and positional drafting behavior.
- [x] League bootstrap preserves commissioner overrides.
- [x] Draft room config remains stable for partial settings.
- [x] Existing league creation and NFL non-IDP regression suites remain passing.

## 8. Explanation of Draft Defaults by Sport

The system now guarantees that draft behavior is initialized from sport + variant context, then safely overridden by league settings without losing defaults for unset keys.

At creation/bootstrap time:
- sport + leagueVariant select a preset.
- missing draft config keys are populated.

At runtime in draft room:
- explicit commissioner values are respected.
- unresolved keys fall back to sport-aware defaults.

This approach preserves existing production flows while enabling predictable, scalable draft initialization across NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, and Soccer.
