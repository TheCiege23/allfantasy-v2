# Decision OS Replay Framework Phase 13 — Lineup Replay: Implementation + First Real Validation Report

**Status:** Working MVP, real staging validation run. No trade-engine, Trade Learning, calibration, or recommendation-engine code touched. No new writer/schema/isolation-test changes needed (all reused unchanged from Phase 3/11).
**Branch:** `g15-event-foundation`
**Builds on:** `docs/DECISION_OS_REPLAY_LINEUP_SCENARIO_SELECTION_ADR.md` (Phase 12 — selected Lineup Replay, added type-only scaffolding), `docs/DECISION_OS_REPLAY_FRAMEWORK_GENERALIZATION_ADR.md` (Phase 11 — the generic architecture this phase builds against).

---

## 1. What was built

Four files, mirroring Trade Replay's exact layout (per Phase 11's documented Replay Scenario shape):

- `lib/replay-framework/normalize/lineupSleeperNormalizer.ts` — converts a real Sleeper `SleeperMatchup` (one roster's one week) into `LineupReplayPayload`/`ReplayImportInput` (`decisionType: 'lineup'`). Deterministic synthetic `providerTransactionId` (`lineup-{leagueId}-roster{rosterId}-week{week}`) since a lineup decision has no natural provider transaction ID, preserving the same idempotent-upsert guarantee every other decision type gets from `writer.ts` unchanged.
- `lib/replay-framework/backtest/lineupBacktestExecutor.ts` — calls the real, unmodified `optimizeLineupDeterministic()` (`lib/lineup-optimizer-engine/`), feeding it real historical `players_points` as `projectedPoints` (a deliberate, valid reuse, not a misuse — see §2). Computes `actualPoints`/`optimalPoints`/`pointsLeftOnBench`/`efficiencyPct`/`benchValueLeft`/`pointsFromSuboptimalStarters`/`startSitMistakeCount`/mistake detail lists.
- `lib/replay-framework/ingest/ingestSleeperLineupsForLeague.ts` — per-week loop (mirroring `getAllLeagueTrades()`'s existing pattern), skips weeks with no real recorded scoring yet (Sleeper's matchups endpoint returns placeholder all-zero rows for future weeks, unlike trades where only real transactions ever appear).
- `lib/replay-framework/metrics/lineupReplayMetrics.ts` — reuses `metrics/shared.ts`'s `bucketize()`/`average()` (Phase 11's extraction). Computes average points left on bench, optimal-lineup %, weekly efficiency trend, position-level mistake counts, starter efficiency, distribution histograms.

**One framework-level generalization, informed by this real second consumer** (exactly as Phase 11 §8.1 recommended deferring until this moment): `versioning.ts`'s `computeDeterministicConfigVersion()` now accepts either a bare number (trade's original `calibratedB0` call site, byte-identical output, zero behavior change) or a generic `Record<string, string|number>` descriptor — lineup replay has no tunable calibrated config at all, so its call site passes `{}`, resolving to the stable literal `'none'`.

**23 new tests** across 4 new test files (`lineupSleeperNormalizer.test.ts`: 7, `lineupBacktestExecutor.test.ts`: 6, `ingestSleeperLineupsForLeague.test.ts`: 4, `lineupReplayMetrics.test.ts`: 6) — replay-framework's total test count rose from 68 (Phase 11) to 91, all passing. `isolation.test.ts` required **zero edits** — its recursive scan automatically covered all four new files, exactly as Phase 11 designed.

---

## 2. Why feeding real points into a `projectedPoints`-named parameter is correct, not a misuse

`optimizeLineupDeterministic()` maximizes whatever numeric value it's given per player — it has no opinion on whether that number is a forward-looking projection or a backward-looking real result. Feeding it real, historical `players_points` computes the exact, true retrospective-optimal lineup: "given what we now know actually happened, what was the best possible lineup?" This is the standard, well-understood "optimal points" / "lineup efficiency" metric used across the fantasy industry — not a workaround or reinterpretation of the engine, simply the natural backtest use of a forward-looking optimizer.

---

## 3. A genuine, load-bearing finding: the real engine has a practical roster-size ceiling

While selecting a real league for the staging validation run, ingestion against the originally-planned league ("Going Deep League," a 12-team dynasty league also used in Trade Replay's corpus) **repeatedly failed to complete** — not from a bug in this phase's code, but from a real, previously-undiscovered scalability property of `optimizeLineupDeterministic()` itself.

**Root cause, verified directly, not assumed:** the optimizer's DFS memoizes on `(slotIndex, usedMask)`, where `usedMask` is a bitmask over the *entire* roster (`lib/lineup-optimizer-engine/LineupOptimizerEngine.ts` lines 228–276). For a real dynasty roster of this league's actual size — confirmed via a direct Sleeper API check: real rosters ranged **35–40 players** — the reachable state space for filling ~8–10 real starting slots is on the order of `C(40, 8) ≈ 77 million` combinations. This is computationally infeasible in practice (the ingestion script never completed within a 6-minute timeout across three separate attempts at 18, 8, and 3 weeks).

**This is not a bug in this phase's replay glue, and this phase does not modify the optimizer** (per the explicit "do NOT build another optimizer" / do-not-modify-the-engine instruction) — it is a real, load-bearing constraint on which real leagues Lineup Replay can practically ingest today. Confirmed via a direct roster-size scan across the 8 leagues already in Trade Replay's corpus:

| League | Max real roster size | Lineup-replay-viable today? |
|---|---|---|
| Beta 1 Zombie League | 9 | **Yes — used for this phase's validation run** |
| KGBs On The Spectrum SF League | 17 | Yes |
| Jeepers Keepers! | 18 | Yes |
| Pirate League! | 18 | Yes |
| $20 Pirate League | 23 | Yes, but larger — untested this phase |
| Nfl Dreaming 2! | 35 | **No — same class of scalability failure expected** |
| Dynasty for life! | 35 | **No** |
| Going Deep League | 40 | **No — confirmed failing, this phase** |

**Recommendation, not implemented this phase:** a future phase could pre-filter each roster to a smaller, real candidate subset before calling the optimizer (e.g., only players eligible for at least one real starting slot, or the top-N players by points at each position) — this would be replay-glue work analogous to Phase 9's `providerAssetId`/`pos` translation fixes, never a modification to `optimizeLineupDeterministic()` itself. Not attempted this phase, since the selected small-roster league already provided a clean, real, honest validation run without it.

---

## 4. Real staging validation run

**League:** Beta 1 Zombie League (`1183130567676063744`) — a true redraft league, 20 rosters, real 2025 season, already an approved/ingested league from Trade Replay's Phase 9 corpus expansion (selected here specifically to reuse an already-connected, already-real league and to sidestep §3's scalability constraint).

**Ingestion result:** 18 weeks scanned, 0 weeks skipped as unscored (this league's full 2025 season is complete), **360 real `ReplayImport` + 360 real `ReplayBacktestResult` rows written, 0 errors** (20 rosters × 18 weeks). Idempotency confirmed by re-running the exact same ingestion a second time — counts stayed at 360/360, not 720/720.

**Housekeeping note, disclosed honestly:** three earlier attempts against "Going Deep League" (§3) partially wrote 149 orphaned `ReplayImport` rows (only 1 with a matching backtest) before each attempt was killed by the scalability wall. These were debris from this phase's own diagnostic process, not real validation data — deleted via a precisely-scoped query (`decisionType = 'lineup' AND providerLeagueId = '1182428029165572096'`) before this report's numbers were finalized. Trade Replay's 238/238 rows were never at risk (a different `providerLeagueId`, and the delete was scoped to that exact league).

### 4.1 Real metrics (360 real lineup decisions, 1 league, 18 real weeks, season 2025)

| Metric | Value |
|---|---|
| Avg actual points (what managers really scored) | 61.73 |
| Avg optimal points (the real, deterministic best-possible lineup) | 69.80 |
| Avg points left on bench (net: optimal − actual) | 8.07 |
| Avg bench value left (gross: real points sitting unused on the bench) | 12.94 |
| Avg points gained from suboptimal starters (gross: real points the "wrong" picks still contributed) | 4.87 |
| **Avg starter efficiency ("optimal lineup %")** | **88.36%** |
| Avg start/sit mistakes per lineup | 1.05 |

(Sanity check confirming internal consistency: `benchValueLeft (12.94) − pointsFromSuboptimalStarters (4.87) = 8.07 = pointsLeftOnBench`, exactly, as the metric definitions require.)

**Efficiency distribution:** heavily right-skewed toward high efficiency — 193 of 360 lineups (54%) landed in the 90–100% band, 86 more (24%) in 80–90%. Only 8 lineups (2%) scored below 50% efficiency. This is a real, plausible signal: most real managers in a redraft league mostly start their best players most weeks, with occasional real mistakes rather than systematic ones.

**Weekly efficiency trend ("weekly improvement"):** ranged from a low of 79.6% (week 18) to a high of 93.6% (week 8), no clean monotonic improvement trend across the season — real managers' week-to-week lineup quality fluctuates with real-world factors (injuries, bye weeks, playoff-motivation changes) more than it steadily improves, at least in this single-league sample.

**Position mistakes:** WR (135 occurrences) and RB (115) accounted for the large majority of missed-optimal-starter mistakes, TE (86) and QB (43) far fewer — consistent with WR/RB being the deepest, most flex-contested positions on a real roster (more real bench depth at those positions creates more opportunities for a real start/sit mistake), while most rosters carry only 1–2 real rostered QBs, leaving little room for a QB-position mistake to even be possible.

### 4.2 Isolation reconfirmed against real data

Measured directly, immediately after ingestion: `TradeOfferEvent` count `0`, `TradeOutcomeEvent` count `0`, `TradeLearningStats` count `0` — unaffected. Trade Replay's own corpus reconfirmed unchanged at exactly `238`/`238` replays/backtests, both before and after this phase's writes — direct proof the two decision types coexist in the same shared tables without any cross-contamination, exactly as the schema's `(provider, decisionType, providerLeagueId, providerTransactionId)` unique constraint was designed to guarantee since Phase 3.

---

## 5. Verification

- `npx vitest run __tests__/replay-framework/` — all tests pass (see §7 for the exact count), including the 4 new lineup test files.
- `npx vitest run __tests__/replay-framework/isolation.test.ts` — passes unchanged, zero edits needed for the 4 new files.
- `npx vitest run __tests__/decision-os/` — all 2422 tests pass, unaffected.
- `npx tsc --noEmit` — 158 errors, identical to the established baseline, zero new errors, none in any replay-framework file.
- Real staging isolation re-check (§4.2): `TradeOfferEvent`/`TradeOutcomeEvent`/`TradeLearningStats` all `0`; Trade Replay's 238/238 unaffected.

---

## 6. Recommendation for Phase 14

1. **Do not modify `optimizeLineupDeterministic()`.** §3's scalability finding is real, but the fix belongs in replay glue (a roster pre-filter), never in the production engine, mirroring this workstream's consistent discipline of never modifying the systems it validates.
2. **If a larger real corpus is wanted:** build the roster pre-filter sketched in §3 as its own explicitly-scoped phase, verified against real data (confirm the filtered subset still contains the true optimal lineup in realistic cases) before trusting its output the way this phase's 360-row corpus can be trusted today.
3. **Expand the current corpus** with the other three already-viable small/medium-roster leagues (KGBs On The Spectrum SF League, Jeepers Keepers!, Pirate League! — all under 20 real players) before reaching for the pre-filter — more real, unmodified-engine validation data is available today without needing item 2 at all.
4. **Cross-reference lineup efficiency against trade activity**, once both corpora are larger — an open, real question this phase's single-league sample can't answer: do managers who make more/better trades also set more optimal lineups, or are these independent skills?

---

## 7. Files changed in this session

- `lib/replay-framework/normalize/lineupSleeperNormalizer.ts` (new)
- `lib/replay-framework/backtest/lineupBacktestExecutor.ts` (new)
- `lib/replay-framework/ingest/ingestSleeperLineupsForLeague.ts` (new)
- `lib/replay-framework/metrics/lineupReplayMetrics.ts` (new)
- `lib/replay-framework/types.ts` (extended Phase 12's `LineupBacktestOutput` scaffolding with `LineupMistakeDetail`, `benchValueLeft`, `pointsFromSuboptimalStarters`, `startSitMistakeCount`, `missedOptimalStarters`, `subOptimalActualStarters`)
- `lib/replay-framework/versioning.ts` (generalized `computeDeterministicConfigVersion()`, added `LINEUP_MODEL_VERSION`; byte-identical for trade's existing call site)
- `__tests__/replay-framework/lineupSleeperNormalizer.test.ts` (new, 7 tests)
- `__tests__/replay-framework/lineupBacktestExecutor.test.ts` (new, 6 tests, real unmocked engine)
- `__tests__/replay-framework/ingestSleeperLineupsForLeague.test.ts` (new, 4 tests)
- `__tests__/replay-framework/lineupReplayMetrics.test.ts` (new, 6 tests)
- `docs/DECISION_OS_LINEUP_REPLAY_VALIDATION_REPORT.md` (this document, new)

No trade-engine file was modified. No Trade Learning code was modified. No calibration math, threshold, or weight was changed. No recommendation engine was touched. Real staging writes this phase: 360 `ReplayImport` + 360 `ReplayBacktestResult` rows (`decisionType: 'lineup'`), plus a scoped cleanup delete of 149 orphaned debris rows from this phase's own failed diagnostic attempts. `TradeOfferEvent`/`TradeOutcomeEvent`/`TradeLearningStats` remain untouched at every point. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere.
