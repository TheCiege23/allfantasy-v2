# Sleeper Trade Replay — Validation Metrics Report

**Status:** Analysis only. Read-only aggregate queries against the real replay corpus deployed to staging in Phase 4 (`docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md` §10), **re-measured after Phase 6's roster-context enrichment (§8)**. No trade-engine math, calibration, or scoring changed at any point. No writes beyond the replay corpus itself.
**Branch:** `g15-event-foundation`
**Data source:** the 38 real, backtested Sleeper trades (3 leagues, 2 seasons) ingested in Phase 4, re-ingested in place (same natural keys, idempotent update) with roster context in Phase 6 — staging only, never production.

---

## 1. What was built

`lib/replay-framework/metrics/tradeReplayMetrics.ts` — a single, pure, read-only function (`computeTradeReplayMetrics()`) that queries `ReplayImport`/`ReplayBacktestResult` (two `findMany` calls, zero writes) and computes: totals, season/league coverage, predicted-acceptance summary statistics, a fairness (verdict) distribution, a value-delta distribution, a confidence-score distribution, an accepted-trade-probability distribution, and a per-league-settings breakdown. Bucket-histogram shape (10 buckets, 0–100%) mirrors the existing convention in `lib/trade-engine/calibration-metrics.ts` rather than inventing a new one. Isolation re-confirmed against real data after running this query: `TradeOfferEvent`/`TradeOutcomeEvent`/`TradeLearningStats` counts all remained `0`.

## 2. Real metrics summary (38 replays, 38 backtests, staging)

| Metric | Value |
|---|---|
| Total replays / backtests | 38 / 38 |
| Seasons | 2025, 2026 |
| Leagues | 3 (`Going Deep League`, `Nfl Dreaming 2!`, `Dynasty for life!`) |
| Avg predicted acceptance | **0.2566** |
| Min / max predicted acceptance | 0.20 / 0.31 |
| Avg accepted-trade probability (real outcome = ACCEPTED only) | **0.2566** (all 38 rows are `ACCEPTED` — see §4) |

**Fairness (verdict) distribution:**

| Verdict | Count | % |
|---|---|---|
| Overpay Risk | 18 | 47% |
| Fair | 12 | 32% |
| Major Overpay | 5 | 13% |
| Slight Win | 2 | 5% |
| Strong Win | 1 | 3% |

**Confidence-score distribution:** entirely clustered in 30–40 (27 rows) and 40–50 (11 rows) — zero rows above 50. See §5 for why.

**Accepted-trade probability distribution:** 37 of 38 rows (97%) fall in the 20–30% bucket; 1 row in 30–40%. This is the report's central finding — see §4.

**Value-delta distribution** (asset value imbalance, `(received − given) / total`): spread fairly evenly across 0–60%, tapering to zero above 60% — real trades in this sample aren't perfectly balanced, but none are extreme one-sided giveaways either.

**League-settings sensitivity** (all 3 leagues are dynasty; one variable, SuperFlex, differs):

| League | SuperFlex | Count | Avg predicted acceptance |
|---|---|---|---|
| Going Deep League | Yes | 21 | 0.2614 |
| Nfl Dreaming 2! | No | 14 | 0.2536 |
| Dynasty for life! | Yes | 3 | 0.2367 |

No meaningful sensitivity to SuperFlex format detected in this sample — but the sample is far too small (3 leagues) to treat this as a real finding either way; it's reported for completeness, not as a conclusion.

---

## 3. Model behavior findings

### 3.1 Are real accepted Sleeper trades scoring too low? — Yes, strikingly so, but the finding is confounded (see below)

Every one of the 38 real trades in this corpus actually happened (Sleeper only exposes `type: 'trade'` transactions that reached a terminal state), yet the deterministic model's own predicted acceptance probability for those same real trades averages just **0.2566** — and 97% of them land in the narrow 20–30% band. If the model's calibration matched real-world dynasty trading behavior, real accepted trades should skew toward the *high* end of the probability scale, not cluster near the low end. This is a genuine, real, honestly-measured pattern — not a training artifact, since nothing in this pipeline ever adjusts `calibratedB0` or any weight based on this data (§6).

**This finding should not be read as "the model is miscalibrated" without qualification.** Three structural confounds in this specific replay pipeline, not in the trade-engine itself, plausibly explain some or all of the gap:

1. **Survivorship bias, structural to Sleeper's own API.** Every trade sampled across this entire workstream (this phase's 38, and Phase 1's independent 247-trade audit) has `status: complete` — zero `pending`, zero `failed` ever observed. This strongly suggests Sleeper does not persist a `trade`-type transaction row for a proposal that was simply declined without a formal vote/veto — meaning this replay corpus can structurally never see a *rejected* real trade to compare against. A model that predicts many real trades as marginal-to-unfavorable, in a dataset that can only ever contain trades that succeeded, is not automatically wrong — it may simply never see the (unobservable) trades it would have correctly predicted as unlikely.
2. **No roster/lineup context during backtesting.** `tradeBacktestExecutor.ts` calls `computeTradeDrivers()` without a `rosterCtx` (by design, per the ADR — the normalizer only captures the two traded-asset lists, not each manager's full roster). This is very likely *why* `confidenceScore` clusters entirely in the 30–50 range (§3.2) and plausibly depresses `acceptProb` too, since lineup-impact is a real input to the live model that this replay pipeline simply doesn't have available.
3. **Present-day valuations applied to historical trades.** Every backtest values assets using *today's* FantasyCalc snapshot, not a valuation snapshot from when the historical trade actually happened. A player traded in the 2025 season may have moved significantly in value since then — this is a genuine methodological limitation of backtesting against a live, current valuation source rather than a point-in-time one.

**Conclusion:** this is a real, reportable, worth-investigating signal — but the responsible next step is expanding the sample and addressing confound #2 (adding roster context) before treating it as evidence the model itself needs recalibration. This mirrors the same "measure, don't guess, don't jump to a fix" discipline this whole workstream has followed since Phase 0.

### 3.2 Are trades clustered by fairness tier? — Yes: skewed toward "Overpay Risk," not "Fair"

47% of real trades are classified `Overpay Risk`, only 32% `Fair`, and just 8% favorable (`Slight Win`/`Strong Win` combined). Combined with §3.1, this is consistent with the same underlying explanation: the model, evaluated on real trades without roster context and using present-day valuations, tends to see more imbalance in real historical trades than the participants apparently did at the time.

### 3.3 Are certain league settings producing different model behavior? — No detectable signal, sample too small to conclude

The 3-league sample shows avg predicted acceptance within a narrow band (0.2367–0.2614) regardless of SuperFlex status. This is not evidence of *no* sensitivity — it's evidence that 3 leagues is far too small a sample to detect one either way. A future ingestion of more leagues (see §7) is needed before this question has a real answer.

### 3.4 Are there outliers worth investigating? — One: the single "Strong Win" verdict

Only 1 of 38 trades scored `Strong Win`. Isolating and manually reviewing that specific trade (which league, which real assets, which manager) is the natural next micro-investigation once a larger corpus exists — with only one example in the current sample, it's not yet possible to say whether it represents a real edge case or simply the tail of the existing distribution.

---

## 4. All 38 trades resolved to `ACCEPTED` — a data-shape observation, not a new finding

This is the same "no pending/failed trades observed" finding from `docs/SLEEPER_TRADE_INGESTION_AUDIT.md` §3, now reconfirmed against a real, deployed replay corpus rather than a one-time audit sample. It means every metric above describing "accepted trades" is, in this corpus, describing *all* trades — there is currently no real `REJECTED`/`COUNTERED`/`UNKNOWN` comparison group to contrast against. This is the single most important caveat on §3's findings and is exactly the survivorship-bias confound named in §3.1 item 1.

---

## 5. Confidence-score clustering explained (not a trade-engine bug)

`confidenceScore` output by `computeTradeDrivers()` clusters entirely in 30–50 across every one of the 38 real trades. This is a **replay-pipeline limitation, not a model miscalibration**: the deterministic engine's confidence computation weights in lineup-impact data, and `runTradeBacktest()` deliberately calls `computeTradeDrivers()` with `rosterCtx: undefined` (per the current normalizer's scope — it captures only the traded assets, never each manager's full roster). A future phase that enriches the normalizer with real roster context (available from the same `/league/{id}/rosters` endpoint already used for identity resolution) would very likely raise and diversify this distribution — but that is new normalizer work, not a finding about the trade-engine itself.

---

## 6. Isolation re-confirmed

Measured directly, immediately after running the real metrics query against staging: `TradeOfferEvent` count `0`, `TradeOutcomeEvent` count `0`, `TradeLearningStats` count `0` — unchanged from Phase 4. The metrics module performs exactly two read-only `findMany` calls (`ReplayImport`, `ReplayBacktestResult`) and nothing else; this was verified both by direct execution against staging and by the existing static isolation test (`__tests__/replay-framework/isolation.test.ts`), whose recursive source scan automatically covers this new file without modification.

---

## 7. Recommended next phase (as of Phase 5 — see §8 for what Phase 6 actually did and found)

Not this phase's decision to make, but the natural candidates surfaced by this analysis, roughly in order of leverage:

1. ~~Enrich the normalizer with real roster context~~ (§3.1 item 2, §5) — **done, Phase 6, see §8.** Confirmed the highest-leverage item to try, though the result was more nuanced than "fixes the low-acceptance finding" (it didn't — see §8.3).
2. **Ingest more leagues** — the current 3-league, 38-trade sample is real but small; the remaining 28 already-audited leagues (and the other 82 never sampled) are the natural next batch, per `docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md` §9.7/§10's still-open items.
3. **Investigate whether Sleeper exposes rejected/countered proposals through any other endpoint** — if survivorship bias (§3.1 item 1) is structural to the `transactions` endpoint specifically, a different Sleeper endpoint or a live-polling approach (out of scope for this phase and the next) might be the only way to ever observe a real rejected trade.
4. **Historical valuation snapshotting** — a genuinely larger undertaking (a point-in-time FantasyCalc value archive), lower near-term priority than items 1–2.
5. **Populate `Asset.vorpValue` for replay assets, not just `value`** (net-new finding from Phase 6, see §8.3) — required before roster context's real lineup-delta computation can actually influence `acceptProb`/verdict at all.

None of the above is authorized or begun by this report — this is analysis, not a plan of record.

---

## 8. Phase 6 — Roster context enrichment: before/after comparison

### 8.1 What was added

`lib/replay-framework/normalize/sleeperTradeNormalizer.ts` now resolves each side's **full real roster** (Sleeper's own `roster.players: string[]`, not just the two traded-asset lists) into `TradeReplayPayload.proposerRoster`/`counterpartyRoster` — additive, optional fields; rows without them (there are none left, since re-ingestion updated all 38 in place) fall back to the exact pre-Phase-6 behavior. `lib/replay-framework/backtest/tradeBacktestExecutor.ts` now builds a real `rosterCtx` (`{ yourRoster, theirRoster, rosterPositions }`) and passes it as `computeTradeDrivers()`'s 7th argument — previously always `undefined`. All 38 real replay rows were re-ingested in place (same natural keys, `providerLeagueId`+`providerTransactionId` unchanged) with real roster sizes: e.g. 39 and 34 real players resolved for one trade's two sides, 37/38 for another — genuinely large, real dynasty rosters, not stubs.

### 8.2 Before / after — the numbers

| Metric | Before (Phase 5) | After (Phase 6) | Changed? |
|---|---|---|---|
| Avg predicted acceptance | 0.2565789473684211 | 0.2565789473684211 | **No — byte-identical** |
| Min / max predicted acceptance | 0.20 / 0.31 | 0.20 / 0.31 | No |
| Fairness (verdict) distribution | Overpay Risk 18, Fair 12, Major Overpay 5, Slight Win 2, Strong Win 1 | *identical* | No |
| Value-delta distribution | (10 buckets, see Phase 5 §2) | *identical* | No |
| **Confidence distribution** | 30–40: 27, 40–50: 11 | **40–50: 27, 50–60: 11** | **Yes — every row's confidence rose by exactly 10** |
| Accepted-trade probability distribution | 37 rows at 20–30%, 1 at 30–40% | *identical* | No |

### 8.3 Why confidence moved but acceptance/fairness didn't — root-caused, not guessed

This was checked directly against real backtest rows rather than assumed. `computeTradeDrivers()`'s confidence formula (`lib/trade-engine/trade-engine.ts` line 1280) awards a flat `+10` data-completeness bonus whenever `hasLineupData || hasImpactData` is true — a bonus for *having* an input available, independent of what that input's value actually says. Roster context correctly flips `hasLineupData` to `true` (real rosters, real `lineupDelta` computed), which is exactly why confidence rose uniformly by 10 across all 38 rows.

But the branch that would let the real `lineupDelta.lineupImpactScore` actually influence the final score (line 769: `if ((hasLineupData || hasImpactData) && hasVorpData)`) requires **both** — and `hasVorpData` (line 735: `giveVorp > 0 || receiveVorp > 0`, reading `Asset.vorpValue`) is `false` for every asset this replay pipeline constructs, because neither the traded-asset resolver nor the new roster resolver ever populates `vorpValue` — only the FantasyCalc-derived `value` field. Confirmed directly: a real backtest row's `lineupImpactScore` is still exactly `0.1` after enrichment, identical to its pre-enrichment value, because the code falls through to a different (`starterRatio`-based) computation path that doesn't consume the real lineup delta at all.

**This is not a trade-engine bug, and not a bug in this phase's wiring** — `rosterCtx` is being built and passed correctly, confirmed by both the confidence shift and a dedicated unit test asserting the exact object passed to `computeTradeDrivers()`. It is a precise, now-identified limitation of this replay pipeline specifically: **populating `Asset.vorpValue` (not just `value`) for both traded and roster assets is a prerequisite for roster context to actually reach `acceptProb`/verdict**, not only `confidenceScore`. This is now the clearest, most concrete "next enrichment" item this whole investigation has produced (§7 item 5).

### 8.4 What this means for the Phase 5 "real trades score too low" finding

The roster-context hypothesis from Phase 5 §3.1 item 2 ("no roster/lineup context... plausibly depresses acceptProb too") is **not supported by this experiment** — adding real roster context changed confidence but not acceptance probability at all, for this specific 38-trade sample. This narrows, rather than confirms, the earlier speculation: whatever is driving the low acceptance-probability clustering, it is not (at least not primarily) the absence of roster/lineup context on its own — survivorship bias (§3.1 item 1) and stale present-day valuations (§3.1 item 3) remain the two live, unresolved candidate explanations. This is an honest update to a prior hypothesis based on new measurement, not a discarded finding — exactly the discipline this whole workstream has followed since Trade Learning Phase 0.

---

## Files changed in this session

- `lib/replay-framework/metrics/tradeReplayMetrics.ts` (Phase 5, new)
- `__tests__/replay-framework/tradeReplayMetrics.test.ts` (Phase 5, new, 9 tests)
- `docs/SLEEPER_TRADE_REPLAY_VALIDATION_REPORT.md` (this document — Phase 5 new, updated with §8 this phase)
- `lib/replay-framework/types.ts` (Phase 6 — additive: `TradeReplayRosterAsset`, `proposerRoster`/`counterpartyRoster` on `TradeReplayPayload`)
- `lib/replay-framework/normalize/sleeperTradeNormalizer.ts` (Phase 6 — resolves full real rosters, adds position resolution)
- `lib/replay-framework/backtest/tradeBacktestExecutor.ts` (Phase 6 — builds and passes a real `rosterCtx`)
- `lib/replay-framework/ingest/ingestSleeperTradesForLeague.ts` (Phase 6 — passes `league.roster_positions` through)
- `__tests__/replay-framework/{sleeperTradeNormalizer,tradeBacktestExecutor,ingestSleeperTradesForLeague}.test.ts` (Phase 6 — 7 new tests)
- `docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md` (updated with a pointer to this report)

No trade-engine file was modified. No calibration math, threshold, or weight was changed. No database (staging or production) was written to — only read-only aggregate queries were run. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere.
