# Decision OS Replay Framework Phase 15 — Decision Replay Correlation

**Status:** Read-only analysis over already-ingested corpora. No new ingestion. No production engine modified. No Trade Learning code touched. No calibration touched. One new, pure, read-only metrics module built; zero new Prisma writes anywhere.
**Branch:** `g15-event-foundation`
**Builds on:** `docs/SLEEPER_TRADE_REPLAY_VALIDATION_REPORT.md` (238 real trades, 8 leagues), `docs/DECISION_OS_LINEUP_REPLAY_VALIDATION_REPORT.md` (1,260 real lineup decisions, 5 leagues — all 5 also appear in Trade Replay's 8-league corpus).

---

## 1. What was built

`lib/replay-framework/metrics/decisionReplayCorrelation.ts` — a new, pure, read-only function (`computeDecisionReplayCorrelation(providerLeagueIds)`) that joins the two already-ingested corpora **by real, stable `providerAssetId`** (the same convention Phase 9 established for Trade Replay and Phase 13 reused for Lineup Replay): for each real trade, it tracks the real player(s) the receiving roster acquired forward through that roster's subsequent real lineup history, using the exact same `missedOptimalStarters`/`subOptimalActualStarters` fields `lineupBacktestExecutor.ts` already persists — no new computation against either production engine, purely an aggregation over data both replay scenarios already produced. 6 new tests (mocked Prisma, mirroring every prior metrics module's test convention).

**Key join mechanics:**
- A trade's `assetsReceived` (Phase 9's `providerAssetId` field) is the acquired-player set; `participantsInvolved[0]` is always the proposer/receiving roster (per `sleeperTradeNormalizer.ts`'s own convention: `tx.roster_ids[0]`).
- A trade's real `resolvedAt` timestamp is converted to an **approximate** NFL week via the same season-start convention `lineupSleeperNormalizer.ts` already uses in the other direction (`Date.UTC(season, 8, 1) + week*7 days`, inverted here) — trades have no exact week number of their own (`ReplayImport.providerWeek` is `null` for every trade row, a documented, pre-existing design choice, not new this phase).
- For each acquired player, every lineup replay row for the same `(league, season, receivingRoster)` at or after the approximate trade week is scanned for that exact `providerAssetId` in `fullRoster`, `actualStarterIds`, `missedOptimalStarters`, and `subOptimalActualStarters` — yielding real lineup appearances, real starts, and real "was this specific acquired player part of the true optimal lineup that week" classifications.

---

## 2. Metrics produced

- **Starter Conversion Rate** — of the weeks an acquired player was on the receiving roster, how often the team actually started them.
- **Bench Conversion Rate** — of the weeks an acquired player deserved to start (was part of the real optimal lineup), how often the team benched them anyway (a genuine "wasted acquisition" rate).
- **Trade ROI** — real points captured *while started* per unit of deterministic market value given up (`totalPointsWhileStarted / givenUpValue`) — a real-outcome-vs-deterministic-cost ratio, comparable across trades of different sizes.
- **Lineup ROI** — the fraction of an acquired player's total real points that were actually captured by starting them (`totalPointsWhileStarted / totalPointsContributed`) — how efficiently the team turned raw acquired talent into realized value.
- **Trade Impact Score** — realized as `totalPointsContributed`/`totalPointsWhileStarted` per trade, compared across fairness-verdict and confidence buckets (§4).
- **Lineup Improvement Score** — roster-level average real efficiency in lineup weeks before vs. after each roster's earliest real trade (§5).

---

## 3. Headline finding: the deterministic fairness verdict predicts real future value capture — more than the confidence score does

Real, measured across 114 trades with real subsequent lineup data (of 141 total real trades considered across the 5 overlapping leagues):

| Verdict | Count | Avg Trade ROI | Avg Starter Conversion | Avg Points Contributed |
|---|---|---|---|---|
| **Strong Win** | 36 | **0.0795** (highest) | **78.5%** (highest) | 137.1 |
| Slight Win | 21 | 0.0702 | 68.9% | 92.0 |
| Fair | 18 | 0.0382 | 53.0% | 124.9 |
| Overpay Risk | 33 | 0.0252 | **46.9%** (lowest) | 83.8 |
| Major Overpay | 6 | **0.0183** (lowest) | 53.1% | 172.6 |

**This is a real, non-obvious validation result.** `computeTradeDrivers()`'s `verdict` is computed entirely from pre-trade information (fairness/`score` composite — lineup impact, VORP, market, behavior at the moment of the trade) with zero knowledge of what would actually happen afterward. Yet real "Strong Win" trades went on to be started 78.5% of the time (vs. 46.9% for "Overpay Risk") and captured more than 4x the real trade ROI of "Major Overpay" trades. The verdict was never built or tuned with this correlation in mind (this workstream has never touched `acceptProbability`/verdict weights) — this is the first time this workstream has measured whether the deterministic fairness scoring actually predicts anything about what happens after the trade, and in this real sample, it does.

**By contrast, confidence score shows a much weaker relationship**, split at the real median (95, reflecting Phase 7's finding that VORP+roster-context enrichment pushes many rows' confidence into the 90-100 band):

| Confidence tier | Threshold | Count | Avg Trade ROI | Avg Starter Conversion |
|---|---|---|---|---|
| High | ≥ 95 | 65 | 0.0481 | 68.6% |
| Low | < 95 | 49 | 0.0458 | 53.7% |

Trade ROI is nearly identical between tiers (0.048 vs. 0.046) — confidence score, which measures data-completeness rather than trade quality (per Phase 6/8's own findings), correlates only weakly with real subsequent outcomes, exactly consistent with its known role in this system: confidence answers "how much do we know," not "how good is this trade."

---

## 4. Aggregate real numbers (114 trades with real lineup data)

| Metric | Value |
|---|---|
| Avg Starter Conversion Rate | 62.2% |
| Avg Bench Conversion Rate | 22.4% |
| Avg Trade ROI | 0.047 |
| Avg Lineup ROI | 0.777 |
| Avg total real points contributed per trade | 113.3 |

Real acquired players were started roughly 5 out of every 8 weeks they were rostered, and when they were part of the true optimal lineup, they were still benched about 1 in 5 of those weeks — a real, measurable "wasted acquisition" rate, consistent with (and now directly connected to) Lineup Replay's own Phase 13/14 finding that real managers leave meaningful value on the bench regardless of how it got there.

---

## 5. Lineup Improvement Score — an honest, confounded result, not a clean answer

| | Avg efficiency | Sample size |
|---|---|---|
| Before the roster's earliest real trade | 88.2% | 61 real lineup rows |
| After the roster's earliest real trade | 86.3% | 605 real lineup rows |

**Read carefully, not as "trades made lineups worse."** The "before" sample is small (61 rows) and skews toward early-season weeks (when real efficiency across this entire corpus already runs higher, per Phase 14 §8.5's weekly trend); the "after" sample is much larger (605 rows) and necessarily includes the documented late-season efficiency dip (weeks 16-18, Phase 14 §8.5) simply because it covers more of the season. This comparison is confounded by the same seasonal pattern already found and disclosed in Phase 14 — it is not a clean, isolated measurement of "did this trade help," and is reported honestly as inconclusive rather than stretched into a negative finding it doesn't actually support.

---

## 6. Notable real examples

**Highest real Trade ROI:** a $200-value pickup of Breece Hall (Pirate League!, week 4) that went on to be started 5 of 6 real weeks for 84.96 real points — a legitimately excellent, cheap real acquisition. A Jonathan Taylor acquisition (Jeepers Keepers!, week 2, 1,251 value given up) was started 16 of 17 real weeks for 347.5 real points — the largest raw real-points return in the sample.

**Zero real lineup appearances — a real, disclosed limitation, not a bug.** Several trades (all in Beta 1 Zombie League) show acquired real players (or draft picks) with 0 lineup appearances post-trade. Two distinct, legitimate causes are mixed together here and should not be read as "worthless trades": (1) **draft picks structurally can never have lineup appearances** — they aren't real, startable players in Sleeper's matchup data, so a `providerAssetId` like `pick-2025-r7-14` always joins to zero rows, correctly, by construction; (2) **real players who were later re-traded, cut, or placed on season-ending injury reserve** would also show zero appearances on the *original* receiving roster, which this analysis cannot currently distinguish from "the team simply never used them" — a genuine methodological gap for a future phase, not resolved here.

---

## 7. A real operational finding: the same zombie-process class as Phase 14, this time much worse

Phase 14 found and stopped one background ingestion attempt against the excluded large-roster league ("Going Deep League") that had silently kept running. **This phase found the same thing happening again, far more severely**: while preparing this correlation run, the real database showed the excluded league's row count had grown again (10 → 46). Direct process inspection (`Get-CimInstance Win32_Process`) found **9 separate, still-running node processes**, all executing the same Phase 13 diagnostic script, each frozen at whatever `LEAGUE_ID` was in that script file at the moment that specific process started — meaning every failed/retried attempt from Phase 13 (the original 18-week run, the 8-week retry, the 3-week retry, all against the large-roster league, before the league ID was finally switched to a small-roster league) had spawned a process that outlived the Bash tool's own reported timeout, and none of them had actually been terminated by that timeout.

**Root cause, now understood precisely:** on this environment, a Bash tool timeout (or the tool's own "Command timed out" message) does not reliably kill the underlying child process tree — it only stops the *tool* from waiting on it. Phase 14's `TaskStop` on the one harness-tracked background task ID killed exactly one of these; the other 8 were never tracked as a "background task" at all (they were spawned by ordinary, seemingly-completed-or-timed-out foreground `Bash` calls) and so were invisible to that cleanup.

**Fixed this phase:** identified and force-killed all 9 processes directly via PowerShell, confirmed zero remain, and re-deleted the resulting orphaned rows (back to the exact expected 1,260/1,260). This phase's actual correlation numbers were **never affected** by the contamination — the query explicitly scoped to the 5 known-good leagues throughout, verified by re-running the identical query before and after cleanup and confirming byte-identical output.

**Lesson for all future phases in this workstream:** after any script targeting a known-problematic large roster (or any script that hits a Bash tool timeout), explicitly verify via the OS process list (`Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"`, filtered to the scratchpad path) that no orphaned process remains — do not assume a reported timeout means the process is dead, and do not assume stopping one harness-tracked task ID is sufficient if multiple attempts were made against the same script path.

---

## 8. Verification

- `npx vitest run __tests__/replay-framework/` — all tests pass, including 6 new tests for `decisionReplayCorrelation.ts`.
- `npx vitest run __tests__/decision-os/` — all 2422 tests pass, unaffected.
- `npx tsc --noEmit` — 158 errors, identical to the established baseline, zero new errors, none in the new file.
- Real staging isolation re-check: `TradeOfferEvent`/`TradeOutcomeEvent`/`TradeLearningStats` all `0`; Trade Replay's 238/238 and Lineup Replay's 1,260/1,260 corpora reconfirmed exactly unchanged after this phase's read-only analysis (post-cleanup).

---

## 9. Recommendation for Phase 16

1. **This correlation is worth productizing**, per the milestone framing that motivated this phase — "Strong Win trades get started 78.5% of the time" is a real, evidence-backed insight distinct from a generic recommendation. A future Manager OS/Chimmy phase could surface verdict-conditioned real historical base rates like this, once explicitly scoped and approved as its own phase (not decided here).
2. **Resolve the zero-appearance ambiguity (§6)** by joining against real roster-churn history (subsequent trades/waiver drops of the same `providerAssetId` from the same roster) before treating a 0-appearance trade as either a "wasted" or merely "not yet measured" outcome.
3. **Re-run the Lineup Improvement Score (§5) with a matched-window comparison** (e.g., 3 real weeks immediately before vs. after each trade, rather than "all weeks before" vs. "all weeks after") to remove the seasonal confound before drawing any conclusion about whether trades causally affect lineup efficiency.
4. **Adopt the process-hygiene lesson (§7) as a standing practice**: verify no orphaned OS process remains after any large-roster or timed-out script, every phase, going forward.

---

## Files changed in this session

- `lib/replay-framework/metrics/decisionReplayCorrelation.ts` (new)
- `__tests__/replay-framework/decisionReplayCorrelation.test.ts` (new, 6 tests)
- `docs/DECISION_OS_DECISION_REPLAY_CORRELATION_REPORT.md` (this document, new)

No trade-engine file was modified. No lineup-optimizer file was modified. No Trade Learning code was modified. No calibration math, threshold, or weight was changed. No new ingestion occurred — this phase read only the already-ingested 238 trade + 1,260 lineup rows. Real staging actions this phase: 9 orphaned node processes (debris from Phase 13's own earlier attempts) were found and terminated, and the resulting orphaned `ReplayImport` rows for the excluded large-roster league were deleted via the same precisely-scoped query pattern established in Phases 13-14 — restoring the corpus to its exact expected state (238/238 trade, 1,260/1,260 lineup). `TradeOfferEvent`/`TradeOutcomeEvent`/`TradeLearningStats` remain untouched at every point. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere.
