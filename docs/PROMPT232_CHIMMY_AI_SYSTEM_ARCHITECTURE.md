# PROMPT 232 - Chimmy AI System Architecture

## Objective

Implement a deterministic-first, multi-model Chimmy orchestration architecture that supports:

- OpenAI
- DeepSeek
- xAI (Grok)

The system must prioritize accuracy over creativity and keep deterministic outputs as the source of truth.

Supported sports are inherited from `lib/sport-scope.ts` (`SUPPORTED_SPORTS`) so Chimmy runs consistently for NFL, NHL, NBA, MLB, NCAAB, NCAAF, and SOCCER without sport-specific hardcoding.

## Deterministic-First Layering

Execution order is enforced as:

1. Deterministic Layer (first)
2. AI Model Layer (second)
3. Aggregation Layer (final response)

Deterministic layer always computes and tracks:

- projections
- matchup data
- roster needs
- ADP comparisons
- rankings
- scoring outputs

If any section is unavailable, Chimmy records explicit missing sections and caps confidence.

## New Components

### 1) `ChimmyOrchestrator`

File: `lib/chimmy-orchestration/ChimmyOrchestrator.ts`

Responsibilities:

- Runs the Chimmy-specific deterministic-first orchestration flow
- Builds deterministic layer snapshot
- Applies model routing plan
- Applies confidence scoring
- Produces final orchestration result for `chimmy_chat`

### 2) `ModelRouter`

File: `lib/chimmy-orchestration/ModelRouter.ts`

Responsibilities:

- Routes model usage by context and availability
- Supports independent model execution for specific task purposes:
  - DeepSeek -> structured analysis
  - Grok -> trend context
  - OpenAI -> final synthesis
- Supports selective Grok usage for explanation-only flows to reduce noise/cost

### 3) `ResponseAggregator`

File: `lib/chimmy-orchestration/ResponseAggregator.ts`

Responsibilities:

- Combines model outputs into one final Chimmy answer
- Ensures deterministic summary is included in final response context
- Adds guardrail warnings when deterministic sections are missing

### 4) `ConfidenceScoringEngine`

File: `lib/chimmy-orchestration/ConfidenceScoringEngine.ts`

Responsibilities:

- Computes confidence from deterministic completeness, provider reliability, and agreement
- Applies deterministic-data caps to prevent over-confident AI answers
- Emits low/medium/high confidence label and reason trace

## Supporting Module

### Deterministic Snapshot Builder

File: `lib/chimmy-orchestration/deterministic-layer.ts`

Responsibilities:

- Normalizes deterministic inputs from envelope payloads
- Computes completeness percentage
- Tracks missing deterministic sections for fact-guard and confidence caps

## Integration Point

The shared backend orchestration entry now uses Chimmy architecture for `chimmy_chat`:

- File: `lib/ai-orchestration/orchestration-service.ts`
- Change:
  - uses `resolveChimmyRoutingPlan(...)` to select provider models for Chimmy
  - uses `runChimmyOrchestrator(...)` for final response composition

This preserves a single orchestration backend while giving Chimmy its own deterministic-first architecture behavior.

## Deterministic vs AI Responsibility Matrix

- Deterministic layer:
  - computes quantitative and rules-based context
  - remains source of truth
- AI model layer:
  - explanation
  - strategy framing
  - reasoning narrative
  - coaching tone
- Aggregation layer:
  - composes final response
  - includes deterministic context summary
  - applies confidence and uncertainty warnings

## Backend Files Added

- `lib/chimmy-orchestration/types.ts`
- `lib/chimmy-orchestration/deterministic-layer.ts`
- `lib/chimmy-orchestration/ModelRouter.ts`
- `lib/chimmy-orchestration/ResponseAggregator.ts`
- `lib/chimmy-orchestration/ConfidenceScoringEngine.ts`
- `lib/chimmy-orchestration/ChimmyOrchestrator.ts`
- `lib/chimmy-orchestration/index.ts`

## Backend Files Updated

- `lib/ai-orchestration/orchestration-service.ts`
