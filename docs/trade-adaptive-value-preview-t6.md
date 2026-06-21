# T6 — Adaptive AllFantasy Player Value PREVIEW

Audit-first. A **read-only PREVIEW** of what AllFantasy's internal market value *would be* based on
completed trade-market data. Do NOT merge until reviewed.

**Explicitly: no canonical player-value mutation, no writes to `SportsPlayer`/projections/ADP/T2
snapshots, no AI/LLM, no recommendations, no auto-veto, no provider calls. Preview only.**

## Precondition (Phase 0) — met
PR #94 (T5) merged to main (`cde5487e`) and production-smoked (market-aggregates 200 for commissioner;
non-commissioner 403; accepted count updates 8→9 after a trade). Branched fresh from main.

---

## PHASE 1 — Audit findings

### Signals available (T3 ledger + T2 snapshots)
- **Strong positive:** `trade_processed`, `proposal_accepted` (a completed trade).
- **Friction (weak negative/context):** `proposal_rejected`, `proposal_canceled`, `proposal_expired`.
- **Negative:** `commissioner_vetoed`, `proposal_vetoed`.
- **Neutral/context (ignored for price):** `proposal_created`, `value_snapshot_created`,
  `league_vote_cast`.
- Per-player **observed value** = the player's `internalValue` inside the T2
  `RedraftTradeValueSnapshot.payload.sides[].assets[]` for proposals it appears in; per-trade
  `fairnessScore`/`confidenceScore` also from the snapshot.

### Reliability / what cannot be calculated yet (honest limits)
- **There is no independent observed market price per player.** The only per-player number is the
  deterministic T2 engine value (projection × scarcity + ADP) — using `marketRatio =
  observedValue / baseValue` is **circular** (≈ 1, no signal). So the preview is derived from
  **demand + friction signals** (completed-trade frequency, rejection/veto drag) around a real
  `baseValue` (median observed snapshot value), **not** a fabricated price. This is stated in the UI.
- Player ids in snapshot/asset payloads are the reliable join key.

### Sample / confidence rules
- `sampleSize` = distinct proposals the player appears in that carry a value snapshot.
- `< 3` ⇒ `direction = insufficient`, **no adjustment**.
- `3–9` ⇒ cap ±5% · `10–24` ⇒ cap ±10% · `25+` ⇒ cap ±15%. **Never exceed ±15%.**
- Low confidence (`< 40`) ⇒ no adjustment (preview stays at baseValue, direction `stable`).

### What stays preview-only
Everything. T6 never writes a value anywhere. Official adaptive values are T7.

---

## PHASE 2–4 — Architecture, signal rules, formula

`lib/trade-market/redraftAdaptiveValuePreview.ts` — pure `computeAdaptiveValuePreview(input)`.

### Per-proposal observation (built by the endpoint, deduped by proposalId)
`{ terminal: accepted|rejected|vetoed|canceled|expired|pending, observedValue: number|null,
fairnessScore, confidenceScore, createdAt }` for each proposal the player appears in.

### Formula (deterministic, documented)
```
baseValue        = median(observedValue across observations)        // real engine value
acceptedCount    = #accepted/processed ; frictionCount = #rejected+canceled+expired ; vetoedCount = #vetoed
recentTradeCount = observations within 30 days
rawSignal        = acceptedCount − 0.5·frictionCount − 1.0·vetoedCount
tierCap          = sampleSize<10 ? 5 : sampleSize<25 ? 10 : 15
confidence(0–100)= clamp( 40 + 8·acceptedCount + 0.3·avgSnapshotConfidence − 12·vetoedCount − 4·frictionCount , 0, 100)
                   (sampleSize<3 ⇒ confidence treated as insufficient)
adjustmentPercent= clamp( rawSignal · PER_UNIT(=1.5) · (confidence/100) · recencyMult , −tierCap, +tierCap )
                   then clamp(±15) overall
                   (confidence<40 ⇒ adjustmentPercent = 0)
marketPreviewValue = round( baseValue · (1 + adjustmentPercent/100) )
direction        = sampleSize<3 ? 'insufficient' : adj>0.5 ? 'rising' : adj<−0.5 ? 'falling' : 'stable'
```
`recencyMult` ∈ [0.8, 1.0] scales the signal up when most observations are recent. If no observation
carries a snapshot value, `baseValue` is null ⇒ return insufficient (no fabrication).

### Reasons (templated, non-accusatory)
e.g. "Based on N completed trades", "Vetoes/rejections reduced confidence", "Limited sample — preview
capped", "Not enough AllFantasy trade history yet to adjust this player".

---

## PHASE 5–6 — API + UI
- `GET /api/redraft/trades/adaptive-value-preview?leagueId=&playerId=` (single) and optional
  `?topMovers=1` (small movers list). Commissioner/owner-gated; managers **403**; no PII; safe-empty
  on insufficient/missing player.
- Small commissioner-only preview panel: player · baseValue · previewValue · direction · confidence ·
  sampleSize · reasons + **"Preview only. Does not change official player value."** Insufficient ⇒
  "Not enough AllFantasy trade history yet to adjust this player." No "official value"/"AI"/
  recommendation/collusion language.

## Privacy
Commissioner/owner-gated. Internal player ids only; no emails/tokens/sessions (unit-tested).

## Future (T7+ — NOT this PR)
T7 official adaptive AllFantasy player values (would persist + version values, gated, auditable),
T8 trade discovery, T9 Chimmy. **T6 changes nothing.**
