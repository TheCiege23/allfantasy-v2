# T5 — AllFantasy Market Aggregates Foundation

Audit-first. **Read-only deterministic aggregates** over the T3 ledger. Do NOT merge until reviewed.

**Explicitly: no adaptive player values, no value mutation, no AI/LLM, no recommendations, no
auto-veto, no external calls. Not enough sample ⇒ no market claim.**

## Precondition (Phase 0) — met
PR #93 (T4) merged to main (`051e8ad2`) and production-smoked (commissioner review 200 + grade/
fairness/confidence/flags/audit trail; non-commissioner 403). Branched fresh from main.

---

## PHASE 1 — Audit findings

### Source: `RedraftTradeMarketEvent` (T3)
Columns: `leagueId`, `seasonId`, `tradeProposalId`, `eventType`, `sport`, `grade`, `fairnessScore`,
`confidenceScore`, `payload` (context/state/assets/profiles/snapshot), `createdAt`, `idempotencyKey`.
Indexes: `[leagueId, createdAt]`, `[tradeProposalId]`, `[eventType]`. Seeded `tc-*` fixtures emit the
full lifecycle. The market-events read endpoint (T3) + commissioner-review endpoint (T4) already exist
and are commissioner-gated.

### Computable safely now (deterministic, from existing events)
- **Market summary**: per-proposal outcome counts (accepted/rejected/canceled/vetoed/expired/
  processed), `sampleSize` (= distinct `proposal_created`), avg/median **fairness**, avg **confidence**,
  avg **valueDelta** (from `payload.snapshot.valueDifference`), `lastEventAt`.
- **Asset activity**: from `proposal_created` payload — `playerDemandCounts` (player appears in a
  proposal), `playerAcceptedCounts` / `playerVetoedCounts` / `playerRejectedCounts` (join player →
  that proposal's terminal event), `draftPickInclusionCount`, `faabInclusionCount`,
  `averageFaabAmount`, `totalFaabMoved` (FAAB on **accepted** proposals only).
- **Grade distribution**: A/B/C/D-F/unknown buckets from `proposal_created.grade`.
- **Review distribution**: `lopsidedCount` (fairness<60), `lowConfidenceCount` (confidence<60),
  `highValueDeltaCount` (fairness<70) — derived from the captured snapshot.

### Needs more volume (still returned, but no market claim under min sample)
Median/averages are weak below ~3 proposals → `sampleStatus = 'insufficient'` when `sampleSize < 3`
(raw counts still returned).

### Scope rules
- **league** — `leagueId` filter. Commissioner/owner gated (per-league detail).
- **sport** — `sport` column filter (cross-league **aggregate numbers only**, no per-league detail).
- **sport_concept** — `sport` + `payload.context.leagueType === 'redraft'` (in-memory filter; all
  redraft events today, so ≈ sport — implemented but noted).

### Deferred (not faked)
- `reviewRecommendedCount` — T4 does not persist `reviewRecommended` in the ledger →
  `null` (the `lowConfidenceCount`/`highValueDeltaCount` proxies are provided instead). Documented.
- Cross-league *per-entity* breakdowns beyond counts; adaptive values (T6).

### Privacy
Aggregates are counts/averages + internal player ids only. No emails/tokens/sessions; no per-team
private pending strategy beyond what a commissioner already sees. Endpoint commissioner/owner-gated.

---

## Architecture (Phases 2–5)
```
lib/trade-market/redraftTradeMarketAggregates.ts   # pure calculators + types
app/api/redraft/trades/market-aggregates/route.ts  # commissioner-gated read (scope=league|sport|sport_concept)
.../redraft/MarketSnapshotPanel.tsx                # small commissioner-only panel
```

### Dedupe strategy
Group events by `tradeProposalId`. Per-proposal: take the single `proposal_created` for value/grade
metrics; the terminal outcome = the latest of accepted/rejected/canceled/vetoed/processed/expired. A
proposal is never double-counted. Idempotency keys (T3) already guarantee one row per
`(proposal,eventType[,voter])`.

### Sample-size behavior
`sampleSize = distinct proposal_created`. `< 3` ⇒ `sampleStatus: 'insufficient'`, raw counts still
returned, no averages-based market claim in the UI.

## Future (T6/T7 — NOT this PR)
T6 adaptive AllFantasy player values (consumes these aggregates), T7 trade discovery, T8 Chimmy. **T5
changes no values.**
