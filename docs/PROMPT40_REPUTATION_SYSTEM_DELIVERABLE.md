# Prompt 40 — Reputation System + Full UI Click Audit Deliverable

## 1) Reputation system architecture

The production reputation stack is now fully wired as an evidence-driven trust system centered on `lib/reputation-engine`:

- `ReputationEngine`
- `ReputationScoreCalculator`
- `ReputationTierResolver`
- `ReputationEvidenceAggregator`
- `ManagerTrustQueryService`
- `SportReputationResolver`
- `ReputationConfigService` (new runtime config module)

The implementation remains additive and preserves existing manager profiles, league history, trade systems, commissioner surfaces, dispute/AI commissioner systems, dashboards, and league pages.

Design characteristics:

- Sport scope always resolved through `lib/sport-scope.ts` (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
- Evidence-first score generation with deterministic derived signals and persisted evidence rows.
- Configurable tier thresholds and scoring weights by league/sport/season.
- Explainable outputs through AI-assisted narrative + evidence drill-down.

## 2) Scoring logic

Scores are computed per manager from evidence dimensions:

- reliability
- activity
- trade fairness
- sportsmanship
- commissioner trust
- toxicity risk
- league participation quality
- responsiveness

Implemented scoring flow:

1. `refreshDerivedEvidenceForManager(...)` derives evidence from:
   - team activity recency
   - waiver activity
   - trade fairness/volume patterns
   - AI commissioner alert history (collusion/dispute/inactivity/approval signals)
   - dues/payment indicators (when present in league settings arrays)
2. `aggregateReputationEvidence(...)` converts evidence to dimension values.
3. `computeDimensionScores(...)` applies configurable weights.
4. `resolveReputationTier(...)` maps overall score to configurable tiers.
5. Engine upserts the manager reputation record for selected sport/season.

Tier set remains:

- Legendary
- Elite
- Trusted
- Reliable
- Neutral
- Risky

## 3) Schema additions

`prisma/schema.prisma` was extended for full Prompt 40 scope:

- `ManagerReputationRecord`
  - added `season`
  - unique scope is now `[leagueId, managerId, sport, season]`
  - added season-aware indexing
- `ReputationEvidenceRecord`
  - added `season`
  - added season-aware indexing
- `ReputationConfigRecord` (new)
  - `leagueId`, `sport`, `season`
  - `tierThresholds` (JSON)
  - `scoreWeights` (JSON)
  - unique scope per league/sport/season

These changes enable season filtering and configuration without breaking legacy surfaces.

## 4) Profile and trust integration updates

Backend/API additions and updates:

- Updated routes:
  - `GET /api/leagues/[leagueId]/reputation` now supports `sport`, `season`, `tier`, `limit`
  - `GET /api/leagues/[leagueId]/reputation/evidence` now supports `season`, `evidenceType`
  - `POST /api/leagues/[leagueId]/reputation/run` now accepts `sport`, `season`
  - `POST /api/leagues/[leagueId]/reputation/explain` now uses AI narrative with evidence context
- New routes:
  - `GET /api/leagues/[leagueId]/reputation/compare`
  - `GET/PATCH /api/leagues/[leagueId]/reputation/config` (PATCH commissioner-guarded)

UI integration updates:

- `components/app/settings/ReputationPanel.tsx` upgraded to include:
  - sport/season/tier filters
  - refresh/run actions
  - configurable tier/weight editor + save action
  - manager evidence drill-down
  - AI “Explain reputation”
  - manager comparison view
  - commissioner trust context summary
  - trade fairness context link and legacy drill-down link
  - explicit loading/error states
- `components/ReputationBadge.tsx` upgraded:
  - robust loading/error/no-data state (no silent disappearance)
  - optional trade fairness display
- `components/PartnerMatchView.tsx` upgraded:
  - trust context deep-link into Reputation settings
  - trade fairness context display in partner cards
- `app/api/trade-partner-match/route.ts` now enriches partner cards with reputation/trade fairness context.
- `components/app/tabs/LegacyTab.tsx` trust link fixed to deep-link `settingsTab=Reputation`.

## 5) Full UI click audit findings

See `docs/PROMPT40_REPUTATION_CLICK_AUDIT_MATRIX.md`.

Audit outcome:

- 28 reputation-related interaction paths audited
- `PASS`: 23
- `FIXED`: 5

Fixed issues centered on:

- stale/no-op badge fallback behavior
- broken trust deep-linking from Legacy/Trade Partner surfaces
- missing manager comparison action flow
- absent season/sport filtering on reputation reads
- weak error handling on reputation fetch paths

## 6) QA findings

Validation outcomes:

- Reputation scores recompute correctly from derived + stored evidence.
- Tier resolution responds to configured thresholds.
- Evidence drill-down is filterable and scoped by manager/sport/season.
- Manager comparison path loads both profiles through compare API.
- Trade partner cards now read/display trust + trade fairness context.
- AI explanation uses current reputation + evidence payload.
- Commissioner trust context is surfaced in reputation UI.
- Reputation click paths are wired with handlers/state/API/reload verification.

Automated checks run:

- `npm run -s typecheck`
- `npm run test:e2e -- "e2e/reputation-system-click-audit.spec.ts" --project=chromium`
- `npm run test:e2e -- "e2e/reputation-system-click-audit.spec.ts" "e2e/ai-commissioner-click-audit.spec.ts" "e2e/commissioner-lineup-click-audit.spec.ts" --project=chromium`

## 7) Issues fixed

- Added season-aware reputation/evidence persistence and querying.
- Added persisted configurable runtime config for thresholds/weights.
- Implemented derived evidence ingestion from team activity, waivers, trades, and AI commissioner governance signals.
- Upgraded reputation explain endpoint to AI-backed narrative with evidence context fallback.
- Added manager comparison API and UI flow.
- Hardened badge behavior to prevent dead/blank trust indicators.
- Fixed trust drill-down navigation from legacy and trade partner surfaces.

## 8) Final QA checklist

- [x] Reputation scores calculate from evidence and persist.
- [x] Tier thresholds are configurable and applied.
- [x] Sport and season filters update API queries and UI state.
- [x] Evidence drill-down loads current manager evidence.
- [x] Manager comparison view loads and renders.
- [x] Trade analyzer context can display trust/trade fairness.
- [x] AI explain uses current reputation data and evidence.
- [x] Reputation-related click paths audited for handler/state/API/persist.
- [x] Existing AI commissioner and lineup commissioner click audits still pass.

## 9) Explanation of the reputation system

The Reputation System is now a configurable trust intelligence layer that continuously transforms league behavior into explainable manager trust scores. It combines objective activity/fairness/sportsmanship signals with commissioner-governance context, then resolves each manager into a tier that can be tuned per league/sport/season.

It is safe and operationally transparent:

- Scores are evidence-backed (not opaque heuristics).
- Tiers and weights are explicitly configurable.
- Explanations and evidence drill-down are accessible from reputation UI.
- Trust context is reusable by commissioner and trade workflows.
