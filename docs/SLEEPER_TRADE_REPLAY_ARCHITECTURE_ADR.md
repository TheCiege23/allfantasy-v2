# ADR — Sleeper Trade Replay Architecture

**Status:** Proposed. Design only — no migration authored, no code written, no Sleeper data imported, no database (staging or production) touched.
**Branch:** `g15-event-foundation`
**Follows:** `docs/SLEEPER_TRADE_INGESTION_AUDIT.md` (the real-data audit this ADR turns into a design), `docs/TRADE_LEARNING_CAPTURE_ARCHITECTURE_ADR.md` (the precedent this document's format and governance approach deliberately mirrors), `docs/TRADE_LEARNING_SHADOW_ROLLOUT.md`, `docs/DECISION_OS_RECOMMENDATION_CONSOLIDATION_PLAN.md`.
**Constraint honored:** this document proposes no migration, no import job, no calibration-math change — a human reviews the design questions before any implementation phase touches real Sleeper data or the database.

---

## 1. Replay purpose

The audit's central finding (`docs/SLEEPER_TRADE_INGESTION_AUDIT.md` §5) is the load-bearing constraint on everything below: a Sleeper-imported historical trade has no "our model predicted X, then the manager decided Y" moment — the manager never saw AllFantasy's model. This rules out one of the four candidate purposes outright and ranks the rest:

| Candidate purpose | Verdict | Why |
|---|---|---|
| **Model backtesting** | **Primary purpose** | Run the existing, unmodified deterministic trade-engine against real historical trades, using each league's real scoring context, and compare the model's *retroactive* prediction against the real, known outcome. This is the one purpose the data is actually suited for. |
| **Future offline evaluation** | **Primary purpose, same mechanism as backtesting** | A fixed, versioned corpus of real trades that any *future* model version can be re-run against, to answer "did the new model get better or worse at scoring real market behavior?" — this is backtesting applied repeatedly over time, not a separate mechanism (see §2's `modelVersion` design). |
| Diagnostics only | **Already served** | `docs/SLEEPER_TRADE_INGESTION_AUDIT.md` itself is this — confirming API shape and data completeness. This ADR's schema goes further than diagnostics-only would require, which is intentional (see below). |
| Recommendation validation | **A specific downstream consumer of backtesting, not a separate purpose** | Once `docs/DECISION_OS_RECOMMENDATION_CONSOLIDATION_PLAN.md`'s proposed trade-related Decision OS slices exist, they could be validated against this same replay corpus the same way the deterministic engine is — this ADR's design doesn't need a separate mechanism for it, only the same backtest-and-compare shape applied to a different model. |

**Explicitly not a purpose:** feeding Decision OS's manager-DNA/behavioral-facts pipeline as if it were genuine in-app behavioral signal (per the audit §5 and this task's own exclusion — Sleeper managers' decisions were never influenced by anything AllFantasy computed, so this data documents *Sleeper market behavior*, not *response to our recommendations*).

---

## 2. Schema design

**Two tables, not one** — a deliberate split, not the single flat table the audit's own "next implementation prompt" sketched. Reasoning: the *raw imported fact* of a real Sleeper trade (what happened, who was involved, what assets moved) is immutable and fetched once. The *backtested prediction* is not — it depends on which version of the deterministic trade-engine produced it, and the entire "future offline evaluation" purpose in §1 requires being able to re-run backtests against the same fixed raw corpus as the model changes over time, without re-fetching from Sleeper or duplicating the raw facts per model version.

### 2.1 `SleeperTradeReplay` — the raw imported fact, one row per real Sleeper trade

| Field | Type | Purpose |
|---|---|---|
| `id` | `String @id @default(uuid())` | Internal primary key |
| `sleeperLeagueId` | `String` | Sleeper's `league_id` — required per task |
| `sleeperTransactionId` | `String` | Sleeper's `transaction_id` — required per task |
| `season` | `Int` | Sleeper season year (e.g. `2025`) |
| `sleeperWeek` | `Int` | The round/week bucket the transaction was fetched under. **Documented caveat, carried forward from the audit (§3):** for offseason dynasty-league trades this is Sleeper's own bucket, not necessarily the real calendar week the trade occurred — do not treat this as a literal week number without checking `proposedAt`. |
| `proposedAt` | `DateTime` | From Sleeper's real `created` epoch-ms field |
| `resolvedAt` | `DateTime?` | From Sleeper's real `status_updated` epoch-ms field; null if still pending at ingestion time |
| `sleeperStatus` | `String` | Raw Sleeper status at ingestion time (`complete` \| `pending` \| `failed`) — stored verbatim, never coerced into our own `TradeOutcome` enum (see §4) |
| `rosterIdsInvolved` | `Json` (`number[]`) | Sleeper's own `roster_ids` array on the transaction |
| `managerUserIds` | `Json` (`{ rosterId: number; sleeperUserId: string }[]`) | Resolved via the `/rosters` → `/users` join confirmed working in the audit |
| `managerDisplayNames` | `Json` (`{ rosterId: number; displayName: string }[]`) | Denormalized for human readability/debugging only — never treated as an identity source of truth |
| `assetsGiven` / `assetsReceived` | `Json` | Normalized, per-manager-pair asset breakdown (name/type/value), intentionally shaped like `TradeOfferEvent.assetsGiven/assetsReceived` for eventual comparability — **but this is a structurally separate table, never the same table** (see §4) |
| `rawTransactionPayload` | `Json` | The full, unmodified Sleeper transaction object (`adds`/`drops`/`draft_picks`/`consenter_ids`/etc.) — kept verbatim so re-processing (e.g., a schema-mapping bug fix) never requires re-fetching from Sleeper |
| `leagueScoringSnapshot` | `Json` | The league's `scoring_settings`/`roster_positions`/`settings` **at ingestion time** — a snapshot, not a live reference, since a league's settings can change season to season and reproducibility requires freezing what was true when this trade happened |
| `isDynasty` / `isSuperFlex` | `Boolean` | Derived once from `leagueScoringSnapshot` at ingestion, cached for query convenience (mirrors the existing `resolveLeagueScoringContext()` convention in `lib/league-trade-engine/tradeLearningCapture.ts`) |
| `ingestSourceSleeperUserId` | `String` | Which connected Sleeper account's league list this row was discovered through — several accounts could share a league, this records provenance without implying exclusivity |
| `ingestedAt` | `DateTime @default(now())` | When this row was written, distinct from `proposedAt`/`resolvedAt` (Sleeper's real timestamps) |

**Idempotency key:** `@@unique([sleeperLeagueId, sleeperTransactionId])`. A real Sleeper trade is uniquely identified by its own league+transaction ID pair; re-running ingestion against the same league/week must not create duplicate raw-fact rows.

### 2.2 `SleeperTradeBacktestResult` — one row per (raw trade × model version)

| Field | Type | Purpose |
|---|---|---|
| `id` | `String @id @default(uuid())` | Internal primary key |
| `replayId` | `String` | FK to `SleeperTradeReplay.id` |
| `modelVersion` | `String` | Identifies which version of the deterministic trade-engine produced this backtest — required per task. Proposed value: the git commit SHA of `lib/trade-engine/` at backtest time (mirroring how `docs/TRADE_LEARNING_PRE_ENABLEMENT_AUDIT.md`'s own migration record already cites commit SHAs as its versioning convention), not a hand-maintained semantic version string |
| `backtestedAcceptProb` | `Float` | The reconstructed acceptance probability — output of the existing, unmodified `calibrateAcceptProbability()`, called with the frozen `leagueScoringSnapshot`'s scoring context |
| `backtestedVerdict` | `String` | The deterministic verdict (`computeTradeDrivers()`'s `verdict` field) the model would have given |
| `backtestedDriverSet` | `Json` | The full `TradeDriverData` output — lineup impact, VORP, market, behavior scores, driver evidence — kept for detailed inspection, not just the headline probability |
| `realOutcome` | `String` | Normalized, comparable outcome label — **only populated as a settled value when `SleeperTradeReplay.sleeperStatus === 'complete'`**; null/unset otherwise (see §4) |
| `replayComputedAt` | `DateTime @default(now())` | When *this specific backtest run* was computed — distinct from `ingestedAt` on the raw-fact row, since the same raw trade can be backtested many times across model versions |

**Idempotency key:** `@@unique([replayId, modelVersion])`. This is the design's central decision: **a new model version gets a new backtest row, it never overwrites the previous one.** This is what makes "future offline evaluation" (§1) real — a fixed replay corpus that accumulates one comparable result row per model version, so a query like "did model v2 score real trades more accurately than v1" is a straightforward join, not a destroyed-history problem.

---

## 3. Ingestion flow

1. **Pull user leagues** — `GET /user/{sleeperUserId}/leagues/nfl/{season}`, for the connected Sleeper account(s), per league discovery already proven in the audit.
2. **Pull transactions by week** — `GET /league/{leagueId}/transactions/{round}` for rounds 1–18 (or fewer, per the audit's finding that offseason dynasty trades cluster in the earliest rounds — but the ingestion job should still check the full range rather than assume this holds for every league format).
3. **Filter to trades** — `type === 'trade'` only; discard `waiver`/`free_agent` transaction types, which this ADR's scope does not cover.
4. **Normalize assets and managers** — resolve player IDs against a **locally cached** copy of `/players/nfl` (refreshed on a schedule, never re-fetched per trade — the audit confirmed this is a ~14.6MB static blob); draft picks require no extra lookup (Sleeper embeds `round`/`season`/`owner_id`/`previous_owner_id` directly); resolve `roster_ids` → Sleeper `user_id` → `display_name` via the `/rosters` + `/users` join the audit verified end-to-end.
5. **Snapshot league scoring/settings** — `GET /league/{leagueId}` once per league per ingestion run, stored into `leagueScoringSnapshot`.
6. **Write the raw fact** — upsert into `SleeperTradeReplay`, keyed by `(sleeperLeagueId, sleeperTransactionId)`.
7. **Run the backtest** — call the existing, unmodified `computeTradeDrivers()` + `calibrateAcceptProbability()` (`lib/trade-engine/trade-engine.ts` / `accept-calibration.ts`) using the frozen `leagueScoringSnapshot`'s scoring context, tag the result with the current `modelVersion`, and upsert into `SleeperTradeBacktestResult` keyed by `(replayId, modelVersion)`.

Steps 1–6 and step 7 are separable — the backtest step can be re-run independently and repeatedly (a new model version, a bug fix, a different scoring assumption) without re-touching Sleeper's API or steps 1–6's output at all. This separability is the direct payoff of the two-table split in §2.

---

## 4. Exclusions

- **No pending-trade assumptions unless observed.** Per the audit (§3), a trade's `sleeperStatus` is stored exactly as Sleeper reports it at ingestion time. If a trade is `pending` when ingested, `SleeperTradeReplay.resolvedAt` and `SleeperTradeBacktestResult.realOutcome` are left unset — the ingestion flow does not assume it will later resolve to any particular status, and does not retroactively backfill without a real re-check against Sleeper.
- **No production writes.** Every table, every write in this design targets staging only, exactly as every other real-database phase in this workstream has required explicit, same-turn approval before any write occurs. This ADR itself makes zero writes anywhere.
- **No live calibration table writes.** `SleeperTradeReplay`/`SleeperTradeBacktestResult` are structurally incapable of being picked up by `computeShadowB0()`'s `WHERE offerEventId IS NOT NULL` query — they are not `TradeOfferEvent`/`TradeOutcomeEvent` rows, have no `offerEventId` column, and no code path in this design ever writes to those two tables. `calibratedB0`/`shadowB0`/`TradeLearningStats` are untouched by this entire design.
- **No treating replay as native manager decision data.** `realOutcome` on a `SleeperTradeBacktestResult` row describes *what actually happened in a real Sleeper league*, evaluated retroactively against our model — it is never written into any Decision OS behavioral-facts table, `ManagerBehavioralFacts`, or Manager DNA input, because the manager who made that real decision never saw AllFantasy's model at the time they made it (the exact distinction the audit's §5 already established).

---

## 5. Validation metrics

Once real backtest rows exist (a future, separately-approved phase), the following metrics become computable — none require any new data beyond what §2's schema already captures:

| Metric | Computation | What it tells you |
|---|---|---|
| **Predicted acceptance vs. actual completed trades** | For every `SleeperTradeBacktestResult` where `realOutcome` is settled (i.e., the underlying trade's `sleeperStatus === 'complete'`), compare `backtestedAcceptProb` against the fact that the trade *did* complete — this is the backtested analogue of `computeObservedAcceptRate()`, applied to imported data instead of live-captured data | Whether the model's acceptance probabilities skew realistic against real market behavior it never trained on |
| **Fairness distribution** | Distribution of `backtestedDriverSet`'s value-differential/fairness component across the real trade corpus | Whether real accepted Sleeper trades cluster near what the model calls "fair," or whether the model sees a meaningfully different distribution than real markets produce |
| **Value-delta distribution** | Distribution of `assetsGiven`/`assetsReceived` value differential (from `leagueScoringSnapshot`-contextualized valuations) across real trades | A market-calibration sanity check independent of the model's own acceptance-probability output |
| **Manager/team archetype context, if available** | Where a Sleeper-connected manager is *also* a real AllFantasy user with existing Manager DNA/archetype data, segment backtest accuracy by that archetype | Whether backtest accuracy varies systematically by manager type — **conditional on real overlap existing**, which the audit did not measure and this ADR does not assume |
| **League settings sensitivity** | Segment backtest accuracy by `isSuperFlex`/`isDynasty`/scoring format (from `leagueScoringSnapshot`) | Whether the model's segment-aware calibration design (`computeSegmentB0s()`'s SF/1QB/TEP segments) generalizes to real external leagues, not just AllFantasy's own live-captured population |

All five metrics are read-only aggregate queries over `SleeperTradeReplay`/`SleeperTradeBacktestResult` — none require touching `TradeLearningStats` or any live calibration table, consistent with §4's separation.

---

## 6. Explicit separation from live calibration

This is the single most important property of the design, stated plainly:

- **Different tables.** `SleeperTradeReplay`/`SleeperTradeBacktestResult` are net-new, structurally separate from `TradeOfferEvent`/`TradeOutcomeEvent`. No foreign key, no shared unique constraint, no shared `mode` enum value connects them.
- **Different write path.** Nothing in this design calls `logTradeOfferEvent()`/`logTradeOutcomeEvent()` (the only writers of the live tables) or `captureLiveTradeOffer()`/`captureLiveTradeOutcome()` (the live-capture ADR's wiring). A future implementation of this ADR would add its own, entirely separate ingestion service.
- **Different read path.** `computeShadowB0()`, `promoteShadowB0()`, `computeSegmentB0s()`, and `runWeeklyRecalibration()` (`lib/trade-engine/auto-recalibration.ts`) query only `TradeOutcomeEvent`/`TradeOfferEvent`/`TradeLearningStats` — none of this design's tables are, or ever should be, referenced by those functions.
- **Different provenance semantics.** `TradeOfferMode.LIVE_PROPOSAL` (added in the live-capture ADR) means "a real AllFantasy user proposed this inside our own app, and our own model scored it in real time." This design's rows mean "a real Sleeper user proposed this on Sleeper's own platform, years or months ago, and our model scored it retroactively, after the fact." These are not interchangeable claims, and nothing in this design blurs that line — `SleeperTradeBacktestResult` never carries a `LIVE_PROPOSAL` mode value or any equivalent.
- **Different learning consequence.** A live-captured trade's outcome can, once `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` is on, move `calibratedB0`. Nothing produced by this design can ever move `calibratedB0` — there is no code path from `SleeperTradeBacktestResult` to `TradeLearningStats.calibratedB0`, by construction, not by a runtime guard that could later be removed.

---

## 7. Non-goals (unchanged, this phase and the next)

- No migration is created in this document. No Prisma schema file is touched.
- No Sleeper data is imported. No API call beyond what the audit already made (and did not repeat) occurs in this phase.
- No calibration math, threshold, or weight changes.
- `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere.
- No change to `lib/league-trade-engine/tradeService.ts`'s live capture wiring.
- No Chimmy wiring, no AI Coach migration — both explicitly out of scope per this task.

## 8. Rollout / risk (for a future implementation phase)

- Purely additive schema (two new tables, zero existing table/column altered) — same risk profile as the live-capture ADR's own schema change.
- The two-table split (§2) means the highest-blast-radius part of a future implementation (repeatedly re-running backtests as the model evolves) never needs to touch Sleeper's API again after initial ingestion — lowering the risk of hitting Sleeper's rate limits on every re-evaluation.
- Real, external, third-party data (other real Sleeper users' trades, not just the connected account's own) is being read — worth a light privacy note for a future phase: only publicly-exposed Sleeper league data (visible to any co-owner in a shared league, which is how Sleeper's own API already works) is read; nothing beyond what Sleeper itself already exposes to any league member is touched.
- A future implementation phase should follow this workstream's established discipline exactly: hand-authored migration, `prisma validate`/`generate` offline only, explicit same-turn approval before any staging deployment or real Sleeper API pull beyond what this audit already sampled.

---

## Files changed in this session

- `docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md` (this document, new)

No other file was created, modified, or deleted. No migration was authored. No Sleeper API call was made this session (this phase reused the audit's already-verified findings rather than re-querying). No database (staging or production) was queried or connected to. No calibration math, threshold, or weight was changed. `TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED` remains unset everywhere.
