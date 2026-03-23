# Prompt 60 — Global Intelligence Engine (Deliverable)

## Overview

A **global AI intelligence layer** that integrates five engines into one unified response:

- **Meta Engine** — platform-wide meta (trends, strategy usage) via `GlobalMetaEngine.getAIMetaSummary`.
- **Simulation Engine** — playoff odds, matchup summary, dynasty summary, warehouse context via `getSimulationAndWarehouseContextForLeague` (AI Simulation Query Service).
- **AI Advisor** — lineup, trade, waiver, injury advice via `getLeagueAdvisorAdvice` (League Advisor); requires authenticated user.
- **Media Engine** — league articles (recaps, power rankings, etc.) via `listArticles` from League Media Engine.
- **Draft Intelligence** — draft context for AI via `getInsightContext(leagueId, 'draft')` from AI Insight Router.

The global layer accepts `leagueId`, optional `userId`, optional `sport`, and optional `include[]` (which modules to run). It runs the requested modules in parallel and returns a single result object with one section per module.

## Data flow

1. **Input**: `GlobalIntelligenceInput` — leagueId, userId? (from session when available), sport?, season?, week?, include? (default: all).
2. **Orchestration**: `getGlobalIntelligence()` runs Meta, Simulation, Advisor (if userId), Media, and Draft in parallel. Each module is wrapped in try/catch; failures produce a section with `error` and null/empty content.
3. **Output**: `GlobalIntelligenceResult` — leagueId, sport, meta, simulation, advisor, media, draft, generatedAt. Each section has a consistent shape (summary/list/context + optional error).

## API

- **POST** `/api/intelligence/global`
  - Auth: session optional; when present, `userId` is used for Advisor.
  - Body: `{ leagueId: string, sport?: string | null, season?: number, week?: number, include?: ('meta'|'simulation'|'advisor'|'media'|'draft')[] }`.
  - Returns: `GlobalIntelligenceResult` (meta, simulation, advisor, media, draft each nullable with optional error).

## UI

- **Global Intelligence Panel** — `GlobalIntelligencePanel` component used in the league **Intelligence** tab (`IntelligenceTab`). For the current league it fetches `POST /api/intelligence/global` and displays collapsible sections: Meta Engine, Simulation Engine, AI Advisor, Media Engine, Draft Intelligence. Each section shows summary or list content; errors are shown inline. Generated timestamp at bottom.

## Files

| Area    | Path |
|---------|------|
| Types   | `lib/global-intelligence/types.ts` |
| Engine  | `lib/global-intelligence/GlobalIntelligenceEngine.ts` |
| Index   | `lib/global-intelligence/index.ts` |
| API     | `app/api/intelligence/global/route.ts` |
| Panel   | `components/global-intelligence/GlobalIntelligencePanel.tsx` |
| Tab     | `components/app/tabs/IntelligenceTab.tsx` (integrates panel) |

## Dependencies

- **Meta**: `lib/global-meta-engine` — `GlobalMetaEngine.getAIMetaSummary`.
- **Simulation**: `lib/ai-simulation-integration/AISimulationQueryService` — `getSimulationAndWarehouseContextForLeague`.
- **Advisor**: `lib/league-advisor` — `getLeagueAdvisorAdvice`.
- **Media**: `lib/sports-media-engine/LeagueMediaEngine` — `listArticles`.
- **Draft**: `lib/ai-simulation-integration/AIInsightRouter` — `getInsightContext(leagueId, 'draft')`.

Sport is normalized with `normalizeToSupportedSport` from `lib/sport-scope` where applicable.

## Validation and test coverage

- Added route contract tests: `__tests__/intelligence-global-route-contract.test.ts`.
- Added service orchestration tests: `__tests__/global-intelligence-engine.test.ts`.
- Simulation and draft sections now use `season` and `week` context (input override or league fallback) to avoid fixed-year/fixed-week drift.
