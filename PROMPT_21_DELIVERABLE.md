# Prompt 21 Deliverable - Unified League Defaults Orchestrator for All Sports

Status: COMPLETE
Date: 2026-03-20

## 1. Unified Orchestrator Architecture

The league creation defaults flow now has a single orchestrator layer used across preview and create pathways:

1. Orchestrator facade
- File: lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator.ts
- Exposes unified APIs for payload resolution, initial settings preview, combined payload+settings response, and post-create initialization.

2. Preset resolution pipeline
- File: lib/league-defaults-orchestrator/LeaguePresetResolutionPipeline.ts
- Resolves all sport/variant creation defaults in one call and returns preview settings from the same context.

3. Settings preview builder
- File: lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts
- Produces the exact settings object expected for persistence from sport/variant defaults plus creation overrides.

4. Post-create initialization service
- File: lib/league-defaults-orchestrator/LeagueCreationInitializationService.ts
- Runs the single league bootstrap orchestration path for roster/scoring/player pool/draft/waiver/playoff/schedule initialization.

5. Sport/variant context normalization
- File: lib/league-defaults-orchestrator/SportVariantContextResolver.ts
- Normalizes supported sports, treats NFL IDP as NFL variant, and preserves Soccer as a first-class sport.

## 2. Unified Module Responsibilities

The orchestrator now serves as the stable boundary for consumers:

- getCreationPayload: creation-time metadata/presets used by sport defaults API and create flows.
- getInitialSettingsForCreation: exact initial League.settings projection for preview and create parity.
- getCreationPayloadAndSettings: one-call payload + preview settings + context for unified UI/API consumers.
- runPostCreateInitialization: idempotent bootstrap execution through the shared initialization service.

This keeps route-level logic thin and ensures sport/variant behavior is resolved from one source of truth.

## 3. Preview and Persist Consistency

Consistency guarantees implemented and validated:

- Preview route uses orchestrator APIs:
  - app/api/league/preview-settings/route.ts
  - Calls getInitialSettingsForCreation and getSettingsPreviewSummary with same sport/variant/overrides.

- Create route uses orchestrator APIs:
  - app/api/league/create/route.ts
  - Calls getInitialSettingsForCreation for persisted settings baseline.
  - Calls runPostCreateInitialization for unified bootstraps.

- Shared precedence remains deterministic:
  1. Resolved sport/variant defaults
  2. Creation overrides (superflex/roster mode/extra settings)
  3. Route-level safety normalizations for explicit league-mode requests

## 4. Sport and Variant Coverage

Coverage includes:

- Sports: NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER.
- NFL variants: STANDARD, PPR, SUPERFLEX, IDP, DYNASTY_IDP.
- Soccer: first-class sport in orchestrator context and preview/create route inputs.

Context resolver behavior retained:

- NFL IDP and DYNASTY_IDP normalize to NFL with IDP format handling.
- Invalid/unknown sport input falls back to NFL default sport.

## 5. QA Findings

New Prompt 21 tests added:

- __tests__/league-defaults-orchestrator.test.ts
  - Verifies orchestrator delegation and consistency contracts:
    - payload resolution through pipeline
    - preview settings resolution through builder
    - combined payload/settings behavior with and without overrides
    - post-create initialization delegation

- __tests__/league-preview-settings-api.test.ts
  - Verifies preview API contract:
    - sport normalization and variant pass-through
    - unified calls to orchestrator preview and summary APIs
    - invalid sport fallback to NFL

Existing create-route integration tests remain in place and continue validating orchestrator usage and sport matrix behavior.

## 6. Issues Fixed or Prevented

1. Missing Prompt 21 dedicated regression shield
- Added explicit orchestrator and preview-route test coverage.

2. Potential drift risk between route and orchestrator contracts
- Added tests asserting route inputs are forwarded consistently to unified orchestrator APIs.

3. Variant/sport normalization regressions
- Added preview-route fallback and normalization assertions.

## 7. Final QA Checklist

- [x] Unified orchestrator APIs exist and are consumed by create/preview pathways.
- [x] Orchestrator pipeline provides a single context for payload and settings.
- [x] Preview route forwards normalized sport + variant + overrides consistently.
- [x] Post-create initialization executes through unified orchestrator service.
- [x] NFL IDP and Soccer behavior remain supported.
- [x] New Prompt 21 test suites pass.

## 8. Explanation of Prompt 21 Outcome

Prompt 21 is satisfied through a centralized league defaults orchestrator stack that already existed and is now validated with dedicated tests focused on consistency boundaries.

Result:

- Creation defaults, preview settings, and post-create bootstrap all pass through the same orchestrator layer.
- Preview and persist logic remains aligned through shared sport/variant context and settings builder semantics.
- NFL/NFL IDP and Soccer paths remain safe, explicit, and regression-tested.
