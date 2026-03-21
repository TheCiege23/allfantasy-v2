# Prompt 32 Implementation Report
Dynasty Projection Engine + Full UI Click Audit  
Date: 2026-03-21

## 1) Dynasty projection architecture

- Added/extended a unified dynasty projection stack centered in `lib/dynasty-engine`:
  - `DynastyValueModel`
  - `AgingCurveService`
  - `DraftPickValueModel` (explicit module export)
  - `RosterStrengthCalculator`
  - `DynastyProjectionGenerator`
  - `DynastyQueryService`
  - `SportDynastyResolver`
- Kept `DynastyProjection` as the persisted output model in Prisma (`dynasty_projections`).
- Upgraded `app/api/leagues/[leagueId]/dynasty-projections` so it can auto-build team inputs from league data (teams, rosters, players, trends, and traded-pick ownership) instead of requiring manual `teamInputs`.
- Added `components/dynasty/DynastyProjectionPanel.tsx` to provide production UI controls and visualizations for dynasty projections in the league shell.

## 2) Modeling logic

- **3-year / 5-year roster strength:** uses long-horizon strength metrics from `DynastyProjectionEngine` and exposes both as first-class values in the UI.
- **Championship window score:** mapped from contender likelihood + window span into a bounded 0-100 score.
- **Rebuild probability:** preserved as a numeric 0-100 score and shown directly in cards/panels.
- **Aging risk impact:** driven by `AgingCurveService` and projected decline behavior.
- **Pick value impact:** future pick ownership is built from baseline slot ownership and traded-pick ledger, then valued through `valueFuturePicks`.
- **Future direction:** UI derives contender/transition/rebuild direction from window + rebuild metrics.

## 3) Schema additions

- No additional schema migration was required during this pass because `DynastyProjection` already existed and matched Prompt 32 output requirements:
  - `projectionId`
  - `teamId`
  - `leagueId`
  - `sport`
  - `championshipWindowScore`
  - `rebuildProbability`
  - `rosterStrength3Year`
  - `rosterStrength5Year`
  - `agingRiskScore`
  - `futureAssetScore`
  - `createdAt`

## 4) Integration with roster systems, rankings, and trade systems

- **Roster + player data integration:** `dynasty-projections` API now derives roster player IDs from both array-style and sectioned roster payloads (`players`, `starters`, `lineup_sections`, taxi/devy/IR sections).
- **Trend and injury context:** trend scores (`player_meta_trends`) and status-driven injury risk are folded into dynasty value estimation.
- **Draft pick assets integration:** traded-pick ownership and projected slot order feed future pick value.
- **Rankings and league UI integration:** `DynastyProjectionPanel` is mounted under `Standings/Playoffs` in `app/leagues/[leagueId]/page.tsx`.
- **Trade analyzer context integration:** panel includes a context link into `/trade-finder` with dynasty query params; `TradeFinderClient` now surfaces a dynasty-context banner.
- **AI integration:** `/api/dynasty-outlook` now reads sport-aware player caches and includes current dynasty projection signals in its prompt, so advice reflects current projection values.

## 5) Full UI click audit findings

Detailed matrix: `docs/PROMPT32_CLICK_AUDIT_MATRIX.md`.

Highlights:
- Added and verified end-to-end handlers for sport filter, team selector, 3y/5y toggles, refresh/reload, team comparison selectors, AI dynasty advice, trade-context link, and back navigation.
- Verified dynasty insights page controls (sport, position, age, base value, player id, refresh, AI insight).
- Ensured dashboard has a future-outlook entry point via a new dynasty outlook card.
- Added dedicated Playwright coverage for dynasty flows in `e2e/dynasty-click-audit.spec.ts`.

## 6) QA findings

- `npm run typecheck` passes.
- `npx playwright test e2e/dynasty-click-audit.spec.ts` passes (3 browsers).
- Regression: `npx playwright test e2e/simulation-click-audit.spec.ts` passes after adding dynasty-projections mock and stabilizing a flaky assertion.
- `ReadLints` reports no linter issues in modified files.

## 7) Issues fixed

- **Dynasty projections API required manual input payloads only**
  - Fixed by adding auto-generation from league roster/player/pick context in GET/POST.
- **Sport-scope drift in dynasty engine sport constants**
  - Fixed by wiring dynasty sport list/normalization to `lib/sport-scope.ts`.
- **Dynasty outlook API hardcoded NFL player cache**
  - Fixed with sport-aware cache queries and sport-aware prompt language.
- **Missing production dynasty UI controls**
  - Added `DynastyProjectionPanel` with ranking cards, selectors, toggles, comparison, charts, AI advice, refresh, and back flow.
- **Trade analyzer lacked visible dynasty context entry**
  - Added explicit context link and in-page dynasty context banner in `TradeFinderClient`.
- **Simulation E2E regression exposure**
  - Added dynasty-projections route mocking and stabilized matcher behavior.

## 8) Final QA checklist

- [x] DynastyProjection output fields are generated and persisted.
- [x] Multi-sport support uses source-of-truth sport scope (NFL/NHL/NBA/MLB/NCAAB/NCAAF/SOCCER).
- [x] 3-year and 5-year views switch correctly in UI.
- [x] Rebuild probability and championship window display correctly.
- [x] Pick value drill-down and roster strength trend graph are wired.
- [x] Team selectors and sport filters trigger backend reloads.
- [x] AI dynasty advice uses current projection context.
- [x] Trade analyzer dynasty context link is present and wired.
- [x] Back and refresh interactions are functional.
- [x] Dynasty click paths are covered by dedicated E2E audit spec.

## 9) Explanation of the dynasty projection engine

The Dynasty Projection Engine now acts as a production, sport-aware long-horizon forecasting layer. It combines roster composition, age-curve decay, injury risk, trend momentum, and future pick ownership into a normalized projection per team. Those projections power ranking cards, 3y/5y outlook switching, rebuild/window signals, comparison tools, AI advice context, and trade workflow entry points. The result is a consistent dynasty forecasting workflow across all supported sports, including formats where dynasty behavior is adapted but still represented as long-term team outlook.

