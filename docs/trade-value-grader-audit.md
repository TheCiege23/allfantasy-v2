# T2 — Trade Value Snapshot + Grader: Audit + Architecture

Audit-first per directive. **Deterministic foundation only** — no AI, no LLM, no market learning,
no adaptive values, no recommendations. Do NOT merge until reviewed.

Scope target: the **native redraft** trade system (`RedraftTradeProposal` / `RedraftTradeAsset`,
shipped in PR #89). The audit below documents what valuation data exists, what is reusable, what is
missing, and what can be safely captured at proposal time.

---

## PHASE 1 — Audit findings

### Trade plumbing (from PR #88/#89, confirmed)
- **Proposal creation:** `POST /api/redraft/trade-proposals` (two-party; assets player/draft_pick/faab/future_consideration).
- **Asset storage:** `RedraftTradeAsset { assetType, playerId, playerName, pickSeason/round/number, metadata Json }`.
  The Trade Center modal already writes `metadata.restOfSeasonProjection` (+ position/team/injury) per player asset.
- **History storage:** `RedraftTradeProposal` (+ accepted mirror `RedraftLeagueTrade`).
- **Settlement:** `lib/redraft/tradeSettlement.ts` (players + FAAB) — T2 keystone from PR #89.
- **Review/veto flow:** `/api/redraft/trade-votes` (accept/reject/cancel/commissioner_approve/veto/league_vote).

### Valuation data that EXISTS and is REUSABLE
| Source | Model / lib | Use for T2 |
|---|---|---|
| **Projections** | `FantasyProjection.projectedPoints`; surfaced as `restOfSeasonProjection` on redraft roster players and captured in `RedraftTradeAsset.metadata` | **Primary** value signal, available at proposal time |
| **ADP** | `AdpDataRecord.adp` (indexed by `playerId`), `AllFantasyAdpSnapshot`, `AiAdpSnapshot` | **Secondary** value signal via server lookup by playerId |
| **Deterministic valuation precedent** | `lib/player-valuation-features.ts::computePlayerValuation` (0–10000 scale) | Pattern reused (normalized 0–10000 scale); not called directly (it needs raw season stat lines, not projections) |
| **Standings / roster** | `RedraftRoster` (wins/losses/pointsFor/playoffSeed), `RedraftRosterPlayer` (position/slot) | **Team profile** inputs |

### Exists but intentionally NOT used in V1 (documented, deferred)
- **`lib/fantasycalc.ts`** — live external fetch to `api.fantasycalc.com` (1h in-memory cache). Excluded
  from the deterministic proposal-write path (latency/availability/non-determinism). FantasyCalc value
  is captured as a **null placeholder** with a typed slot, to be wired in a later phase.
- **Rankings** (`RankingsSnapshot`, `RookieRanking`) — not reliably keyed to redraft players at proposal
  time; ranking value captured as a **null placeholder** slot.
- **`lib/hybrid-valuation.ts`, `lib/trade-value-console/*`** — market/AI-coupled analyzers → **out of
  scope** (T3+). Not imported.

### Missing (built by T2)
1. A **per-proposal immutable value snapshot** store → new `RedraftTradeValueSnapshot` model.
2. A deterministic **`normalizedTradeValue`** for players / picks / FAAB → `lib/trade-value/valueEngine.ts`.
3. A **team profile** engine → `lib/trade-value/teamProfile.ts`.
4. A **trade grader** (grade / value difference / fairness / confidence / explanation bullets) →
   `lib/trade-value/grader.ts`.
5. A **commissioner review** data object (fairness, lopsided flag, review-recommended, similar-value range).

### Safe to capture at proposal time
- **Player:** playerId, playerName, position, team · projectionValue (FantasyProjection / asset
  metadata) · adpValue (AdpDataRecord lookup) · rankingValue (null/deferred) · fantasyCalcValue
  (null/deferred) · internalValue (= normalizedTradeValue).
- **Pick:** identifier, season, round · estimatedValue (deterministic round/recency curve).
- **FAAB:** amount · valueEquivalent (fixed FAAB→value constant).
- **Context:** leagueType, scoring, rosterFormat, sport, timestamp.

---

## Architecture (Phases 2–8)

```
lib/trade-value/
  types.ts          # AssetValueSnapshot, TradeValueSnapshot, TeamProfile, TradeGrade
  valueEngine.ts    # normalizedTradeValue(player|pick|faab) -> 0..10000  (documented formula)
  teamProfile.ts    # buildTeamProfile(standings, roster) -> TeamProfile
  grader.ts         # gradeTrade(sideA, sideB, profiles) -> TradeGrade + commissionerReview
  snapshot.ts       # buildTradeValueSnapshot(assets, context) -> TradeValueSnapshot
```

- **Schema:** `RedraftTradeValueSnapshot { id, proposalId @unique, payload Json, grade, fairnessScore,
  confidenceScore, createdAt }` — written once at proposal creation, **never updated** (survives
  accept/reject/veto/expiry). Migration documented in the PR.
- **Capture:** `/api/redraft/trade-proposals` POST builds + persists the snapshot in the same
  transaction as the proposal. GET includes it; history reads it verbatim.
- **UI:** Trade Center review step renders per-team totals, grade, fairness, confidence, explanation
  bullets, snapshot timestamp + "Values captured at proposal time"; offers/history render the stored
  snapshot (original grade/values) even if live values later change.

### Value formula (V1, documented)
`normalizedTradeValue` is a transparent 0–10000 score:
- **Player:** `base = projection-derived points × position scarcity weight`, lightly adjusted by ADP
  (lower ADP ⇒ small premium), clamped 0–10000. Pure function of captured projection + ADP + position.
- **Pick:** deterministic curve by round (and season recency) — reference-only value.
- **FAAB:** `value = amount × FAAB_VALUE_PER_DOLLAR` (fixed constant).

Exact coefficients live in `valueEngine.ts` and are unit-tested; documented in the PR body.

---

## Out of scope (future phases, NOT in this PR)
T3 market learning · T4 commissioner intelligence · T5 adaptive AllFantasy values · T6 Chimmy trade
intelligence · trade recommendations · trade finder AI · auto-veto · trade block/interest expansion.
