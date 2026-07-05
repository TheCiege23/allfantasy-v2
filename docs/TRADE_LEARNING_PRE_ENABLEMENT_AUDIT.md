# Trade Learning — Pre-Enablement Data Readiness Audit

**Status:** Audit complete. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` **not enabled**. No calibration math, thresholds, or recommendation logic changed.
**Branch:** `g15-event-foundation`
**Scope:** Decision OS — Trade Learning Phase 3, following Phase 1 (`0376b9ed0`, atomic activation) and Phase 2 (`092b0a114`, shadow rollout observability).
**Method:** No database connection was made this session. Offered the choice (per this workstream's established rule of never connecting to a real database without explicit, same-turn approval — this exact question came up twice before in the Manager DNA workstream, both times resolved the same way), the answer this time was again **local-only / code-only audit**. Real `TradeOutcomeEvent`/`TradeOfferEvent` volume is therefore **not measured** in this document — see §1 for exactly what that means and what would be needed to measure it.

---

## Data-readiness conclusion (headline)

**The mechanism is correct and safe to enable; whether enabling it right now would do anything useful is unknown.** Every gate (sample-size minimums, 7-day maturity, divergence cap, segment thresholds) is verified — by test, against the real exported constants, not re-implemented or approximated — to fail closed: insufficient or absent data produces `null`/`not promoted`/`skipped`, never a fabricated result. That was already true after Phase 1 and is reconfirmed here with additional boundary-condition tests. What remains genuinely unknown is whether the **actual row counts** in any real environment clear the 30/50-row thresholds at all. Enabling the flag today would be safe in the sense that nothing can break or silently corrupt data — but it might also do nothing observable for an indefinite period if real volume is thin, and there is currently no measurement to say either way. **Recommendation: do not enable yet — first get an explicitly-approved, read-only staging volume count (a single-turn decision, not a blanket policy change), then revisit this document's conclusion.**

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

## 8. Remaining blockers before production enablement

Unchanged from Phase 1/2, restated precisely for this deliverable:

1. **Real-world volume measurement** (§1) — still the only concrete blocker. Everything else in this document confirms the mechanism is ready; this is the one open factual question.
2. **The `sampleSize` composition caveat (§3)** — not a blocker to enabling, but should be understood by whoever reads the diagnostics endpoint's numbers once real data starts flowing, so a promoted shadow isn't over-trusted based on a `sampleSize` that includes unlabeled rows.
3. **Who flips the flag, and when** — still explicitly undecided, still out of scope for this document to recommend.
4. **Staging-first rollout** — per `TRADE_LEARNING_SHADOW_ROLLOUT.md`'s checklist, enable in staging before production regardless of what §1's eventual measurement shows.

---

## Files changed in this session

- `__tests__/trade-engine/auto-recalibration-sample-composition.test.ts` (new — 4 tests, proves the §3 caveat and the `MIN_SEGMENT_SAMPLE` gate boundary; no source code modified)
- `docs/TRADE_LEARNING_PRE_ENABLEMENT_AUDIT.md` (this document, new)

No calibration math, thresholds, recommendation logic, Decision OS classifiers, AI Coach, Chimmy, Manager Intelligence, or public API was touched. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset in every environment. No database was queried or connected to.
