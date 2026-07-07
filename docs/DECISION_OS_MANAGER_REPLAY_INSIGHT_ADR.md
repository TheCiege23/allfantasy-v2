# Decision OS Replay Framework Phase 17 — Manager OS Replay Insight Surface (ADR)

**Status:** Backend contract + deterministic formatter only. Not wired to any live route, cron, or recommendation path. No production behavior changed. No Trade Learning, calibration, or production recommendation logic touched. No DB writes; no new ingestion.
**Branch:** `g15-event-foundation`
**Builds on:** `docs/DECISION_OS_DECISION_REPLAY_CORRELATION_REPORT.md` (Phases 15–16 — the validated finding this surface renders), and the existing user-safe-contract discipline in `lib/decision-os/behavioral/api/contracts.ts` + `presentation-adapters.ts` (the pattern this phase mirrors rather than reinventing).

---

## 1. Decision

Introduce a **read-only, unwired, backend-ready insight contract** (`ManagerReplayInsightSetV1`) plus a **pure, deterministic formatter** (`buildManagerReplayInsights()`, `lib/replay-framework/insights/managerReplayInsight.ts`) that translates a Phase 16 `DecisionReplayCorrelationSummary` into user-safe insight objects. This lets the strongest validated replay finding (Phase 16 §11.2 Finding B — starter-impact trades gain lineup efficiency, bench-depth trades don't) become consumable by a future Manager OS / Chimmy surface **without** exposing any replay internals and **without** changing what any production recommendation does today.

The contract exists; nothing consumes it yet. That gap is deliberate and matches every prior replay-framework module (all "not wired to any route/cron/scheduler").

---

## 2. Why replay validation can safely power Manager OS / Chimmy insights

Replay is a *validation* subsystem, not a recommendation engine — it measures how the real, unmodified production engines would have scored real historical decisions, then compares against what actually happened. That gives it a property most recommendation sources lack: **its claims are already backed by measured real outcomes, not by the model's own confidence in itself.** "Starter-impact trades gained ~+1.4 pts of lineup efficiency" is a statement about 44 real trades that really happened, not a prediction the model is grading itself on.

This is exactly what makes it safe to surface as an *insight* (a description of a validated pattern) rather than a *recommendation* (an instruction the production system stands behind). The distinction is load-bearing and is enforced structurally here:

- **The surface describes aggregate, validated patterns — it never re-scores a live decision.** The formatter reads only the aggregate rollups of a correlation summary (`byLineupInvolvement`, `avgRetainedButUnusedRate`, `matchedWindowAggregate`), never `perTradeImpacts`. It cannot emit a per-trade verdict or acceptance probability because it never sees one.
- **No production code path imports it.** The whole `lib/replay-framework/` tree remains isolated (verified every phase by `isolation.test.ts`'s recursive scan): it never imports Trade Learning, calibration, or a recommendation engine, and — critically — no production route imports *it*. Surfacing an insight is therefore a future, separately-approved wiring decision, not a side effect of this phase.
- **The user-facing vocabulary is curated, not raw.** Engine internals (`verdict`, `acceptProb`, `deltaThem`, `avgDeltaEfficiency`, replay/league/roster/player IDs, week numbers) never appear in the contract. They are translated into four user-safe categories: `starter_impact_trades`, `bench_depth_trades`, `wasted_acquisitions`, `lineup_efficiency_impact`.

---

## 3. The contract (curated V1 subset)

`ManagerReplayInsightV1` carries only: a deterministic `insightId` slug (never a replay record ID), a user-safe `category`, deterministic `headline`/`detail`/`displayValue` copy, a `sentiment` (`positive`/`neutral`/`caution`), a `confidence` (`high`/`moderate`/`low`/`insufficient`), the real `sampleSize`, and a `caveat` that is non-null exactly when confidence is low/insufficient.

`ManagerReplayInsightSetV1` wraps the insights with `scope` (`manager`/`league`/`platform`), the trade counts, a fixed `validationSource: 'decision_replay_correlation'` provenance tag, a `version`, and an injected `derivedAt`.

**Field-selection rationale (what is deliberately excluded), mirroring `contracts.ts`:** no raw IDs, no internal metric field names, no `verdict`/`acceptProb`/`confidenceScore` engine internals, no per-trade rows, no provenance beyond the single opaque `validationSource` tag. The exclusion is enforced by construction (the formatter never reads `perTradeImpacts`) and by a test that poisons `perTradeImpacts` with a sentinel string and asserts it never appears in the serialized output.

---

## 4. User-safe language mapping

| Internal replay concept | User-safe surface term | Rendering |
|---|---|---|
| `byLineupInvolvement` `starter_involved` group (`deltaThem !== 0`) | **starter-impact trade** | "Trades that upgraded your active starting lineup changed your lineup efficiency by about +1.4 pts…" |
| `byLineupInvolvement` `bench_depth` group (`deltaThem === 0`) | **bench-depth trade** | "Depth-for-depth swaps changed your lineup efficiency by about −1.1 pts…" |
| `retained_but_unused` classification (Phase 16) | **wasted acquisition** | "…about 9% of the players you brought in were kept but never entered your starting lineup." |
| `matchedWindowAggregate.avgDeltaEfficiency` | **lineup efficiency impact** | "…your overall lineup efficiency changed by about −0.1 pts — essentially unchanged." |

Efficiency deltas are rendered as signed percentage-points ("+1.4 pts efficiency"); wasted-acquisition rates as whole percents ("9% unused"). All formatting is locale-independent (`toFixed`/`Math.round`, never `toLocaleString`) so the copy is byte-stable.

---

## 5. Determinism and the low-sample caveat

**Determinism:** the formatter is a pure function of `(summary, scope)`; the only clock use is stamping `derivedAt`, which is *injected* (`options.now`) and never touches any insight string. Two calls with the same summary produce an identical `insights` array regardless of when they run — proven by a test comparing two clock-defaulted calls.

**Low-sample honesty:** confidence is gated on real backing sample size (`high` ≥30, `moderate` ≥10, `low` ≥3, `insufficient` <3 — the same "gate trust on sample" spirit as `contracts.ts`'s `trendConfidence`). This matters because the Phase 16 finding is a *cross-manager* aggregate over 141 trades, while a single real manager usually has only a handful of trades. A manager-scoped insight will therefore usually be low-sample — and in that case the `caveat` says so plainly and cites the platform-validated baseline (e.g. "+1.4 pts across 141 real validated trades") as the more reliable anchor. The surface never presents a 2-trade personal sample as if it were settled fact.

---

## 6. What this phase deliberately does NOT do

- Does not wire the contract into any route, API, cron, Chimmy prompt, or recommendation path.
- Does not change any production recommendation, score, threshold, or copy that ships today.
- Does not read or write any database (the formatter is a pure in-memory transform; the validated numbers used in tests are the already-measured Phase 16 staging results, not a fresh query).
- Does not modify Trade Learning, calibration, or any production engine.

---

## 7. How a future phase would safely wire this

1. A Manager-OS-owned resolver (outside `lib/replay-framework/`) calls `computeDecisionReplayCorrelation([leagueId])` scoped to the manager's league(s), then `buildManagerReplayInsights(summary, { scope, now })`.
2. That resolver — not this module — decides caching, auth/tenant scoping, and rate limiting, exactly as `lib/decision-os/behavioral/api/resolvers.ts` already does for the intelligence contracts.
3. The isolation boundary inverts cleanly: replay stays import-free of production; production imports the *contract*, never the replay internals. If a future wiring ever needs a per-manager number the aggregate can't provide, that is a new, explicitly-scoped correlation-query change, not a loosening of this contract.

---

## 8. Recommendation for Phase 18

1. **A thin, read-only Manager-OS resolver** that calls this formatter for a single real league and returns `ManagerReplayInsightSetV1` behind the existing intelligence-API auth/tenant gate — still display-only, no recommendation change, as its own explicitly-scoped phase.
2. **Before any live surfacing**, re-validate Finding A vs. Finding B durability on a larger trade corpus (Phase 16 §13 item 2) — the starter-impact finding (Finding B) is the one this contract leans on and is the more robust of the two, but a wider corpus would harden the base-rate numbers the caveats cite.
3. **Keep the contract display-only** until there is explicit approval to let a replay-validated pattern influence a production recommendation — that crossing (validation → recommendation) is a deliberate product decision, not an incremental engineering step, and should get its own ADR.

---

## Files changed in this session

- `lib/replay-framework/insights/managerReplayInsight.ts` (new — contract types, validated-baseline constants, deterministic formatter)
- `__tests__/replay-framework/managerReplayInsight.test.ts` (new — leak-safety, determinism, low-sample caveat, and validated-finding-rendering coverage)
- `docs/DECISION_OS_MANAGER_REPLAY_INSIGHT_ADR.md` (this document, new)

No trade-engine, lineup-optimizer, Trade Learning, calibration, or production recommendation code was modified. No route, cron, or Chimmy path imports the new module. No database was read or written. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere.
