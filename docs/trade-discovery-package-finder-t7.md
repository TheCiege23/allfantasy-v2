# T7 — Trade Discovery + Package Finder Foundation

Audit-first. Deterministic partner matching + package suggestions over existing T2–T6 data + rosters.
Do NOT merge until reviewed.

**Explicitly: no AI/LLM, no automatic trade sending, no auto-veto, no official adaptive value mutation,
no provider calls, no KTC scraping.** Suggestions only — the user always builds/sends the trade.

## Precondition (Phase 0) — met
PR #95 (T6) merged to main (`9b74e4b1`) and production-smoked (adaptive preview bounded ±15% for
commissioner; non-commissioner 403; never-traded player → insufficient). Branched fresh from main.

---

## PHASE 1 — Audit findings

### What can drive **partner matching** (safe now)
- **Positional need/surplus** from `RedraftRosterPlayer.position` counts vs `STARTER_NEEDS`
  (reuses `lib/trade-value/teamProfile.ts`). Reliable — positions always present.
- **Team stance** (contender/rebuilder/middle) from `buildTeamProfile`.
- **Recent trade activity** from the T5 market aggregates / T3 ledger (a partner who trades).
- **Value-band overlap** (coarse) from player values.

### What can drive **package suggestions**
- **Per-player value** = `normalizedPlayerValue({ projection, position })` (T2 value engine) where
  `projection` = latest `FantasyProjection.projectedPoints` (batch-loaded for the two rosters);
  fallback to a positional-scarcity baseline when no projection → `LOW_DATA_CONFIDENCE`.
- **FAAB** (supported: `RedraftRoster.faabBalance`).
- **Draft picks** reference-only, gated by `League.draftPickTrading` → `DRAFT_PICK_REFERENCE_ONLY`.

### Suggestable assets now
Owned, non-locked players; FAAB (when balance > 0); reference-only picks (when enabled). Never
suggest assets the user doesn't own, locked players, fabricated picks, unsupported FAAB, or
multi-team packages.

### Deferred (not faked)
- **Native trade block / trade interest** — still absent (`TradeBlockEntry` is Sleeper-import only).
  Surfaced as `TRADE_BLOCK_UNAVAILABLE` (no fake block UI).
- Multi-team packages; real owned-pick inventory.

### UI entry point (safest)
Trade Center → user-facing **"Find a Trade"** section for the viewer's own roster. "Build proposal"
preselects the partner in the existing `TradeCenterModal` (never auto-submits).

### Privacy
Logged-in league member; **own roster only unless commissioner/owner**; no emails/tokens/sessions;
no hidden pending claims/strategy; only normal league display names + public roster composition.

---

## PHASE 2–3 — Architecture

```
lib/trade-discovery/redraftTradeDiscovery.ts   # pure: types, partner matching, package finder
app/api/redraft/trades/discovery/route.ts      # GET partners for a roster (auth + own-roster/commish)
app/api/redraft/trades/package-finder/route.ts # POST packages for my+partner rosters
.../redraft/TradeDiscoveryPanel.tsx            # "Find a Trade" UI in Trade Center
```

### Matching logic (deterministic)
`matchScore` (0–100) = weighted sum of: my-surplus↔their-need overlap, their-surplus↔my-need overlap,
stance compatibility (contender↔rebuilder bonus), recent-activity bonus. `matchReasons[]` templated.

### Package finder (V1)
Types: player-for-player, two-for-one, one-for-two, player+FAAB (if supported). For a give/receive
pair compute `myTotalValue` / `partnerTotalValue` / `valueDelta` and a **fairness band**:
`balanced` (|delta| small), `slight edge you` / `slight edge partner`, `lopsided` (|delta| large),
`low confidence` (missing values). 3–5 suggestions per partner when possible; safe empty otherwise.
`canStartProposal` true only when all assets are owned, non-locked, and supported.

### Warning flags
`LOW_DATA_CONFIDENCE`, `VALUE_GAP_HIGH`, `POSITION_DEPTH_RISK`, `SAME_POSITION_SWAP`,
`DRAFT_PICK_REFERENCE_ONLY`, `FAAB_UNSUPPORTED_OR_LIMITED`, `TRADE_BLOCK_UNAVAILABLE`,
`NCAAF_LIMITED_DATA`.

## Future (T8/T9 — NOT this PR)
T8 official adaptive values, T9 Chimmy trade intelligence, T10 automated negotiation. **T7 suggests
only; it sends nothing and changes no values.**
