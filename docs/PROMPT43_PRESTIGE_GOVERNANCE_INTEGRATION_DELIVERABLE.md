# Prompt 43 — AI Commissioner + Reputation + Hall of Fame + Legacy Integration Layer

## 1) Integration architecture

The platform now has a unified prestige/governance layer that coordinates commissioner trust, reputation, Hall of Fame, and legacy score context without replacing any existing engine.

- Core modules are centralized in `lib/prestige-governance/`:
  - `PrestigeGovernanceOrchestrator`
  - `CommissionerTrustBridge`
  - `HallOfFameLegacyBridge`
  - `UnifiedPrestigeQueryService`
  - `SportPrestigeResolver`
  - `AIPrestigeContextResolver`
- Sport handling is normalized through `lib/sport-scope.ts` and `SportPrestigeResolver`, supporting:
  - NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER
- Existing systems were preserved and integrated additively:
  - AI Commissioner
  - Reputation
  - Hall of Fame
  - Legacy Score
  - league intelligence graph and related explain surfaces

## 2) Backend orchestration updates

- Added new unified route: `GET /api/leagues/[leagueId]/prestige-governance`
  - Returns `aiContext` for all authenticated users.
  - Returns commissioner-only `snapshot` and `commissionerContext` when caller is commissioner.
  - Supports targeted summary payloads (`managerSummary`, `teamSummary`) and snapshot controls (`includeSnapshot`, `summaryLimit`, `sport`).
- Extended `GET /api/leagues/[leagueId]/prestige-context`:
  - Added optional `includeSnapshot=true` path through `buildPrestigeGovernanceSnapshot`.
  - Removed duplicate commissioner trust querying by passing precomputed commissioner context into `buildAIPrestigeContext`.
- Improved graph integration in `POST /api/leagues/[leagueId]/graph-insight`:
  - Prestige context now receives the same sport passed to graph analysis (no longer hardcoded/null fallback).
- Integrated AI Commissioner explain path with unified context:
  - `POST /api/leagues/[leagueId]/ai-commissioner/explain` now includes:
    - `buildAIPrestigeContext(...)`
    - unified manager summaries for related managers.
- Hall of Fame API bridge wiring:
  - `GET /api/leagues/[leagueId]/hall-of-fame/entries/[entryId]` now includes bridged `legacy` payload when available.
  - `GET /api/leagues/[leagueId]/hall-of-fame/moments/[momentId]` now includes `relatedLegacy` map (manager legacy context).
- `HallOfFameLegacyBridge` improvements:
  - league-scoped lookup support (`entryId`/`momentId` + `leagueId`).
  - batched manager legacy resolution for moment enrichment.
- `UnifiedPrestigeQueryService` improvements:
  - manager batch query now honors `entityIds` fallback for manager resolution.
  - new `getUnifiedTeamSummaries(...)` for team/franchise batch integration.

## 3) UI integration points

- `CommissionerTab`:
  - Added live prestige snapshot panel (coverage + trust signal counts + sample manager trust/legacy rows).
  - Uses `GET /api/leagues/[leagueId]/prestige-governance`.
- `AICommissionerPanel`:
  - Alert manager chips now include direct links to:
    - trust context (`Settings -> Reputation` with `reputationManagerId`)
    - legacy breakdown (`/legacy/breakdown?...` with sport).
- `ReputationPanel`:
  - Consumes and displays unified AI prestige hint (`combinedHint`) from `prestige-context`.
  - Legacy drilldown CTA uses `Link` and dedicated test id for click audit.
- Hall of Fame detail pages:
  - Entry detail shows inline legacy context block when bridged legacy exists.
  - Moment detail now links related teams (not just managers) to legacy breakdown.
  - Moment detail displays manager legacy score in related-manager links when available.
- `LeagueShell`:
  - Tab changes now preserve existing query params (`settingsTab`, `reputationManagerId`, etc.) while updating `tab`.

## 4) AI integration points

- Unified AI prestige context now supports precomputed commissioner trust context to avoid duplicate backend work.
- AI Commissioner explain prompt now receives:
  - governance alert context,
  - dispute context,
  - prestige context (trust/history/legacy),
  - unified manager summaries.
- League intelligence graph explanations now consume sport-consistent prestige hints.
- Existing explain systems remain intact and reusable:
  - `reputation/explain`
  - `legacy-score/explain`
  - `hall-of-fame/tell-story`
  - graph insight explain flows.

## 5) Full UI click audit findings

Audited cross-system click paths across commissioner, reputation, Hall of Fame, legacy, and related drill-downs:

- Commissioner -> Reputation/Legacy/HoF links: handler + route + state wiring verified.
- AI Commissioner alert manager chips -> Trust/Legacy: added and verified.
- Reputation -> Legacy breakdown/HoF/Legacy leaderboard/Commissioner: wired and verified.
- HoF entry -> legacy breakdown: wired and verified (plus in-page legacy context render).
- HoF moment -> manager + team legacy links: team link path added and verified.
- Legacy and legacy-breakdown back/bridge links to reputation and HoF: verified.
- Filters and reload behavior verified:
  - sport/season/tier filters (reputation)
  - sport/entity filters (legacy)
  - HoF season/sport/category filters
  - refresh/run actions reload data from APIs.
- Loading/error states and back navigation behavior validated in targeted and existing click-audit suites.

## 6) QA findings

- `npm run -s typecheck`: pass.
- Lints for all Prompt 43 touched files: pass.
- Playwright click-audit suites executed:
  - `e2e/ai-commissioner-click-audit.spec.ts`
  - `e2e/reputation-system-click-audit.spec.ts`
  - `e2e/hall-of-fame-click-audit.spec.ts`
  - `e2e/legacy-score-click-audit.spec.ts`
  - `e2e/prestige-governance-integration-click-audit.spec.ts` (new)
- Result: **24 passed**.

## 7) Issues fixed

1. Tab switches dropped contextual query params (`settingsTab`, `reputationManagerId`) -> fixed in `LeagueShell`.
2. Graph AI prestige hint could mismatch selected sport -> fixed to pass current graph sport.
3. `prestige-context` duplicated commissioner trust work -> deduped with precomputed context injection.
4. AI Commissioner explanations lacked unified trust/legacy/HoF context -> integrated prestige and manager summaries.
5. HoF detail APIs lacked bridged legacy payloads -> added `legacy` and `relatedLegacy` enrichment.
6. HoF moment UI linked managers only -> added team legacy links.
7. Reputation panel lacked unified AI prestige display -> added combined prestige hint section.
8. Commissioner alerts exposed manager IDs without direct trust/legacy drill-down -> added links.
9. Team/franchise batch summary path was incomplete in prestige query service -> added team summary batch API.

## 8) Final QA checklist

- [x] Commissioner views can read trust + history + legacy context.
- [x] Reputation views connect to evidence and prestige context.
- [x] HoF entries/moments connect to legacy context (manager + team).
- [x] AI explanations combine governance/trust/history/prestige where appropriate.
- [x] Sport context preserved across NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- [x] Filters propagate and linked views remain coherent.
- [x] Back/refresh/loading/error states audited for integrated surfaces.
- [x] End-to-end click paths validated via Playwright integration and subsystem audits.

## 9) Unified prestige/governance layer explanation

The unified prestige/governance layer is now a reusable orchestration tier that connects how the platform governs behavior and preserves greatness:

- **Governance/trust** from Reputation and AI Commissioner.
- **Historical prestige** from Hall of Fame.
- **Long-term performance legacy** from Legacy Score.
- **AI explainability** through shared prestige context for commissioner and graph intelligence surfaces.

This gives league, manager, team, and admin surfaces a consistent cross-system narrative and a production-safe integration contract for future moderation, notification, and media features.
