# ADR — Trajectory Foundation (Dashboard V2 Phase 3.3)

**Status:** Accepted · **Scope:** `lib/trajectory/` · **Layer:** infrastructure (no UI, no schema change)

## Context

Dashboard V2 has Predict (#141), Monitor (#143), Recommend (#142), and Explain
(#142/#143). The recurring next question — *"what changed?"* — kept surfacing
demands for momentum/trend visuals. Phase 3.2's audit established the hard
constraint: **most dashboard metrics are computed for "now" only and have no
stored history**, so a trend drawn from them would be fabricated movement.

Rather than build one-off history for one card, this phase builds the reusable
**Trajectory Foundation**: a single, provider-agnostic layer that answers
"what changed, and why" from **real stored history only**, consumable by
Dashboard V2 today and Manager / Commissioner / League / Trade / Waiver / Draft
OS and Chimmy later.

## Snapshot philosophy

- **Every point is a real, captured observation.** Nothing interpolates,
  back-fills, or synthesizes a value.
- **`< 2 points` is a first-class honest state**, not an error — `delta: null`.
- **Current state is not history.** A metric with only a "now" value gets an
  UNSUPPORTED adapter that yields ≤ 1 point (`delta: null`, `supported: false`);
  consumers may show the value but must not imply movement.
- **Confidence is never invented** — carried only when the producing engine
  reports one (e.g. Season Forecast's per-team `confidenceScore`).
- **Explanations are never invented** — `whyChanged` is real engine reasoning or
  `null`.

This mirrors the philosophy already merged in
`lib/decision-os/behavioral/history/trend.ts` (which does this for one metric);
the Foundation generalizes it rather than competing with it.

## Trajectory model

One shape for every metric (`types.ts`):

```
Trajectory {
  metricId    // "season.playoffProbability"
  current     // latest real point | null
  previous    // point compared against | null (when < 2 points)
  delta       // { absolute, percent|null, direction, confidence|null, changedAt } | null
  history     // real points, oldest → newest ([] or single allowed)
  supported   // is a real historical store behind this metric?
  whyChanged  // real engine reasoning | null
}
```

- **Delta Engine** (`delta.ts`, pure): `computeDelta(prev, curr, {flatEpsilon})`
  → absolute, percent (`null` when previous is 0 — no denominator), direction
  (`up`/`down`/`flat` with a per-call epsilon), confidence (current point's, or
  `null`), `changedAt`. `deriveTrajectoryCore` sorts by ISO timestamp and picks
  current/previous.
- **Service** (`service.ts`): `getTrajectory(adapter, params, opts)` — the one
  entry point. Thin: load → derive → explain; owns no metric logic and no math.
- **Explain** (`explain.ts`): `resolveWhyChanged` — adapter reasoning, else the
  current point's `reason`, else `null`; only when a change exists.

## Adapter model

`TrajectoryAdapter<Params>` = `{ metricId, supported, load(params), explainChange? }`.
Adapters own all IO and normalization; the service and delta engine stay pure and
DB-free. Each adapter's pure normalizer is exported and unit-tested without a DB;
the DB read sits behind injectable deps.

## Supported engines (built here)

| Adapter | Store | Notes |
|---|---|---|
| **Season Forecast** (`createSeasonForecastAdapter`) | `SeasonForecastSnapshot` (1 row / league·season·week) | 6 fields: playoff/champ/first-place prob, expected wins, seed, elimination risk. Passes through the engine's `confidenceScore`. **Flagship supported source.** |
| **League Engagement** (`createLeagueEngagementAdapter`) | `IntelligenceLeagueSnapshotHistory` (INSERT-only) | WRAPS the merged `decision-os/behavioral/history` reader. `supported: true`, but returns `[]` until the intelligence capture path writes rows — honest empty, never fabricated. |

## Unsupported engines (honest, current-state only)

Served by `createCurrentStateAdapter` (`supported: false`, ≤ 1 point): league
**health / fairness / sustainability**, matchup projected margin, injury impact,
recommendation count, lineup confidence. No per-time store exists for these; see
AUDIT.md.

## Future extensions (named, zero downstream change)

When a real per-time store lands, drop in a supported adapter under the same
contract: **Matchup history** (needs the PR #143 snapshot service), **Injury
history**, **Recommendation history**, **League Health history** (a per-time
ledger mirroring the engagement one). Consumers keep reading `Trajectory`
unchanged.

## Consequences

- **+** One trustworthy trend source for the whole platform; honest by
  construction; no schema change; no UI change (Dashboard V2 looks identical).
- **+** Real momentum visuals become a thin presentation task later, gated on
  `supported` and a non-null `delta`.
- **−** Only two metrics have real history today; most trend UIs must wait on the
  future stores above. This is the correct, honest limit — not a gap to paper over.

## Alternatives rejected

1. **Per-card ad-hoc history** — duplicated storage, drift, fabrication risk.
2. **Reimplementing trend math** — `decision-os/behavioral/history/trend.ts`
   already embodies the philosophy; we generalize and wrap it instead.
3. **Synthesizing points from current state** — violates the guiding principle
   outright.
