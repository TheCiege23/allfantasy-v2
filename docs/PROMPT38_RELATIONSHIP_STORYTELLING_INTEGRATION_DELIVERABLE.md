# Prompt 38 — Unified Relationship & Storytelling Layer Deliverable

## 1) Integration architecture

The platform now has a dedicated integration layer under `lib/relationship-insights` that composes:

- League Intelligence Graph
- Rivalry Engine
- Psychological Profiles Engine
- League Drama Engine

Core modules implemented:

- `RelationshipInsightOrchestrator`
- `GraphRivalryBridge`
- `BehaviorDramaBridge`
- `UnifiedStorylineResolver`
- `RelationshipQueryService`
- `SportRelationshipResolver`
- `AIRelationshipContextResolver`

Design intent:

- Keep existing engines intact and additive.
- Normalize sport context through `lib/sport-scope` and relationship sport resolver.
- Materialize cross-system links as reusable payloads for UI and AI.

## 2) Backend orchestration updates

New integration services:

- `lib/relationship-insights/GraphRivalryBridge.ts`
  - Syncs `RivalryRecord` outcomes into graph `RIVAL_OF` edges (team and manager scopes).
  - Bridges historical gap where graph rivalry edges were not guaranteed to reflect rivalry engine records.
- `lib/relationship-insights/BehaviorDramaBridge.ts`
  - Joins manager profile heat and related drama events per manager.
- `lib/relationship-insights/UnifiedStorylineResolver.ts`
  - Produces ranked cross-system storyline records with rivalry, drama, and behavior signals.
- `lib/relationship-insights/RelationshipQueryService.ts`
  - Aggregates profile, rivalry, drama, graph profile, and unified storyline rows into one payload.
- `lib/relationship-insights/AIRelationshipContextResolver.ts`
  - Builds one AI-ready context blob spanning all four systems.
- `lib/relationship-insights/RelationshipInsightOrchestrator.ts`
  - Optional rebuild/run sequence for graph/rivalry/drama/profiles plus graph-rivalry sync.

New API surfaces:

- `GET/POST /api/leagues/[leagueId]/relationship-insights`
  - GET: unified read model.
  - POST: orchestration refresh + returned unified payload.
- `POST /api/leagues/[leagueId]/relationship-insights/explain`
  - AI narrative using unified relationship context.

Existing API integration upgrades:

- `GET /api/leagues/[leagueId]/relationship-map`
  - Optional rivalry edge sync before returning map.
- `GET /api/leagues/[leagueId]/relationship-profile`
  - Optional rivalry edge sync before returning profile.
- `POST /api/leagues/[leagueId]/graph-insight`
  - Now includes unified context for explanation generation.
- `GET /api/leagues/[leagueId]/rivalries/[rivalryId]`
  - Returns linked drama references (`linkedDramaCount`, `linkedDramaEventIds`).
- `POST /api/leagues/[leagueId]/rivalries/explain`
  - Includes psychological profile and linked drama context in narrative prompt.
- `POST /api/leagues/[leagueId]/drama/tell-story`
  - Enriches drama narrative context with unified relationship storyline hints.

## 3) UI integration points

New/updated UI integration points:

- New panel: `components/app/league-intelligence/UnifiedRelationshipInsightsPanel.tsx`
  - Sport/season filters
  - Layer sync action
  - AI explanation action
  - Drill-down links to rivalry, drama, behavior comparison, trade context
- New route: `app/app/league/[leagueId]/relationship-insights/page.tsx`
  - Dedicated workspace for integrated relationship storytelling view.
- `components/app/tabs/IntelligenceTab.tsx`
  - Includes unified panel and workspace link.
- `app/leagues/[leagueId]/page.tsx`
  - Legacy intelligence tab now also includes unified panel.
- `components/app/league-intelligence/RelationshipGraphView.tsx`
  - Added `Open rivalry context` action from edge detail (graph-to-rivalry drill-down).
- `components/app/league-intelligence/LeagueIntelligenceGraphPanel.tsx`
  - Summary cards are clickable and manager selection now focuses manager cards.
- `components/app/league-intelligence/ManagerRelationshipCard.tsx`
  - Added direct links to drama context, behavior comparison, and trade context.
- `components/app/league-intelligence/RivalryEngineList.tsx`
  - Canonicalized drill-down URLs to `/app/league/...`.
- `app/leagues/[leagueId]/rivalries/[rivalryId]/page.tsx`
  - Back navigation canonicalized to app shell.
  - Added rivalry-to-drama and rivalry-to-behavior drill-down links.
- `app/app/league/[leagueId]/drama/page.tsx`
  - Added `relatedManagerId` filter and query propagation support.
- `app/app/league/[leagueId]/drama/[eventId]/page.tsx`
  - Canonical rivalry drill-down path under `/app/league/...`.
- `app/app/league/[leagueId]/psychological-profiles/[profileId]/page.tsx`
  - `?tab=evidence` now functions (scroll/focus behavior).
  - Added profile-to-drama and profile-to-trade drill-down actions.
- `components/app/settings/BehaviorProfilesPanel.tsx`
  - Added profile-to-trade context action.

## 4) AI integration points

AI pathways now combine graph + rivalry + profiles + drama:

- Unified explain endpoint:
  - `/api/leagues/[leagueId]/relationship-insights/explain`
  - Uses `AIRelationshipContextResolver` with focused manager/rivalry/drama targets.
- Graph insight endpoint:
  - `/api/leagues/[leagueId]/graph-insight`
  - Enhanced with unified context payload and storyline count.
- Rivalry explain endpoint:
  - `/api/leagues/[leagueId]/rivalries/explain`
  - Incorporates profile labels/scores and linked drama summaries.
- Drama story endpoint:
  - `/api/leagues/[leagueId]/drama/tell-story`
  - Enriched with unified relationship storyline hints.

## 5) Full UI click audit findings

See: `docs/PROMPT38_INTEGRATION_CLICK_AUDIT_MATRIX.md`

High-level outcomes:

- Graph-to-rivalry drill-down wired.
- Rivalry-to-drama drill-down wired with filter propagation.
- Profile-to-trade and profile-to-drama drill-downs wired.
- Unified panel click paths (refresh, sync, explain, drill-down links) wired.
- Route normalization fixed for app shell continuity.
- Mandatory workflow audit fields captured per interaction:
  - component + route
  - handler verification
  - state transition verification
  - API wiring verification
  - persist/reload verification

## 6) QA findings

Primary findings during implementation:

- Rivalry detail path drift (`/leagues` shell) caused inconsistent back-navigation from app-shell drama flow.
- Graph manager drill-down selected manager was not focused in manager view.
- Profile detail `?tab=evidence` deep link did not actuate evidence section.
- Cross-view manager filter propagation into drama timeline was missing.

All above addressed in this implementation pass.

Automated verification run:

- `e2e/league-intelligence-graph-click-audit.spec.ts`
- `e2e/rivalry-engine-click-audit.spec.ts`
- `e2e/psychological-profiles-click-audit.spec.ts`
- `e2e/league-drama-click-audit.spec.ts`
- `e2e/relationship-storytelling-integration-click-audit.spec.ts`

Final run status: all passed.

## 7) Issues fixed

- Added canonical app-shell rivalry route compatibility:
  - `app/app/league/[leagueId]/rivalries/[rivalryId]/page.tsx`
- Added graph-rivalry persistence bridge:
  - rivalry engine records now represented in graph edges through sync.
- Fixed manager card and graph edge drill-down continuity:
  - manager focus and rivalry context opening.
- Fixed profile deep-link behavior:
  - `?tab=evidence` now operational.
- Added missing cross-system links:
  - rivalry -> drama, profile -> trades/drama, manager card -> behavior/drama.
- Added integrated query and AI services:
  - single payload + explanation endpoints for four-system coherence.

## 8) Final QA checklist

- [x] Rivalry edges appear in graph through bridge sync.
- [x] Psychological profile context included in rivalry and drama interpretation pathways.
- [x] Drama events linked in rivalry detail payload and UI drill-down.
- [x] Unified AI context combines graph + rivalry + profile + drama.
- [x] Sport/season filters propagate across integrated drill-down links.
- [x] Graph-to-rivalry click path wired.
- [x] Rivalry-to-drama click path wired.
- [x] Profile-to-trade-context click path wired.
- [x] Back/refresh/loading/error states preserved across updated surfaces.

## 9) Unified layer explanation

The new relationship-and-storytelling layer is an additive integration plane that sits above existing engines. It does not replace graph, rivalry, profiles, or drama logic; it composes them into a coherent read/AI model and operational sync flow.

Practically, it does three things:

1. **Synchronizes structures** (graph rivalry edges from rivalry records).
2. **Composes context** (manager behavior + storyline + rivalry + graph influence).
3. **Delivers unified UX/AI** (single payload, single explain surface, deterministic drill-down paths).

This yields a production-safe foundation for commissioner media, notification hooks, and personalized storyline alerts without regressing existing subsystem ownership.
