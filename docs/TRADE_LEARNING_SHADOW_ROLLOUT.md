# Trade Learning — Shadow Rollout Guide

**Audience:** whoever is considering flipping `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` on.
**Status:** the system is implemented and observable (Phase 1 + Phase 2). **Not enabled anywhere.** This document does not recommend a rollout date — it tells you what to check before picking one.
**Related:** `docs/TRADE_LEARNING_ACTIVATION_BLOCKERS.md` (full implementation history), `docs/TRADE_LEARNING_CALIBRATED_B0_OWNERSHIP_ADR.md` (why the system is shaped this way), `docs/DECISION_OS_CLOSED_LOOP_LEARNING_AUDIT.md` (why this exists at all).

---

## What this system does, in one paragraph

Once enabled, a weekly cron (`app/api/cron/trade-weekly-recalibration`) calls `runWeeklyRecalibration()`, which reads real `TradeOutcomeEvent` rows (trades that were actually accepted, rejected, or expired), compares the observed acceptance rate against what the model predicted, and computes a corrected intercept (`shadowB0`). That correction sits untouched for 7 days (a "shadow" period), and is only promoted into the live `calibratedB0` — the value every trade-evaluation route actually reads — if it still holds up (enough samples, doesn't diverge too wildly from the current value) after that wait. Nothing about trade recommendations, scoring, or any other math changes; only this one intercept number can move, slowly, and only from real data.

---

## How to enable it

1. Set `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED=true` in the target environment (staging first, strongly recommended — see checklist below).
2. That's the entire enablement step. The cron entry already exists in `vercel.json` (`0 11 * * 1`, weekly) and is already inert — setting the flag is what activates it. No deploy of new code is required to enable/disable; it's a pure environment-variable flip.
3. To disable again: unset the flag (or set it to anything other than `"true"`). The next scheduled run will no-op immediately, logging `[TradeLearningScheduler] skipped: disabled (...)`. This is the rollback procedure — see below.

---

## How to monitor it

### The diagnostics endpoint

`GET /api/admin/trade-learning/diagnostics` (admin-authenticated, read-only). Call it any time — it never triggers a run, only reports current stored state. Key fields to watch:

| Field | What it tells you |
|---|---|
| `operational.weeklyRecalibrationEnabled` | Is the flag actually on right now, in this environment. |
| `scheduler.lastRecalibrationAt` / `daysSinceLastRecalibration` | When the pipeline last actually completed a computation (not just "was invoked" — see below for that distinction). |
| `scheduler.wouldRunIfInvokedNow` / `skipReasonIfAny` | If the cron fired this second, would it proceed or skip, and why. |
| `shadow.pending` / `shadow.sampleSize` / `shadow.minRequiredSample` | Is there a shadow value waiting, and does it have enough real data behind it yet (30 minimum). |
| `shadow.ageDays` / `shadow.isMature` / `shadow.maturityThresholdDays` | How close the pending shadow is to its 7-day promotion eligibility. |
| `shadow.divergenceFromActive` / `shadow.withinDivergenceCap` | Would this shadow value actually be allowed to promote (must be within 0.40 of the current `calibratedB0`), or would it be silently rejected as too large a jump. |
| `promotion.hasEverBeenPromoted` / `lastPromotedAt` / `lastPromotedB0` | Has a real promotion ever actually happened, and when. |
| `calibratedB0.current` | The live value every trade-evaluation route is currently using. |
| `calibrationHealth.ece` / `.brierScore` / `.alerts` | Independent calibration-quality signal (reused from the pre-existing, previously-unwired `calibration-metrics.ts`) — is the model well-calibrated regardless of what the weekly job is doing. |
| `drift.overallSeverity` | Whether the separate, already-reachable drift-detection job (`runDriftDetection()`, via `/api/internal/analyze-trades`) has flagged anything. |

### Logs

Every scheduled invocation (whether the cron fires or you manually hit the route) logs:
```
[TradeLearningScheduler] invoked (flag=enabled)
```
then, if enabled, `runWeeklyRecalibration()`'s own existing logs (cadence check, shadow computation, promotion decision, segments, isotonic), followed by:
```
[TradeLearningScheduler] complete — shadowComputed=true, promoted=false, segments=0, isotonic=false
```
If disabled: `[TradeLearningScheduler] skipped: disabled (...)` and nothing further runs.

**Important distinction:** the cron *invokes* the scheduler every week regardless of the flag — that "invoked" log line will appear weekly even while disabled. What changes when you enable the flag is whether anything past that line executes.

---

## Expected behavior during the first week

- **Immediately after enabling**: the very next cron firing (or sooner, if triggered manually) will call `runWeeklyRecalibration()` for real. If this is the first time it's ever run for a season with no prior `TradeLearningStats` row, `lastRecalibrationAt` is null, so the cadence gate is skipped (nothing to compare against) and it proceeds straight to computing.
- **If fewer than 30 real `TradeOutcomeEvent` rows exist** for the season: `computeShadowB0()` returns `null`, no shadow is computed, nothing is written except possibly `lastRecalibrationAt` staying unset. The diagnostics endpoint will show `shadow.pending: false` and the log will read `[AutoRecal] Only N outcomes, need 30. Skipping shadow b0.` — this is the expected, common case immediately after enabling on a low-volume season. **This is not a failure.**
- **Once ≥30 outcomes exist**: a shadow value appears (`shadow.pending: true`, `shadow.isMature: false`, `shadow.ageDays` starting near 0).
- **Segments** (`SF`/`1QB`/`TEP`/league-format buckets) each independently need ≥50 samples — expect these to lag behind the global shadow by a wide margin, especially early on.
- **Isotonic calibration mapping** needs ≥50 samples too, and is the least likely of the three to have enough data in week one.

## Expected maturity progression

- **Day 0–6**: shadow value sits and holds; `shadow.isMature` stays `false`; nothing promotes; `calibratedB0` does not move.
- **Day 7+**: on the next scheduled invocation after the shadow turns 7 days old, `promoteShadowB0()` checks divergence. If the shadow is within 0.40 of the current `calibratedB0`, it promotes — `calibratedB0` changes, `promotion.hasEverBeenPromoted` flips to `true`, and a new shadow computation starts fresh on the same run.
- **If divergence exceeds 0.40**: promotion is silently skipped (logged as `Shadow b0 diverges … exceeds max 0.40`), the shadow is simply recomputed next time — it does not accumulate or retry more aggressively. If this keeps happening every week, that itself is a signal worth investigating (see checklist) rather than something to override.
- **Ongoing**: expect small, gradual, clamped movements (±0.60 max per computation cycle) rather than large jumps — this is by design.

## Rollback procedure

1. Unset (or set to non-`"true"`) `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED`.
2. No code deploy is required — this takes effect on the next invocation.
3. `calibratedB0` is **not** automatically reverted to its pre-enablement value by disabling the flag — whatever value was last promoted stays in place, since it's the live value every trade route reads. If a rollback of the *value itself* (not just future computation) is ever needed, that requires a manual `TradeLearningStats.calibratedB0` update — this document does not provide that procedure, since it hasn't been needed and shouldn't be improvised under pressure; if it comes up, treat it with the same care as any other production data fix.
4. Nothing else needs to change — `calibrateInterceptFromOutcomes()` remains retired regardless of this flag's state (that decision, per the ownership ADR, is independent of whether weekly recalibration is currently enabled).

## Operational checklist — before enabling anywhere

- [ ] Check `GET /api/admin/trade-learning/diagnostics` on the target environment first — confirm `shadow.sampleSize` / real `TradeOutcomeEvent` volume is nonzero, so you're not enabling something that will sit idle for weeks with zero visibility into whether it's "working" or "waiting."
- [ ] Enable in **staging first**, not production, and watch at least one full 7-day maturity cycle before considering production.
- [ ] After enabling, check the diagnostics endpoint and logs after the *first* scheduled firing — confirm `[TradeLearningScheduler] invoked (flag=enabled)` appears and the run completes without error (`ok: true` from the cron route).
- [ ] Watch `calibrationHealth.ece`/`.alerts` and `drift.overallSeverity` throughout the shadow period — these are independent of whether promotion has happened yet and can surface a problem before any `calibratedB0` change occurs.
- [ ] When the first promotion happens (`promotion.hasEverBeenPromoted` flips to `true`), spot-check a live trade-evaluation route's output before vs. after — confirm the change in `calibratedB0` produced a sensible, bounded shift in acceptance-probability output, not a surprising jump.
- [ ] Decide, explicitly, who owns watching this and for how long before it's considered "safe" for the next environment — this document intentionally does not make that call.
