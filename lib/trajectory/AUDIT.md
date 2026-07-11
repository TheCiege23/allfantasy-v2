# Phase 3.3 — Trajectory Foundation: Engine History Audit

> **Deliverable 1.** A documented inventory of every intelligence value Dashboard V2
> (and the wider Decision OS) might want to trend, classified by whether a **real
> historical store** already backs it. Produced **before** any implementation, per the
> phase's guiding principle: *every trend must be backed by stored historical data; if
> history does not exist, do not fabricate it, interpolate it, or imply it. Current
> state is not history.*

## Method

Read directly in `C:\tmp\af-dashboard-sprint2` (the dashboard worktree, branch chain
PRs #128→#143). For each metric: does a table/store capture it **at more than one point
in time** (so two real points can be compared), or is it only ever computed for "now"?

## Classification key

- **✅ SUPPORTED** — a real store captures this metric over time. A true trajectory is honest.
- **🟡 SUPPORTED-WHEN-POPULATED** — a real insert-only store *exists*, but rows are only
  written when a specific capture path runs. Honest empty history until then — never a
  fabricated trend.
- **⚠️ UNSUPPORTED (current-state only)** — the engine computes a value for "now" with no
  per-time store. May be shown as a value, but **must not imply movement** (no delta).

## Inventory

| Metric | Producing engine | Historical store | Verdict |
|---|---|---|---|
| Playoff probability | `lib/season-forecast` (`SeasonForecastEngine`) | `SeasonForecastSnapshot` — 1 row per `(leagueId, season, week)` | ✅ SUPPORTED |
| Championship probability | same | `SeasonForecastSnapshot` | ✅ SUPPORTED |
| First-place probability | same | `SeasonForecastSnapshot` | ✅ SUPPORTED |
| Expected wins | same | `SeasonForecastSnapshot` | ✅ SUPPORTED |
| Expected final seed | same | `SeasonForecastSnapshot` | ✅ SUPPORTED |
| Elimination risk | same | `SeasonForecastSnapshot` | ✅ SUPPORTED |
| League engagement score | `lib/decision-os/behavioral` (`league-intelligence`) | `IntelligenceLeagueSnapshotHistory` — INSERT-only ledger (`history/snapshots.ts`) | 🟡 SUPPORTED-WHEN-POPULATED |
| Trade / waiver / draft activity rate | same | `IntelligenceLeagueSnapshotHistory` | 🟡 SUPPORTED-WHEN-POPULATED |
| Player AF projection | `AFProjectionSnapshot` writer | `AFProjectionSnapshot` — per `(playerId, season, week)`, `computedAt`, `confidenceLevel` | ✅ SUPPORTED (player-level; not consumed by Dashboard V2 yet) |
| League **health** score | `lib/league-health/league-health-engine` | none found (current-only) | ⚠️ UNSUPPORTED |
| League **fairness** score | same | none — the `fairnessScore` columns in schema belong to trade-value / prestige models, not a per-time league-health store | ⚠️ UNSUPPORTED |
| League **sustainability** score | same | none found | ⚠️ UNSUPPORTED |
| Matchup projection / projected margin | `/api/leagues/[id]/matchups` (live-computed `1/(1+e^((projB−projA)/12))`) | none — recomputed each request (confirmed in Phase 3.2) | ⚠️ UNSUPPORTED |
| Injury impact / severity | `/api/ai-tools/injury-impact/dashboard` | none — current snapshot only | ⚠️ UNSUPPORTED |
| Waiver activity (dashboard) | `/api/dashboard/today-actions` | none — live | ⚠️ UNSUPPORTED |
| Recommendation count | `/api/dashboard/today-actions` | none — live | ⚠️ UNSUPPORTED |
| Lineup confidence | lineup optimizer | none — live | ⚠️ UNSUPPORTED |

## Conclusions that shape the build

1. **Season Forecast is the flagship supported source.** One real row per week, and it
   already ships a per-team `confidenceScore` — a real, source-provided confidence we can
   pass through (never invented). Six numeric fields become six honest trajectories.
2. **League engagement already has a merged, purpose-built history layer** on `main`
   (`lib/decision-os/behavioral/history/snapshots.ts` + pure `trend.ts`) whose philosophy is
   identical to this phase's (`insufficient_historical_data` is a first-class honest result,
   a flat-threshold epsilon, never interpolate). The Trajectory Foundation **generalizes that
   pattern** and **wraps that reader** — it does not reimplement or redesign it.
3. **The three other commissioner health sub-scores (health/fairness/sustainability), all
   matchup/injury/recommendation/lineup metrics are current-state only.** They get an
   explicit UNSUPPORTED adapter that yields at most one point → `delta: null`,
   `supported: false`. The value can be surfaced; movement can never be implied.
4. **No schema change is needed.** Every supported metric already has its store. This phase
   is a read-only normalization + delta layer, not new persistence.

## Future supported adapters (named, not built here)

When these engines gain a real per-time store, they slot into the same `TrajectoryAdapter`
contract with zero downstream change:

- **Matchup history** — requires the reusable snapshot service recommended in PR #143 to
  persist per-week matchup projections.
- **Injury history** — requires persisting injury-impact snapshots per week.
- **Recommendation history** — requires persisting the recommendation set per capture.
- **League health history** — requires a per-time health-score ledger (mirrors
  `IntelligenceLeagueSnapshotHistory`, which today only stores engagement + activity rates).
