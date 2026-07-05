# Trade Learning — Pre-Enablement Data Readiness Audit

**Status:** Audit complete, **including a real staging measurement (Phase 4)**. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` **not enabled**. No calibration math, thresholds, or recommendation logic changed.
**Branch:** `g15-event-foundation`
**Scope:** Decision OS — Trade Learning Phase 3 (this document's original sections 1–8, code-only) + Phase 4 (§9, real staging measurement), following Phase 1 (`0376b9ed0`, atomic activation) and Phase 2 (`092b0a114`, shadow rollout observability).
**Method:** Phase 3 made no database connection (offered the choice, chose local-only). **Phase 4's task explicitly and unambiguously instructed connecting to staging to run read-only aggregate queries — that instruction is the same-turn approval this workstream has always required, so it was carried out.** Read-only `SELECT`/`COUNT`/`GROUP BY`/`MIN`/`MAX` queries only, against the Neon branch confirmed to match `.env.staging` (`staging-nfl-verify`, host `ep-winter-salad-ad34lce8`, project `icy-field-51189449`, branch `br-weathered-credit-addbjdlc`) — never the `production` branch, which was explicitly identified and avoided. No row-level or user-identifying data was retrieved.

---

## Data-readiness conclusion (headline)

**Updated by Phase 4's real measurement: staging has zero real trade-learning data across every relevant table. No-go on staging as it currently stands.** Phase 3 established that the mechanism itself is correct and fails closed on insufficient data. Phase 4 measured the actual row counts on staging and found `TradeOutcomeEvent`, `TradeOfferEvent`, `TradeLearningStats`, `LeagueTrade`, `TradeFeedback`, `af_league_trades`, and `af_league_trade_votes` are **all empty (0 rows)** — while the same branch has substantial real data elsewhere (251 real users), confirming this isn't a blank/broken database, just one where trade-learning specifically has never been populated. Enabling the flag on this staging branch today would be safe (every gate would correctly report "insufficient data" and do nothing) but would produce **zero observable signal**, indefinitely, until either real trade-evaluation traffic starts writing to these tables on this branch or a fresher branch/snapshot is used. See §9 for full detail and the exact go/no-go.

---

## 1. Real event volume — unmeasured, and why

This phase's task list asks for total outcome events, accepted/rejected/expired/countered/unknown breakdowns, per-season and per-league counts, per-segment counts, and oldest/newest timestamps. All of these require a live query against `TradeOutcomeEvent`/`TradeOfferEvent` in a real database. None of that was run this session — offered the choice at the start of this phase, the answer was local-only, consistent with how this exact question was resolved twice before (`docs/DECISION_OS_MANAGER_DNA_PHASE2D_REAL_DATA_READINESS.md`, `PHASE2G`) for the separate Manager DNA/behavioral-events subsystem.

**What this means concretely:** every number this phase's task list asks for — total events, accepted/rejected/expired/countered/unknown counts, per-season, per-league, per-segment, oldest/newest timestamp — is **not stated in this document**, because stating a number without having queried it would be a fabrication, and this workstream's established practice throughout every prior phase (Phase 2C/2D/2F/2G/2I/2J of the Manager DNA workstream, `TRADE_LEARNING_ACTIVATION_BLOCKERS.md`'s own bug-discovery process) has been to always measure before asserting, never estimate confidently.

**What would be needed to get real numbers**, if a future turn explicitly approves it:

```sql
-- Total, by outcome type
SELECT outcome, COUNT(*) FROM "TradeOutcomeEvent" GROUP BY outcome;

-- By season
SELECT season, COUNT(*) FROM "TradeOutcomeEvent" GROUP BY season ORDER BY season;

-- By league (top leagues by volume)
SELECT "leagueId", COUNT(*) FROM "TradeOutcomeEvent" WHERE "leagueId" IS NOT NULL GROUP BY "leagueId" ORDER BY COUNT(*) DESC LIMIT 20;

-- Oldest / newest
SELECT MIN("createdAt"), MAX("createdAt") FROM "TradeOutcomeEvent";

-- Segment volume (via the matched TradeOfferEvent)
SELECT "isSuperFlex", "leagueFormat", "scoringType", COUNT(*)
FROM "TradeOfferEvent"
WHERE id IN (SELECT "offerEventId" FROM "TradeOutcomeEvent" WHERE "offerEventId" IS NOT NULL)
GROUP BY "isSuperFlex", "leagueFormat", "scoringType";
```

These are read-only aggregate `SELECT`/`COUNT`/`GROUP BY`/`MIN`/`MAX` queries — no row-level data, no writes. This is exactly the shape of query the diagnostics endpoint's own logic already performs internally (via `computeCalibrationHealth()`), just not yet run against a real environment.

---

## 2. Gate audit — verified logic, unmeasured real satisfaction

All values below are the real, exported constants from `lib/trade-engine/auto-recalibration.ts` (re-confirmed this session, unchanged from Phase 1/2) and `lib/trade-engine/isotonic-calibrator.ts`. "Verified" means covered by a passing test that exercises the real, unmodified function at and around the boundary. "Real data status" is honestly `unmeasured` throughout, per §1.

| Gate | Constant | Value | Verified by test? | Real data status |
|---|---|---|---|---|
| Minimum shadow-B0 recalibration sample | `MIN_RECALIBRATION_SAMPLE` | 30 (raw `TradeOutcomeEvent` rows, see caveat in §3) | Yes — `auto-recalibration-sample-composition.test.ts` (below/at/above threshold) | Unmeasured |
| Minimum per-segment sample | `MIN_SEGMENT_SAMPLE` | 50 | Yes — new test this phase (`computeSegmentB0s` excludes a 49-row segment, includes a 50-row one) | Unmeasured |
| Minimum isotonic-map sample | `MIN_ISOTONIC_SAMPLE` (`isotonic-calibrator.ts`, not exported — read directly from source) | 50 | Not re-tested this phase (PAVA-fitting logic, not a simple threshold; out of this phase's scope since it's calibration math) | Unmeasured |
| Shadow maturity window | `SHADOW_MATURITY_DAYS` | 7 | Yes — Phase 2's `diagnostics.test.ts` (7 days exactly matures; less does not) and Phase 1's `promoteShadowB0` test | Not time-dependent — always "unmeasured until 7 days after first shadow computation," regardless of volume |
| Maximum promotion divergence | `MAX_SHADOW_DIVERGENCE` | 0.40 | Yes — Phase 2's `diagnostics.test.ts` (0.20 passes, 0.80 fails) and Phase 1's `promoteShadowB0` test | Unmeasured (depends on what the real observed rate turns out to be) |
| Scheduled-run cadence | `RECALIBRATION_CADENCE_DAYS` | 6.5 | Yes — Phase 1/2 tests | N/A — this is a self-throttle, not a data-volume gate |

**Every gate fails closed when data is insufficient** (returns `null` / `not promoted` / segment excluded / diagnostics reports honest zeros and nulls) — reconfirmed by this phase's new tests, not merely assumed from Phase 1/2. No gate was found to fail *open* (i.e., no scenario was found where insufficient data produces a fabricated or misleadingly-confident result) **except the one caveat below**, which is about a *reported number's meaning*, not about a gate silently passing when it shouldn't.

---

## 3. One caveat found this phase — documented, not fixed

While validating gate logic against synthetic boundary data (`auto-recalibration-sample-composition.test.ts`), a precise, pre-existing characteristic of `computeShadowB0()` surfaced:

**`ShadowB0Metrics.sampleSize` (surfaced in diagnostics as `shadow.sampleSize`) does not mean "how many labeled (ACCEPTED/REJECTED/EXPIRED) outcomes fed the observed acceptance rate."** It means "how many outcomes of *any* kind — including `COUNTERED`/`UNKNOWN`, which `computeObservedAcceptRate()` correctly excludes from the rate calculation itself — had a matched `TradeOfferEvent` with a valid predicted probability." These two counts can differ substantially. Proven by test: 5 real `ACCEPTED` rows + 35 `COUNTERED` rows (all 40 with valid matched offers) produces `observedRate: 1` (correctly based on the 5 labeled rows) but `sampleSize: 40` (all 40, not 5).

**Why this is not fixed here:** correcting `sampleSize`/`predictedMean` to only count labeled rows would change the actual log-odds correction computed by `computeShadowB0()` — `predictedMean = sumPredicted / validCount` directly feeds the B0 shift math. That is a change to calibration math, explicitly out of scope for this phase (and every phase in this workstream has required its own review before touching that computation — see the ownership ADR's own governance precedent). It is also not a "clear bug" in the sense the Phase 0 enum mismatch was (an isolated, obviously-wrong string comparison with one unambiguous fix) — it's a genuine design characteristic of how the sample is composed, and deserves its own scoped review if it's ever addressed, not a fold-in here.

**Operational implication:** when real volume is eventually measured (§1) and when the diagnostics endpoint eventually shows a non-null `shadow.sampleSize`, do not read that number as "N real accept/reject data points." Cross-reference it against `shadow.divergenceFromActive`/`shadow.isMature` and, ideally, a direct count of `ACCEPTED`/`REJECTED`/`EXPIRED` rows (from the queries in §1) to know the *actual* labeled sample size behind a given shadow value.

---

## 4. Diagnostics validation result

`buildTradeLearningDiagnostics()` and its route were re-verified this phase, in addition to Phase 2's own 13 tests:

- New file `__tests__/trade-engine/auto-recalibration-sample-composition.test.ts` (4 tests): confirms `computeShadowB0()`'s raw-row gate and the sample-composition caveat above; confirms `computeSegmentB0s()` correctly excludes a segment one row below `MIN_SEGMENT_SAMPLE` and includes one exactly at it.
- Cross-checked every boundary comparison in `buildTradeLearningDiagnostics()` (`isMature = ageDays >= SHADOW_MATURITY_DAYS`, `withinDivergenceCap = divergence <= MAX_SHADOW_DIVERGENCE`, `wouldRunIfInvokedNow = daysSinceLastRecalibration >= RECALIBRATION_CADENCE_DAYS`, or null/never-run) line-by-line against the real early-return conditions in `promoteShadowB0()` and `runWeeklyRecalibration()` (`ageDays < SHADOW_MATURITY_DAYS`, `divergence > MAX_SHADOW_DIVERGENCE`, `daysSinceRecal < RECALIBRATION_CADENCE_DAYS`) — every comparison is the exact logical inverse of the corresponding real gate, so diagnostics cannot report a state inconsistent with what the real gate would actually do. **No bug found; no code changed.**
- The one gap noted: diagnostics does not itself echo `MIN_SEGMENT_SAMPLE`/`MIN_ISOTONIC_SAMPLE` inline next to the `segments` field (an operator has to know these values from this document rather than reading them from the API response). This is a completeness gap, not an inaccuracy — not fixed here, since it isn't a bug and this phase's constraints call for documenting insufficiency rather than expanding code.

**Conclusion: diagnostics is accurate.** It faithfully reports whatever the real, unmodified gate functions would compute — including faithfully surfacing the §3 caveat's `sampleSize` value exactly as `computeShadowB0()` produces it, rather than silently correcting or hiding it.

---

## 5. What an operator should expect during the first 7 days

Unchanged from `docs/TRADE_LEARNING_SHADOW_ROLLOUT.md` — repeated here because this phase's task list asks for it directly:

- The scheduler will fire weekly regardless of the flag; only what happens *after* the "invoked" log line depends on the flag.
- With `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED=true` and unknown real volume, the most likely first-week outcome — based on how the gates are built, not on any measured number — is `shadow.pending: false` (fewer than 30 raw outcome rows) or a pending-but-immature shadow (`isMature: false`) if the 30-row gate is cleared. **Neither is a failure.**
- No `calibratedB0` movement is possible before day 7 regardless of volume — the maturity gate is time-based, not just sample-based.
- Segment-level and isotonic-map results, if any, will very likely lag behind the global shadow value, since they each independently need ≥50 samples (global shadow needs only 30).

---

## 6. Exact flag, endpoint, and rollback (unchanged, restated for this deliverable)

- **Flag:** `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` (must be the literal string `"true"`; anything else, including unset, is disabled).
- **Endpoint to monitor:** `GET /api/admin/trade-learning/diagnostics` (admin-authenticated, read-only, optional `?season=`).
- **Rollback:** unset the flag (or set to any non-`"true"` value). Takes effect on the next scheduled invocation, no deploy required. Does not revert an already-promoted `calibratedB0` — see `TRADE_LEARNING_SHADOW_ROLLOUT.md`'s rollback section for the full caveat on that.

---

## 7. Is this safe to enable in shadow mode?

**Mechanically: yes.** Every gate verified this phase and in Phase 1/2 fails closed. Enabling the flag cannot corrupt `calibratedB0`, cannot bypass the maturity window, cannot bypass the divergence cap, and cannot silently promote on thin data — worst case with zero real volume, it logs a skip reason and writes nothing.

**Operationally: not yet recommended**, for one reason only — real volume is unmeasured, so nobody can currently say whether enabling it will produce any observable behavior within a reasonable evaluation window, or sit silent for weeks. That is not a safety concern, it's a "will this experiment tell you anything" concern. The concrete next step, when a future turn explicitly approves it, is the read-only staging query in §1 — a single, bounded, previously-used-precedent action, not a new production risk.

---

## 8. Remaining blockers before production enablement (as of Phase 3 — superseded by §9's measurement)

1. ~~Real-world volume measurement~~ — **done in Phase 4, §9. Result: zero.**
2. **The `sampleSize` composition caveat (§3)** — still relevant, unchanged: should be understood by whoever reads the diagnostics endpoint's numbers once real data starts flowing, so a promoted shadow isn't over-trusted based on a `sampleSize` that includes unlabeled rows.
3. **Who flips the flag, and when** — still explicitly undecided, still out of scope for this document to recommend.
4. **Staging-first rollout** — per `TRADE_LEARNING_SHADOW_ROLLOUT.md`'s checklist; moot until §9's data gap is closed, since there is nothing to observe yet on this staging branch either way.

---

## 9. Staging data measurement (Phase 4)

**Connected to:** Neon project `icy-field-51189449` ("All Fantasy"), branch `br-weathered-credit-addbjdlc` (`staging-nfl-verify`) — confirmed via `get_connection_string` to resolve to host `ep-winter-salad-ad34lce8-pooler`, an exact match for `.env.staging`. The `production` branch (`br-withered-shadow-adur64u9`, the project's default/primary branch) was explicitly identified and never targeted — every query below passed an explicit `branchId`, never relying on a default. Read-only `SELECT`/`COUNT`/`GROUP BY`/`MIN`/`MAX` only; no row-level or user-identifying data retrieved (league IDs, user IDs, and player-level detail were never selected).

### 9.1 Raw aggregate counts (real, measured)

| Table | Row count | Notes |
|---|---|---|
| `TradeOutcomeEvent` | **0** | `MIN(createdAt)`/`MAX(createdAt)` both `null` — no rows to have a timestamp. `GROUP BY outcome` and `GROUP BY season` both returned zero groups. |
| `TradeOfferEvent` | **0** | Including `acceptProb IS NOT NULL` count — also 0. |
| `TradeLearningStats` | **0** | No row for any season — not even a stub `season: 2025` row exists. Confirms `calibratedB0` on this branch would resolve purely to the in-code `DEFAULT_B0` fallback (-1.10), since `findUnique` returns `null`. |
| `LeagueTrade` (legacy, retired path) | **0** | The old `calibrateInterceptFromOutcomes()` path would also find nothing here. |
| `TradeFeedback` (real user votes) | **0** | `calibrateFromFeedback()` — the one part of `runFullCalibration()` still live — would also have nothing to work with. |
| `LeagueTradeHistory` | **0** | |
| `af_league_trades` / `af_league_trade_votes` (modern in-app trade proposals/votes) | **0 / 0** | |
| Sanity check: `app_users` | **251** | Confirms this is a real, populated branch overall — the zero counts above are specific to trade-learning tables, not an empty/broken database. |

**Per-league, per-segment breakdowns were not run**, because there is nothing to break down — every prerequisite count is zero. Oldest/newest timestamps: both `null` (no rows exist to have one).

### 9.2 Gate pass/fail summary (against real staging data)

| Gate | Threshold | Real staging value | Pass/fail |
|---|---|---|---|
| `MIN_RECALIBRATION_SAMPLE` (global shadow) | 30 raw outcome rows | 0 | **FAIL** |
| `MIN_SEGMENT_SAMPLE` (per segment) | 50 | 0 (no segments possible) | **FAIL** |
| `MIN_ISOTONIC_SAMPLE` | 50 | 0 | **FAIL** |
| `SHADOW_MATURITY_DAYS` | 7 days since shadow computed | N/A — no shadow has ever been computed (`shadowB0ComputedAt` doesn't exist because no `TradeLearningStats` row exists) | **N/A, not reached** |
| `MAX_SHADOW_DIVERGENCE` | 0.40 | N/A — same reason | **N/A, not reached** |
| `RECALIBRATION_CADENCE_DAYS` | 6.5 days since last run | N/A — `lastRecalibrationAt` doesn't exist; a scheduled run would proceed immediately (nothing to throttle against) and then find 0 outcomes | Cadence gate itself would pass (run would proceed), but immediately hit the sample-size gate above |

**Every volume-dependent gate fails on real staging data.** This is exactly what Phase 3 predicted was the "most likely first-week outcome" if real volume turned out to be thin — Phase 4 confirms volume isn't thin, it's zero.

### 9.3 Diagnostics validation result

The diagnostics builder was not executed as a live process against staging this session (that would require wiring a one-off script's `DATABASE_URL` to the staging connection string, a separate, less-controlled risk surface than the purpose-built, branch-scoped Neon SQL tool already used for every query above). Instead, validation was done by combining the real measured counts in §9.1 with the **existing, already-passing** Phase 3 test `'handles a completely empty TradeLearningStats row (no prior run ever) with safe defaults, no crash'` (`__tests__/trade-engine/diagnostics.test.ts`), which mocks exactly the scenario now confirmed to be staging's real state: `tradeLearningStats.findUnique` returning `null` for the season.

That test already asserts, and therefore the diagnostics endpoint would report, against real staging data:
- `calibratedB0.current: -1.10` (the `DEFAULT_B0` fallback)
- `shadow.pending: false`, `shadow.shadowB0: null`
- `promotion.hasEverBeenPromoted: false`
- `scheduler.lastRecalibrationAt: null`, `scheduler.wouldRunIfInvokedNow: true`, `scheduler.skipReasonIfAny: null`
- `segments: null`, `drift: null`

For `calibrationHealth` specifically: since both `TradeOutcomeEvent` and `TradeOfferEvent` are confirmed empty on staging, `computeCalibrationHealth()`'s internal `loadPairedData()` would join zero rows, deterministically producing `totalPaired: 0`, `ece: 0`, `brierScore: 0`, an all-zero `predictionDistribution`, and no alerts — the same "nothing to report" shape already exercised by the diagnostics test suite's `computeCalibrationHealth` mock returning `null`/empty.

**Conclusion: diagnostics is confirmed accurate for the real staging dataset.** No discrepancy between the real aggregate counts and what the (already-tested) diagnostics logic would report. No bug found; no code changed.

### 9.4 Go/no-go recommendation

**No-go, on this staging branch, as it currently stands.** Not because anything is unsafe — every gate fails exactly as designed — but because enabling `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` here would produce zero observable behavior indefinitely. There is nothing to shadow-test against. Two possible paths forward, neither executed in this session (out of scope — no production rollout, no threshold changes):

1. **Wait for this branch to accumulate real data** — if `staging-nfl-verify` is kept live and real trade-evaluation traffic runs against it (via the same `logTradeOfferEvent()`/`logTradeOutcomeEvent()` calls already wired into `quick-evaluate`/`league-analyze`/`goal-proposals`/`analyze`/`trade-evaluator`/`instant/trade`), volume would eventually accrue naturally.
2. **Refresh the staging branch from a more current production snapshot**, or point a staging environment at a branch that already has this traffic — this branch was snapshotted `2026-06-26`; if production has been accumulating real `TradeOutcomeEvent` rows since then via the same live code paths, a fresher snapshot might already clear the gates. This document does not check production and does not recommend which path to take — that is an infrastructure/ops decision outside this audit's scope.

### 9.5 Risks

- **Silent-forever risk, not corruption risk.** If the flag were enabled anyway on this branch, nothing breaks — it would just log `[AutoRecal] Only 0 outcomes, need 30. Skipping shadow b0.` every week, forever, until the underlying data gap is closed. An operator unaware of §9.1 might mistake "no promotion after months" for a bug rather than "no data."
- **This measurement is a point-in-time snapshot of one specific branch**, not a statement about production or about any other environment. It should not be read as "the platform has no real trade activity" — only that this specific staging branch, as of this session, has none in these specific tables.

### 9.6 Rollback note

No change was made, so there is nothing to roll back. If a future session enables the flag on a refreshed/different staging branch and wants to revert, the existing procedure in `docs/TRADE_LEARNING_SHADOW_ROLLOUT.md` (unset the flag; no deploy required) applies unchanged.

---

## Files changed in this session

- `docs/TRADE_LEARNING_PRE_ENABLEMENT_AUDIT.md` (this document, updated with §9)

No calibration math, thresholds, recommendation logic, Decision OS classifiers, AI Coach, Chimmy, Manager Intelligence, or public API was touched. No code was changed — the staging measurement confirmed diagnostics and gate logic are already correct; no bug was found. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset in every environment. Only read-only aggregate queries were run, against the confirmed staging branch, never production.
