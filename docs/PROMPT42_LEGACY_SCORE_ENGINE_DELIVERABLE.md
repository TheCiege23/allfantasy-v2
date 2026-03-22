# Prompt 42 — Legacy Score Engine + Full UI Click Audit

## 1) Legacy Score Architecture

- `lib/legacy-score-engine` is the canonical pipeline:
  - `LegacyScoreEngine`
  - `LegacyScoreCalculator`
  - `LegacyEvidenceAggregator`
  - `LegacyRankingService`
  - `SportLegacyResolver`
  - `AILegacyExplanationService`
- Persistence remains additive through:
  - `LegacyScoreRecord` (`legacy_score_records`)
  - `LegacyEvidenceRecord` (`legacy_evidence_records`)
- Engine flow:
  1. normalize sport with `SportLegacyResolver` (backed by `lib/sport-scope.ts`)
  2. seed baseline evidence if empty
  3. aggregate persisted + derived historical evidence
  4. compute dimension + overall legacy scores
  5. create/update scoped score records (idempotent refresh behavior)
- Prompt 42 hardening in this implementation:
  - expanded aggregation for manager/team/franchise contexts
  - manager identity alias resolution (roster/platform/owner variants)
  - sport-safe drill-down + explain flows end to end
  - platform leaderboard route + UI surface
  - complete click-audit coverage via Playwright

## 2) Scoring Logic

- Dimensions (0–100): championship, playoff, consistency, rivalry, awards, dynasty.
- Overall score weights:
  - championship `0.28`
  - playoff `0.20`
  - consistency `0.18`
  - rivalry `0.12`
  - awards `0.10`
  - dynasty `0.12`
- Aggregation now blends persisted evidence with league history:
  - `SeasonResult` for championships/win rate/staying power/season cadence
  - `HallOfFameRow` and `HallOfFameEntry` boosts for sustained greatness
  - `AwardRecord` contribution to awards dimension
  - `RivalryRecord` contribution to rivalry dimension
  - difficulty multiplier support from league context (dynasty + league size + tournament mode signal)
- Entity coverage:
  - `MANAGER`, `TEAM`, `FRANCHISE` all scoreable through the same engine.

## 3) Schema Additions

- Required Legacy schema already exists and is used as-is:
  - `LegacyScoreRecord`
  - `LegacyEvidenceRecord`
- No destructive schema rewrite was needed for Prompt 42 implementation.
- This iteration focused on service logic, API wiring, and UI integration on top of the existing models.

## 4) Leaderboard and Profile Integration Updates

- League legacy UI (`components/app/tabs/LegacyTab.tsx`) now includes:
  - sport + entity type filters
  - refresh
  - run engine with run summary/error status
  - inline AI explain per row
  - score breakdown links with sport-safe query params
  - comparison view (A/B legacy dimension comparison)
  - platform leaderboard deep-link
- Breakdown page (`app/app/league/[leagueId]/legacy/breakdown/page.tsx`) now:
  - accepts/passes `sport`
  - enforces response `ok` checks
  - preserves Legacy tab context in back navigation
- Legacy badge (`components/LegacyScoreBadge.tsx`) now:
  - accepts optional `sport`
  - handles non-OK responses explicitly
  - renders a clear "No legacy" state instead of disappearing silently
- Partner/profile integration:
  - `components/PartnerMatchView.tsx` now renders `LegacyScoreBadge`
  - legacy links across Reputation + Hall of Fame detail pages now preserve sport context
- Platform-level legacy leaderboard added:
  - API: `GET /api/legacy-score/leaderboard`
  - UI: `app/app/legacy-score/page.tsx`
  - Panel: `components/legacy-score/PlatformLegacyLeaderboardPanel.tsx`

## 5) Full UI Click Audit Findings

Detailed matrix: `docs/PROMPT42_LEGACY_SCORE_CLICK_AUDIT_MATRIX.md`

High-level findings:
- all audited legacy click paths are wired and stateful end to end
- fixed sport mismatch in breakdown/explain navigation
- fixed silent failure paths for run/explain requests
- added platform legacy leaderboard interactions (filters, refresh, AI explain, drill-down)
- comparison and cross-links (Legacy ↔ HoF ↔ Reputation) verified

## 6) QA Findings

- Type safety: `npm run -s typecheck` passes.
- Click-audit automation: `npx playwright test e2e/legacy-score-click-audit.spec.ts` passes.
- Lint diagnostics for touched files: clean.
- Behavior verified:
  - manager/team/franchise scoring refreshes on engine run
  - score breakdowns render correctly with dimension detail
  - sport/entity filters and refresh update leaderboard state
  - AI explanations use current record context (league-scoped endpoint)
  - Hall of Fame cross-links and back-links preserve intent/state

## 7) Issues Fixed

- **Evidence depth**: expanded `LegacyEvidenceAggregator` to incorporate awards/rivalry/history signals and difficulty context, instead of relying on sparse defaults.
- **Entity scope**: `runLegacyScoreEngineForLeague` now processes manager/team/franchise entities (not only one manager mode).
- **Identity mismatch**: added alias resolution in `LegacyRankingService` for manager lookups across roster/platform/team identifiers.
- **Sport drift**: removed hardcoded NFL fallbacks in legacy APIs; now uses `sport-scope` normalization/defaults.
- **UX resilience**: run/explain/breakdown flows now handle non-OK responses and show actionable errors.
- **Navigation correctness**: all major legacy drill-down links now carry sport context and valid back paths.
- **Platform visibility**: added platform-wide legacy leaderboard route and page with filters + explain entry points.
- **Badge audit gap**: integrated `LegacyScoreBadge` into partner match cards and hardened empty/error rendering.

## 8) Final QA Checklist

- [x] League Legacy tab loads and responds to sport + entity filters.
- [x] Refresh button re-queries current leaderboard scope.
- [x] Run legacy engine action updates and displays run summary.
- [x] Legacy comparison view updates from A/B selectors.
- [x] "Why is this score high?" links open score breakdown with correct sport.
- [x] Breakdown explain button returns explanation and handles errors.
- [x] Legacy badge renders loading/score/empty states.
- [x] Reputation and Hall of Fame cross-links to legacy breakdown carry sport.
- [x] Platform legacy leaderboard filters and refresh are wired.
- [x] Platform AI explain works for league-scoped rows.
- [x] Typecheck passes.
- [x] Legacy click-audit Playwright suite passes.

## 9) Explanation of the Legacy Score Engine

The Legacy Score Engine quantifies long-term competitive greatness across all supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). It fuses persisted evidence with league history to generate a transparent six-dimension score profile and a single overall score that remains explainable to users. Scores are stored by entity and scope, retrievable via league and platform leaderboards, and drillable through breakdown/AI explanation views. The system now supports manager, team, and franchise scoring, integrates safely with Hall of Fame and reputation surfaces, and maintains robust click-path reliability through automated end-to-end UI audit coverage.
