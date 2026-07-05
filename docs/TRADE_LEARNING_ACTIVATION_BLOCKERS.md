# Trade Learning Activation Blockers

**Status:** Investigation complete. Activation is **not safe today**. No production wiring, cron entry, feature flag, or `vercel.json` change was implemented.
**Branch:** `g15-event-foundation`
**Scope:** Implementation-readiness review of `docs/DECISION_OS_CLOSED_LOOP_LEARNING_AUDIT.md` §7 Step 0 — "wire `runWeeklyRecalibration()` into a scheduled path."
**Files touched this session:** one new regression test (`__tests__/trade-engine/auto-recalibration-activation-readiness.test.ts`), no other file created, modified, or deleted. No Decision OS code touched. No public API touched. No existing calibration code removed or modified.

> **Update (follow-up session):** the primary blocker below — the `computeObservedAcceptRate()` case-mismatch bug (§4) — **has since been fixed** in `lib/trade-engine/auto-recalibration.ts`, with direct unit coverage in `__tests__/trade-engine/auto-recalibration-observed-accept-rate.test.ts` and updated assertions in the original readiness test. The fix only corrects the enum comparison; it does **not** activate `runWeeklyRecalibration()`, add cron wiring, or resolve the secondary shared-field conflict noted in §4/§6 item 3 (`calibratedB0` is still written by both the reachable, hardcoded-constant `calibrateInterceptFromOutcomes()` path and the still-orphaned, now-correct `promoteShadowB0()` path, with no coordination between them). The rest of this document — the entry-point audit, the "why was this never called" history, and the designed-but-unimplemented activation path — remains accurate and is preserved below as-written.

## TL;DR

Step 0 looked like a near-free win — flip a dead switch, no new design needed. **It is not safe to flip today.** While tracing every caller and building the minimal wiring, a real, verifiable defect surfaced in the exact function the audit recommended activating: `computeObservedAcceptRate()` (`lib/trade-engine/auto-recalibration.ts:89-97`) compares `TradeOutcomeEvent.outcome` against the lowercase strings `'accepted'`/`'completed'`, but the real Prisma `TradeOutcome` enum only ever contains `ACCEPTED | REJECTED | EXPIRED | COUNTERED | UNKNOWN` (uppercase, confirmed in `prisma/schema.prisma:14339-14345`, no `@map` remapping). **Every real outcome row fails this comparison.** A focused regression test (added this session, not removed) proves it empirically: 40 synthetic `ACCEPTED` outcomes and 40 synthetic `REJECTED` outcomes both produce an identical, wrong `observedRate: 0` from `computeShadowB0()`. Activating `runWeeklyRecalibration()` as-is would not "do nothing safely" — it would silently and repeatedly push the live `calibratedB0` (read by real trade-evaluation routes) toward its most pessimistic clamp, based on a permanently-fictional 0% acceptance signal, with no existing safeguard positioned to catch it. This is worse than the current state, not equivalent to it. Per this task's own branching instruction, the correct action is: **do not implement, document the blocker precisely.**

---

## 1. Audit of the existing learning pipeline

### Entry points

| Entry point | Trigger | Auth | Calls |
|---|---|---|---|
| `POST /api/internal/analyze-trades` | Manual only — **not present in `vercel.json`'s `crons` array** (checked directly; zero `analyze-trades` references anywhere in `vercel.json`) | `x-internal-key` header compared to `process.env.SESSION_SECRET` — a bespoke check, not the repo's standard `requireCronAuth()` helper used by every `/api/cron/*` route | `runBackgroundTradeAnalysis()` (`lib/trade-learning.ts:552`) |

`runBackgroundTradeAnalysis()` calls, in order, all real writes:
1. `processUnanalyzedTrades()` (`lib/trade-learning.ts:206`) — re-derives FantasyCalc values for up to 100 unanalyzed `LeagueTrade` rows per run, guarded by a 5-minute Prisma-row lock (`season: 9999` sentinel row).
2. `aggregateTradeLearningInsights()` (`lib/trade-learning.ts:297`) — rebuilds `TradeLearningInsight` rows and `TradeLearningStats.positionTrends`/`totalTradesAnalyzed` from analyzed trades.
3. `runFullCalibration()` (`lib/trade-engine/accept-calibration.ts:435`) → `calibrateInterceptFromOutcomes()` + `calibrateFromFeedback()`.
4. `runDriftDetection()` (`lib/trade-engine/drift-detection.ts:609`).
5. `logAcceptedTradesAsOutcomes()` (`lib/trade-engine/trade-event-logger.ts:149`) — backfills `TradeOutcomeEvent` rows (always `outcome: 'ACCEPTED'`, correctly upper-cased by `logTradeOutcomeEvent()`) from accepted `LeagueTrade` rows.

### Unreachable functions (confirmed by exhaustive repo-wide grep, not inference)

| Function | File | Callers found |
|---|---|---|
| `runWeeklyRecalibration()` | `auto-recalibration.ts:395` | **Zero** — one match repo-wide, its own definition |
| `computeShadowB0()`, `promoteShadowB0()`, `computeSegmentB0s()` | `auto-recalibration.ts` | Only called from `runWeeklyRecalibration()`, itself uncalled — transitively dead |
| `computeAndStoreIsotonicMap()` | `isotonic-calibrator.ts:189` | Only called from `runWeeklyRecalibration()` — transitively dead |

`calibrateInterceptFromOutcomes()` has exactly one caller: `runFullCalibration()` (`accept-calibration.ts:443`) — confirmed by grep, matching the audit doc's claim exactly.

### Scheduler assumptions

- `runWeeklyRecalibration()` self-throttles via `TradeLearningStats.lastRecalibrationAt` (`daysSinceRecal < 6.5` → early return) — it is idempotent-safe to call more often than weekly; it assumes *something* calls it periodically, not an exact cron expression.
- `promoteShadowB0()` requires a shadow value to be ≥7 days old (`SHADOW_MATURITY_DAYS`) before promoting — this assumes the function is invoked again after that window has passed, not a specific schedule.
- No cron, queue, or script anywhere in the current codebase references it.

### Required inputs

- `TradeOutcomeEvent` rows (≥30 for shadow B0 per `MIN_RECALIBRATION_SAMPLE`, ≥50 per segment per `MIN_SEGMENT_SAMPLE`, ≥50 for the isotonic map per `MIN_ISOTONIC_SAMPLE`) — real rows exist today, written by `logTradeOutcomeEvent()` (live trade-flow callers) and backfilled by `logAcceptedTradesAsOutcomes()`.
- Matching `TradeOfferEvent` rows via `offerEventId`, for the `acceptProb` originally predicted.

### Required outputs / persistence behavior

All writes are upserts on the season-keyed `TradeLearningStats` row: `shadowB0`, `shadowB0SampleSize`, `shadowB0ComputedAt`, `shadowB0Metrics`, `segmentB0s`, `lastRecalibrationAt`, and — only on promotion — `calibratedB0` plus an appended `calibrationHistory` entry. `computeAndStoreIsotonicMap()` additionally writes `isotonicMapJson`/`isotonicComputedAt`/`isotonicSampleSize`, and calls `invalidateCalibrationCache()` (`accept-calibration.ts`), which clears the in-memory cache read by `getCalibratedWeights()`/`calibrateAcceptProbability()` — the same functions already consumed by live trade-evaluation routes (`app/api/trade-evaluator/route.ts`, `server/api-route-modules/legacy/trade/*`). Activating this system is designed to eventually change the *values* those routes return — that is the intended effect of closing the loop — without changing their code path or latency profile, since they already read from the same cached, season-keyed row today.

---

## 2. Why `runWeeklyRecalibration()` is never called — evidence, not speculation

Git history shows this is a **migration gap**, not an intentional disable and not obsolete code:

- Commit `719e9bcfb` ("update", a large squashed commit) added `.archive/server_jobs/modelDriftRollup.ts` — a **standalone Node script** (not a Next.js route; imports `PrismaClient` directly, defines its own `TradeOfferMode`/`TradeOutcome`-typed drift/segment-bucketing logic) that is conceptually the direct predecessor of today's `drift-detection.ts`/`auto-recalibration.ts` — same domain (`SegmentParts`, `FlatScores`, `BucketStat`, segment-key construction from SF/TEP/league-size).
- A later commit, `8c577833f` (also "update"), **deleted** that archived script entirely.
- No `vercel.json` cron entry, `server_jobs`-style scheduler, or any other trigger was ever added for the *replacement* logic (`auto-recalibration.ts`) that superseded it.
- No feature flag exists anywhere for this system (checked `.env.example` — zero trade-learning/calibration/drift entries) and no disabling comment exists in any of the four trade-engine calibration files (all four were read in full this session and in the prior audit session).

**Conclusion: this is unfinished migration work — missing production wiring / missing scheduler — not an intentional decision, not an obsolete leftover.** The old standalone job's scheduling infrastructure was retired (consistent with the codebase's move to Vercel-cron-only scheduling for everything else, per `vercel.json`'s ~30 existing `/api/cron/*` and other scheduled-route entries), and its calibration logic was clearly rewritten as the current `lib/trade-engine/` module set — but the new equivalent of "something calls this periodically" was never created for the `runWeeklyRecalibration()` half of that rewrite, only for the `runFullCalibration()`/`runDriftDetection()` half (via the still-manual `/api/internal/analyze-trades` endpoint).

---

## 3. The minimum safe activation path — designed, not implemented (see §5 for why)

Had §4 not surfaced a blocker, this is the design that satisfies every stated preference:

- **New, dedicated cron route** `app/api/cron/trade-weekly-recalibration/route.ts`, using the repo's existing `requireCronAuth()` helper (`app/api/cron/_auth.ts`) — the same pattern as every other `/api/cron/*` route — rather than reusing the bespoke `x-internal-key` check on `/api/internal/analyze-trades`.
- **A new, disabled-by-default env flag**, following the exact naming/parsing convention Decision OS already uses for its own kill switches (`DECISION_OS_LINEUP_LIVE`, `..._WAIVER_LIVE`, `..._TRADE_LIVE`, `..._COMMISSIONER_HEALTH_LIVE`, all read as `String(env[...] ?? '').trim().toLowerCase() === 'true'`, default off): e.g. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED`.
- **A tiny, pure, testable gate function** (mirroring `shouldRunLineupLive(env)`'s shape) that no-ops cleanly when the flag is off, and calls the existing, unmodified `runWeeklyRecalibration()` when on.
- **Deliberately not touching** `runBackgroundTradeAnalysis()`, `runFullCalibration()`, `calibrateInterceptFromOutcomes()`, or `/api/internal/analyze-trades` — those remain fully intact and callable exactly as today, satisfying "do not remove existing calibration code" and "no existing request path changes behavior."
- **A new, additive `vercel.json` cron entry** on a weekly cadence (matching the function's own internal 6.5-day guard) — inert by default because the flag gates the actual work, so adding the schedule carries negligible cost even before the flag is ever turned on.

This design was fully specified and would have taken only three small, additive files plus one `vercel.json` line. It was **not implemented**, because of §4.

---

## 4. Safety verification — FAILED on one check

Going through the task's exact safety checklist:

| Check | Result |
|---|---|
| Changes public APIs? | No — new route would be an internal, cron-only, auth-gated endpoint; zero existing routes touched. |
| Changes request latency? | No — nothing in any user-facing request path is touched; the new route is invoked only by a scheduler. |
| Modifies Decision OS contracts? | No — `lib/decision-os/` is untouched; this subsystem has zero awareness of or import from Decision OS, confirmed in the prior audit and reconfirmed this session. |
| Bypasses existing maturity gates? | No — `runWeeklyRecalibration()` would be called completely unmodified; its 7-day shadow-maturity gate is 100% intact. |
| Bypasses drift detection? | No — `runDriftDetection()` is untouched; **however, this check does not provide the safety net its name implies (see below)**. |
| Bypasses shadow safeguards? | No — the shadow-B0 hold/promote logic is called unmodified. |
| **Produces correct output from real data?** | **FAILED.** See below. |

### The failure

`computeShadowB0()` (`auto-recalibration.ts:107`) calls `computeObservedAcceptRate(outcomes)` (line 89-97):

```ts
function computeObservedAcceptRate(
  outcomes: Array<{ outcome: string }>,
): number | null {
  if (outcomes.length === 0) return null
  const accepted = outcomes.filter(o =>
    o.outcome === 'accepted' || o.outcome === 'completed',
  ).length
  return accepted / outcomes.length
}
```

The real `TradeOutcomeEvent.outcome` column is typed `TradeOutcome`, a Prisma enum with exactly these values (`prisma/schema.prisma:14339-14345`):

```prisma
enum TradeOutcome {
  ACCEPTED
  REJECTED
  EXPIRED
  COUNTERED
  UNKNOWN
}
```

There is no `@map` remapping, and there is no `COMPLETED` value at all. Every real row's `outcome` field is one of the five uppercase strings above. `o.outcome === 'accepted'` and `o.outcome === 'completed'` can **never** be true for real data. Compare `isotonic-calibrator.ts:209`, which performs the equivalent check correctly: `o.outcome === 'ACCEPTED'` (uppercase) — proving this is a genuine defect in `auto-recalibration.ts` specifically, not a documented convention or an intentional simplification.

**Proven empirically, not just by reading code** — new test `__tests__/trade-engine/auto-recalibration-activation-readiness.test.ts` (added this session, 2 tests, both passing against the real, unmodified `computeShadowB0()` export):

- 40 synthetic `TradeOutcomeEvent` rows with `outcome: 'ACCEPTED'` (i.e., **100% real acceptance**) → `computeShadowB0()` returns `observedRate: 0`.
- 40 synthetic rows with `outcome: 'REJECTED'` (i.e., **0% real acceptance**) → `computeShadowB0()` returns the identical `observedRate: 0`.

The function cannot currently distinguish "everyone accepted every trade" from "everyone rejected every trade." Both report a 0% observed acceptance rate.

### Why this specifically makes activation unsafe (not merely "still imperfect")

Once ≥30 real `TradeOutcomeEvent` rows exist for a season (a threshold real production data will eventually cross, especially once the audit's other findings — matchup-prediction persistence, recommendation-outcome linkage — increase real trade volume over time), `computeShadowB0()` will compute a log-odds correction against a permanently-fictional `observedRate ≈ 0`, producing the maximum negative correction (clamped to `-MAX_B0_SHIFT = -0.60`). After the 7-day maturity window, `promoteShadowB0()` would push the live `calibratedB0` toward its most pessimistic floor (`DEFAULT_B0 - 0.60 = -1.70`) — read by `getCalibratedWeights()`, consumed by real trade-evaluation routes — making every future acceptance-probability prediction systematically and increasingly too pessimistic, for real users, silently.

**`runDriftDetection()` would not catch this.** Its calibration and segment-drift checks (`drift-detection.ts:96`, `const OBSERVED_ACCEPT_RATE = 0.85`) also measure against a hardcoded constant rather than real `TradeOutcomeEvent` data (this was already flagged in the audit's §5.1 as a separate issue) — so there is no existing alerting path that would notice the shadow-B0 mechanism silently corrupting itself. The one nominal safety net that exists today (drift detection) is blind to exactly this failure mode.

This is not "the system is inactive, so turning it on is low-risk either way." Turning it on **today** would introduce a new, real, silent failure mode into a value that live trade-evaluation routes already read and act on. That is a strictly worse outcome than the current state (fully idle), which is why this audit concludes **do not implement**.

### Secondary, non-blocking-but-relevant finding

Independent of the above: `calibrateInterceptFromOutcomes()` (the reachable, hardcoded-constant path) and `promoteShadowB0()` (the orphaned, real-outcome path) both write the same field, `TradeLearningStats.calibratedB0`, with no coordination between them. Today this is inert because neither runs on a schedule. If the enum-comparison bug above were fixed and this system activated without also resolving this, whichever mechanism ran most recently in a given season would silently overwrite the other's calibration — worth flagging for whoever picks up the eventual fix, but not itself a reason to block a hypothetical future activation once the primary bug is fixed and this is explicitly addressed.

---

## 5. Verification performed this session

- New regression test added: `__tests__/trade-engine/auto-recalibration-activation-readiness.test.ts` — **2/2 passing**, exercising the real, unmodified `computeShadowB0()` export against mocked Prisma data.
- Existing trade-engine-adjacent suites re-run to confirm no incidental changes: `__tests__/league-trade-engine-validation.test.ts` and `__tests__/trade-league-analyze-api.test.ts` — **19/19 passing**, unchanged.
- `tsc --noEmit` re-run and filtered to trade-engine/trade-learning/the new test file: **zero errors** (the pre-existing, unrelated repo-wide baseline error count — documented elsewhere in this workstream — is untouched by this session, since no implementation file was modified).

---

## 6. What must happen before Step 0 can be safely implemented

1. **Fix `computeObservedAcceptRate()`'s enum comparison** (`auto-recalibration.ts:89-97`) to match the real `TradeOutcome` enum values (`'ACCEPTED'`, not `'accepted'`/`'completed'`) — a small, focused, test-covered fix, deliberately **not** bundled into this ticket, since this task's scope is activation-readiness, not calibration-math changes, and any change to this function should ship with its own dedicated tests and review rather than ride along inside a "just wire it up" ticket.
2. **Add real unit test coverage for the rest of `auto-recalibration.ts` and `isotonic-calibrator.ts`** before activation — currently zero test coverage exists for any function in `lib/trade-engine/{accept-calibration,auto-recalibration,isotonic-calibrator,drift-detection}.ts` (confirmed by search prior to this session's one new file). The bug found here was invisible to `tsc` and to every existing test suite; only a targeted, real-data-shaped test caught it.
3. **Resolve the `calibratedB0` shared-field conflict** between `calibrateInterceptFromOutcomes()` (reachable, fake-constant-based) and `promoteShadowB0()` (currently orphaned, real-outcome-based) — a design decision, not a bug fix, likely deserving its own short ADR given this workstream's established governance discipline for touching calibration logic.
4. Only after 1–3: re-attempt the activation path designed in §3 of this document, with the same safety checklist re-run and passing in full.

---

## Files changed in this session

- `__tests__/trade-engine/auto-recalibration-activation-readiness.test.ts` (new — proves the blocker empirically)
- `docs/TRADE_LEARNING_ACTIVATION_BLOCKERS.md` (this document, new)

No other file was created, modified, or deleted. No cron entry, feature flag, or `vercel.json` change was made. No Decision OS code, public API, or existing calibration logic was touched or removed. Not committed — per this task's instructions, commit only if the activation path is proven safe (it is not).
