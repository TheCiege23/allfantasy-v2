# Trade Learning — Data Capture Readiness Audit

**Status:** Audit complete. No code changed — the obvious-looking fix turned out to require a product decision, per this phase's own explicit branching rule (see §4).
**Branch:** `g15-event-foundation`
**Scope:** Decision OS — Trade Learning Phase 5, following Phase 1 (`0376b9ed0`), Phase 2 (`092b0a114`), Phase 3 (`6766d4fa4`), Phase 4 (`45c538a67`).
**Method:** Read-only code audit (three parallel research passes plus direct verification of their findings). No database connection this session — Phase 4 already measured staging's row counts; this phase explains *why* those counts are zero.

> **Correction (same session, after the third research pass finished and was verified):** the first version of this document, and the commit it shipped in, claimed `TradeFeedback` has zero live write call sites anywhere in the codebase. **That was wrong** — the third research pass found a real one, verified directly: `POST /api/legacy/trade/feedback` (dispatched via `app/api/legacy/[...path]/route.ts`'s `["trade","feedback"]` pattern to `server/api-route-modules/legacy/trade/feedback/route.ts:53`, `prisma.tradeFeedback.create(...)`), called from `app/af-legacy/page.tsx`'s `submitTradeFeedback()` — a real, `gtag`-tracked rating widget on AI-suggested trades in a "trade finder" feature. The earlier claim was based on a grep that never searched `server/` (only `app/`, `lib/`, `scripts/`) — an incomplete search, not a correct finding stated with appropriate hedging. §1, §2, and §3 below are corrected accordingly. This is left visible rather than silently fixed, consistent with this workstream's practice of treating its own prior claims as falsifiable.

---

## 1. Root cause (headline)

**Staging is empty not because data hasn't accumulated yet, but because the live, real trade-*completion* flow (`AfLeagueTrade`) was never connected to the trade-learning calibration tables at all — production would show the same zero for `TradeOutcomeEvent`/`TradeOfferEvent`, no matter how much real trading happens, until this is fixed.** This is a materially different and more important finding than "give it more time." (`TradeFeedback` is a separate, narrower case — corrected below — that likely explains its own zero differently: real traffic through one specific legacy page, not a missing writer.)

The codebase has **at least three, possibly four, parallel trade-related data systems that do not talk to each other**:

1. **Trade-engine-v2 calibration tables** (`TradeOfferEvent`, `TradeOutcomeEvent`, `TradeLearningStats`) — the tables this entire Phase 1–4 workstream is about. `TradeOfferEvent` is written **only** by five hypothetical-evaluation tool endpoints (a user asking "would this trade be accepted," not a real trade happening). `TradeOutcomeEvent` is written **only** by a backfill job (`logAcceptedTradesAsOutcomes()`) that reads *already-imported* `LeagueTrade` history — never from a live trade actually completing in the app.
2. **The real, live in-app trade system** (`AfLeagueTrade` + four related tables, `lib/league-trade-engine/tradeService.ts`) — this is where actual trades get proposed, accepted, rejected, countered, vetoed, cancelled, and finalized (rosters actually swap players) in real redraft leagues today. It has its own, **separate** learning/event system (`afLearningEvent`, via `recordAfLearningEvent()`/`recordTradeOutcomeForBothManagers()`/`recordRedraftTradeMarketEvent()`) that captures real trade-completion events — but writes to a completely different table that nothing in `lib/trade-engine/` ever reads.
3. **Legacy/imported data** (`LeagueTrade`, `LeagueTradeHistory`) — populated by a Sleeper/Yahoo history-import job (`lib/dynasty-import/normalize-historical.ts`), not live trade activity.
4. **Two separate, live, currently-written feedback flows that neither one nor the other half of the calibration system reads correctly:** `Feedback` (written by `persistVote()`, keyed by internal `userId`, triggered by thumbs up/down on AI-generated trade *suggestions* in the modern/current feedback UI) **and** `TradeFeedback` (written by `POST /api/legacy/trade/feedback`, keyed by `sleeperUsername`, triggered by a rating widget on `app/af-legacy/page.tsx`'s legacy "trade finder" page — corrected finding, see the note above). `calibrateFromFeedback()` reads only `TradeFeedback`, so it is fed by real, live data from one specific, older UI surface — but is blind to any feedback generated through the newer `Feedback`-backed surface. Whether `TradeFeedback`'s real, live volume is enough to matter (i.e., whether `af-legacy`'s trade-finder page still gets meaningful traffic) is unmeasured — a real question for a future, explicitly-approved staging count, not this document.

**Net effect:** `TradeOfferEvent`/`TradeOutcomeEvent` (predictions and real trade outcomes) have no connection to real trade completions in the current app, by construction — that part of the original conclusion holds. `TradeFeedback` is different: it does have a real, live writer, just on a narrower, possibly-low-traffic legacy surface, and the calibration system's feedback path is split across two live tables rather than reading from a table with no writer at all. Real trade *completion* activity flows entirely through system #2, which the calibration system has never been wired to observe.

---

## 2. Capture-path map

| Workflow | Route/module | Current write target | Missing event write | Confidence | Recommended fix |
|---|---|---|---|---|---|
| **Propose** a real trade | `app/api/leagues/[leagueId]/trades/route.ts` POST → `createAfLeagueTrade()` (`lib/league-trade-engine/tradeService.ts`) | `AfLeagueTrade` (+ `AfLeagueTradeItem`, `AfLeagueTradeStatusHistory`, `AfLeagueTradeProcessingEvent`) | No `TradeOfferEvent` written — no acceptance-probability prediction is ever computed/logged at proposal time for a real trade | High | **Not obvious/safe — see §4.** Requires deciding whether every real proposal should be silently scored by the acceptance model, with what inputs, and at what cost. |
| **Accept** (instant) | `app/api/leagues/[leagueId]/trades/[tradeId]/accept/route.ts` → `acceptAfLeagueTrade()` → `finalizeAfLeagueTradeProcessing()` | `AfLeagueTrade.status='processed'` + `afLearningEvent` (`trade_accepted`) + roster asset transfer (`lib/redraft/tradeSettlement.ts`) | No `TradeOutcomeEvent` written | High | Mechanically simple (map `processed`→`ACCEPTED`) **but produces a row with `offerEventId: null`, which `computeShadowB0()`/`computeSegmentB0s()` explicitly filter out (`WHERE offerEventId IS NOT NULL`) — a write with zero effect on calibration.** Not useful without the proposal-time prediction from the row above. |
| **Accept** (commissioner-review / league-vote pending states) | Same route, intermediate `awaiting_commissioner`/`awaiting_votes` statuses | `AfLeagueTrade.status` update + `AfLeagueTradeStatusHistory` | N/A — non-terminal state | High | None needed; not a completion event. |
| **Reject** | `app/api/redraft/trade-votes/route.ts` (action=`reject`) | `AfLeagueTrade.status='rejected'` + `afLearningEvent` (`trade_rejected`) | No `TradeOutcomeEvent` | High | Same caveat as Accept above. |
| **Counter** | `app/api/leagues/[leagueId]/trades/route.ts` POST with `parentTradeId` set → `createAfLeagueTrade()` | New `AfLeagueTrade` row + parent updated to `status='countered'` | No `TradeOutcomeEvent` (real enum value `COUNTERED` exists and would map cleanly) | Medium | Same caveat — still needs a linked prediction to be useful. |
| **Veto** (commissioner) | `app/api/redraft/trades/veto/route.ts` | `AfLeagueTrade.status='vetoed'` + `afLearningEvent` + `AfLeagueTradeStatusHistory` | No `TradeOutcomeEvent` | High | `TradeOutcome` enum has no `VETOED` value — would need to map to `REJECTED` or `UNKNOWN`, itself a small but real judgment call (a veto isn't the same signal as an organic rejection). |
| **Veto** (league vote) | `app/api/redraft/trade-votes/route.ts` (action=`vote_veto`) → `castAfTradeVetoVote()` | `AfLeagueTradeVote` + `AfLeagueTrade.status='vetoed'` if threshold reached | Same as above | High | Same as above. |
| **Cancel** | `app/api/leagues/[leagueId]/trades/[tradeId]/cancel/route.ts` → `cancelAfLeagueTrade()` | `AfLeagueTrade.status='cancelled'` | No `TradeOutcomeEvent` — and no clean `TradeOutcome` enum value exists for "withdrawn by proposer," which is a different signal than a rejection | Medium | Genuinely ambiguous — a cancellation may say nothing about trade fairness (a manager just changed their mind). Recommend excluding from learning signal entirely rather than mis-mapping to `REJECTED`. |
| **Expire** | `app/api/redraft/trade-votes/route.ts`, checked on-demand (no scheduled cron found) | Legacy `redraftTradeProposal.status='expired'` — **note: this is a separate legacy table, not `AfLeagueTrade`** | No `TradeOutcomeEvent` (real enum value `EXPIRED` exists) | Medium | Same prediction-linkage caveat, plus: confirm whether `redraftTradeProposal` and `AfLeagueTrade` are the same logical trade system under two names or genuinely parallel — out of this phase's scope to resolve. |
| **Finalize / settle assets** | `lib/redraft/tradeSettlement.ts` → `settleRedraftTradeAssets()` | `RedraftRosterPlayer`, `RedraftRoster.faabBalance` | N/A — pure roster mechanics, correctly has no learning-table write | High | None — this is out of scope by design; it's the execution step, not the signal-recording step. |
| **Hypothetical evaluation** (trade-evaluator, instant/trade, proposal-generator, league-analyze, trade-console) | 5 routes, all calling `logTradeOfferEvent()` directly | `TradeOfferEvent` (real, live writes — this table is NOT empty by design, only empty *on this specific staging branch* per Phase 4, likely because no one has used these tools against it) | None — this half works as designed | High | None — working as intended; just disconnected from #2's real completions, which is the actual gap. |
| **Trade feedback — modern surface (thumbs up/down on an AI suggestion)** | `persistVote()` (`lib/trade-feedback-profile.ts`) | `Feedback` model (`userId`, `vote`, `reason`) — **not** `TradeFeedback` | `calibrateFromFeedback()` never reads this table at all | High | Not obvious/safe — see below; this is one half of a two-table split feedback signal. |
| **Trade feedback — legacy surface (rating widget on `af-legacy` trade finder)** | `submitTradeFeedback()` in `app/af-legacy/page.tsx` → `POST /api/legacy/trade/feedback` (dispatched by `app/api/legacy/[...path]/route.ts` to `server/api-route-modules/legacy/trade/feedback/route.ts:53`) | `TradeFeedback` model (`sleeperUsername`-keyed) — **real, live write, `gtag`-tracked** | `calibrateFromFeedback()` *does* read this one — so this specific surface is not disconnected, but its real volume is unmeasured (a possibly low-traffic legacy page) | High — corrected this session after the initial claim of "zero live writers" was found wrong (an earlier grep never searched `server/`) | Not obvious/safe — requires deciding whether to (a) also read the modern `Feedback` table (reconciling `userId` vs `sleeperUsername`, a calibration-math-adjacent schema decision), (b) leave `calibrateFromFeedback()` reading only the legacy surface, or (c) something else. A design decision either way, not a mechanical fix. |
| **Legacy trade history import** | `lib/dynasty-import/normalize-historical.ts` | `LeagueTrade` (`upsert`), keyed to `LeagueTradeHistory` (`sleeperUsername`/`sleeperLeagueId`) | Feeds the now-retired `calibrateInterceptFromOutcomes()` and the still-live `logAcceptedTradesAsOutcomes()` backfill — both only ever see *imported* trades, never live in-app ones | High | No fix needed for its own purpose (it's an import job, working as designed); just note it's structurally incapable of ever reflecting live `AfLeagueTrade` activity. |

---

## 3. Canonical capture model — what should this actually be?

The task asks which of the following the app is "supposed" to learn from: live redraft trade runtime events, legacy trade engine events, commissioner trade votes, user feedback, imported provider trade history, or some combination. **The honest answer: nothing in the current codebase designates one as canonical — they were each built independently, at different times, for different purposes, with no unifying decision.** `afLearningEvent` (fed by real `AfLeagueTrade` completions) is the closest thing to "the real signal" — it's the only one that captures genuine trade completions in the live app — but the trade-engine-v2 calibration system (`TradeOfferEvent`/`TradeOutcomeEvent`/`TradeLearningStats`, the subject of Phases 1–4) has no awareness of it at all. User feedback specifically is *worse* than "not canonical" — it's actively split across two live, real, currently-written tables (`Feedback` and `TradeFeedback`, §2) with only one read by the calibration system, meaning real feedback signal from the modern UI surface is silently invisible to `calibrateFromFeedback()` today. Deciding which of all of these should be canonical, and how the others relate to it (retired? bridged? left standalone?), is exactly the kind of decision this document does not make — see §6.

---

## 4. Whether any code was changed — no, and why

The task's own instructions permit implementing "if the missing capture path is obvious and safe," with the explicit example "adding a missing `TradeOutcomeEvent` write after an already-finalized accepted/rejected trade" — and explicitly forbid implementing anything that "requires product decisions about what should count as a learning signal."

This looked, at first, like exactly that safe example. It is not, for a precise, verified reason: **`computeShadowB0()` and `computeSegmentB0s()` both query `TradeOutcomeEvent` with `WHERE offerEventId IS NOT NULL`** (confirmed directly in `lib/trade-engine/auto-recalibration.ts`, unchanged since Phase 0). A `TradeOutcomeEvent` row written after a real `AfLeagueTrade` completes would have `offerEventId: null`, because no `TradeOfferEvent` (a logged prediction) exists for that trade — real proposals never go through `logTradeOfferEvent()`. Such a write would be **silently invisible to the entire calibration pipeline** — passing this phase's literal instruction ("add a write after a finalized trade") while accomplishing nothing, which is worse than not implementing it, because it would create the appearance of progress without any real effect, and nobody reviewing the diagnostics endpoint would know why `shadow.sampleSize` stayed at zero despite real trades happening.

Making the write *meaningful* requires also logging a real acceptance-probability prediction (`TradeOfferEvent`) at the moment a trade is proposed — which requires deciding: should every real trade proposal be silently scored, using which inputs (real `AfLeagueTradeItem` asset references don't necessarily match the shape the evaluation tools construct from user-submitted player lists), at what computational cost, and how do intermediate/ambiguous states (`vetoed`, `cancelled`, `expired`) map onto a `TradeOutcome` enum that has no `VETOED` value and no natural affordance for "withdrawn, not evaluated on the merits"? These are precisely the "what counts as a learning signal" product decisions this phase is told not to resolve unilaterally.

**Therefore: no code was changed this session.**

---

## 5. Minimum required fixes before shadow rollout can become observable

In dependency order:

1. **Decide and implement live prediction-logging at real trade-proposal time** — call the existing acceptance-probability model (the same one the 5 hypothetical-evaluation tools already use) when a real `AfLeagueTrade` is proposed, and log it via `logTradeOfferEvent()`, capturing a real `offerEventId`. Without this, nothing downstream can ever be meaningful.
2. **Decide the `AfLeagueTrade.status` → `TradeOutcome` enum mapping**, including the ambiguous cases (`vetoed`, `cancelled`, intermediate states) — likely needs its own short ADR given `TradeOutcome` has no `VETOED` value and this workstream's established practice of not making enum/mapping decisions silently.
3. **Wire the real completion event** (accept/reject/counter/expire, now that a matching `offerEventId` exists from step 1) to call `logTradeOutcomeEvent()` with the correctly-mapped outcome.
4. **Resolve the split-feedback finding** (corrected this session — `TradeFeedback` is real and live, not dead) — decide whether `calibrateFromFeedback()` should also read the modern `Feedback` table (a `userId`-vs-`sleeperUsername` and shape reconciliation), stay reading only the legacy `af-legacy` surface, or something else. Either way, this is a second, independent gap from #1–3 and should probably be its own follow-up rather than bundled in.
5. Only after 1–4: Phase 4's staging measurement becomes meaningful to repeat, since there would finally be a real write path to measure.

None of 1–4 is implemented here, per §4.

---

## 6. Recommended next phase

**Decision OS — Trade Learning Phase 6: Live Capture Design ADR.** Mirroring this workstream's own established precedent (`docs/TRADE_LEARNING_CALIBRATED_B0_OWNERSHIP_ADR.md`) for exactly this situation — a design question with several real options, not a bug with one obvious fix. It should decide, in order:
- Whether real trade proposals should get a live prediction logged, and with what inputs/cost.
- The `AfLeagveTrade.status` → `TradeOutcome` mapping, explicitly handling `vetoed`/`cancelled`/`expired`.
- Whether `calibrateFromFeedback()` should read both live feedback tables (`Feedback` and `TradeFeedback`), stay reading only the legacy `TradeFeedback` surface it already does, or something else.
- Whether `afLearningEvent` (the system that already captures real completions today, just for a different purpose) should be a direct input rather than building a second, parallel real-completion listener.

Only after that ADR is reviewed should implementation (the actual write points from §5) proceed — consistent with how the `calibratedB0` ownership question was handled in Phase 0/1 of this exact workstream.

---

## Verification

- Full focused suite re-run (no source changed, so this is a regression sanity check, not a validation of new behavior): trade-engine, trade-learning, diagnostics, admin diagnostics route, and all Decision OS trade-slice tests — see commit for exact counts.
- `npm run typecheck` — re-run to confirm the baseline is unaffected (no source touched).

---

## Files changed in this session

- `docs/TRADE_LEARNING_DATA_CAPTURE_AUDIT.md` (this document — created, then corrected in the same session after the third research pass's finding was verified; see the correction note at the top)

No source code was created, modified, or deleted. No calibration math, recommendation logic, Decision OS classifiers, AI Coach, Chimmy, or public API was touched. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere. No database was queried this session (Phase 4 already measured staging; this phase explains the measurement via code audit only).
