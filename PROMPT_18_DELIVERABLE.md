# Prompt 18 Deliverable - Waiver Defaults by Sport

Status: COMPLETE
Date: 2026-03-20

## 1. Waiver Defaults Architecture

The waiver defaults system now follows the same layered model as draft defaults, with sport- and variant-aware resolution plus idempotent bootstrap behavior:

1. Source of truth registry
- File: lib/sport-defaults/SportDefaultsRegistry.ts
- Stores canonical waiver defaults per sport.

2. Waiver defaults facade
- File: lib/waiver-defaults/WaiverDefaultsRegistry.ts
- Exposes getWaiverPreset and waiver variant/mode discovery helpers.

3. Preset resolver
- File: lib/waiver-defaults/WaiverPresetResolver.ts
- Resolves preset plus derived capabilities for UI/processor consumption.

4. League bootstrap
- File: lib/waiver-defaults/LeagueWaiverBootstrapService.ts
- Idempotent: creates missing settings rows and backfills only missing/null keys when a row exists.
- Preserves commissioner-set values.

5. Processing config resolver
- File: lib/waiver-defaults/WaiverProcessingConfigResolver.ts
- Resolves effective processing config with per-key fallback from settings to defaults.

6. FAAB config resolver
- File: lib/waiver-defaults/FAABConfigResolver.ts
- Resolves effective FAAB state and budget with per-key fallback.

7. Aggregate config resolver
- File: lib/waiver-defaults/WaiverConfigResolver.ts
- Combines processing/FAAB/effective settings into a complete league waiver config payload.

## 2. Per-Sport and Per-Variant Waiver Preset Definitions

All presets define and preserve:
- waiver_type
- processing_days
- processing_time_utc
- FAAB_budget_default
- faab_enabled
- faab_reset_rules
- claim_priority_behavior
- continuous_waivers_behavior
- free_agent_unlock_behavior
- game_lock_behavior
- drop_lock_behavior
- same_day_add_drop_rules
- max_claims_per_period

### Variant support helpers added

- File: lib/waiver-defaults/WaiverDefaultsRegistry.ts
- Added:
  - getWaiverPresetDefinitions(sport)
  - getSupportedWaiverVariantsForSport(sport)
  - SUPPORTED_WAIVER_MODES

NFL supported variants now explicitly exposed for waiver defaults discovery:
- STANDARD
- PPR
- HALF_PPR
- SUPERFLEX
- IDP
- DYNASTY_IDP
- devy_dynasty

## 3. Backend Bootstrap and Resolver Updates

Implemented updates:

1. LeagueWaiverBootstrapService
- File: lib/waiver-defaults/LeagueWaiverBootstrapService.ts
- Previous behavior: create-only flow; existing rows were skipped.
- New behavior: key-level backfill for missing/null keys on existing rows.
- Still non-destructive for commissioner overrides.

2. WaiverProcessingConfigResolver
- File: lib/waiver-defaults/WaiverProcessingConfigResolver.ts
- Added per-key fallback helper for partial settings.
- Expanded output fields:
  - claim_priority_behavior
  - drop_lock_behavior
  - same_day_add_drop_rules
  - max_claims_per_period
  - faab_enabled
  - faab_budget
  - faab_reset_rules

3. FAABConfigResolver
- File: lib/waiver-defaults/FAABConfigResolver.ts
- Added per-key fallback behavior for budget and waiverType-derived FAAB enablement.
- Retains row reset date while deriving reset rule from defaults.

4. WaiverConfigResolver
- File: lib/waiver-defaults/WaiverConfigResolver.ts
- Extended aggregate output to include the richer waiver behavior fields surfaced by processing resolver.

5. WaiverPresetResolver
- File: lib/waiver-defaults/WaiverPresetResolver.ts
- Added derived capability/context fields:
  - supportsIdpClaims
  - supportsFaab
  - defaultClaimPriority

## 4. Waiver UI and Processing Integration

Integration remains backward-compatible while providing richer config surfaces:

- Existing waiver settings and processing pipelines continue using stored league settings.
- Missing settings now resolve from sport/variant defaults on a per-key basis.
- Aggregated config now includes lock/drop/same-day/priority behavior fields required by UI and processing context.
- Cross-sport player-pool leak hardening from Prompt 16 remains intact and regressed green.

No breaking changes were introduced to claim processing order, claim submission contracts, or route authorization behavior.

## 5. QA Findings

New Prompt 18 test suite added:
- File: __tests__/waiver-defaults-by-sport.test.ts
- Coverage includes:
  - required waiver fields across all supported sports
  - NFL variant discovery and preset definition enumeration
  - capability derivation (NFL IDP vs Soccer)
  - bootstrap partial-key fill behavior
  - bootstrap idempotent no-op behavior
  - processing resolver per-key fallback with partial settings
  - FAAB resolver per-key fallback behavior

Regression tests run after Prompt 18 changes:
- __tests__/waiver-defaults-by-sport.test.ts
- __tests__/waiver-wire-player-route-pool-resolver.test.ts
- __tests__/league-create-defaults-api.test.ts
- __tests__/sport-defaults-api.test.ts

Result:
- New Prompt 18 suite: 7/7 passing.
- Additional waiver/defaults regressions: 5/5 passing.

Note:
- league-create-defaults-api test logs non-fatal mocked bootstrap warnings for unrelated IDP/dynasty services; assertions still pass and behavior is unchanged.

## 6. Issues Fixed

1. Existing-row waiver bootstrap gap
- Existing league waiver rows previously blocked default propagation entirely.
- Fixed with key-level missing/null backfill.

2. Partial-settings fallback gap in processing config
- Previous resolver mode could under-fill fields when any settings row existed.
- Fixed with per-key fallback resolution.

3. Incomplete aggregate waiver config context
- Previous aggregate config omitted several behavior fields required for richer UI/processing alignment.
- Fixed by exposing additional claim/lock/drop/same-day/max-claims fields.

4. Waiver preset discoverability and capability metadata
- Added explicit variant and mode discovery helpers plus derived capability flags.

## 7. Final QA Checklist

- [x] Waiver defaults resolve for all required sports.
- [x] NFL waiver variants are discoverable, including IDP and DYNASTY_IDP.
- [x] NFL IDP capability metadata is exposed for downstream consumers.
- [x] Sport-specific waiver defaults remain intact for Soccer, NBA, MLB, NHL, NCAAF, and NCAAB.
- [x] Bootstrap preserves commissioner overrides while filling missing keys.
- [x] Processing resolver handles partial settings safely with per-key fallback.
- [x] FAAB resolver handles partial settings safely with per-key fallback.
- [x] Aggregate waiver config now returns full behavior context needed by API/UI.
- [x] Waiver player route anti-leak behavior remains passing in regression tests.
- [x] Existing defaults API/create flows remain passing in targeted regressions.

## 8. Explanation of Waiver Defaults by Sport

Waiver configuration now follows a predictable precedence model:

1. League-specific commissioner settings (when present and non-null)
2. Sport + variant waiver defaults for any missing keys

This gives each league deterministic sport-aware waiver behavior while preserving commissioner intent and avoiding destructive rewrites. The result is safer initialization, richer runtime config context, and consistent waiver behavior across NFL (including IDP variants), NBA, MLB, NHL, NCAAF, NCAAB, and Soccer.
