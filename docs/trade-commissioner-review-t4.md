# T4 — Commissioner Trade Review Intelligence

Audit-first. Deterministic, rule-based commissioner review over **existing** data. Do NOT merge until
reviewed.

**Explicitly: no AI, no LLM, no auto-veto, no collusion accusation, no player value changes, no
recommendations for managers.** This surfaces transparent rule-based flags + the captured T2/T3 data
to help a commissioner review trades fairly.

---

## PHASE 1 — Audit findings

### Review data that already exists (reusable)
| Source | Fields used |
|---|---|
| `RedraftTradeProposal` | status, vetoMode, vetoThreshold, expiresAt, proposer/receiverRosterId, assets, votes, decision |
| `RedraftTradeValueSnapshot` (T2) | grade, fairnessScore, confidenceScore, valueDifference, payload (sides/totals, commissionerReview, context) |
| `RedraftTradeMarketEvent` (T3) | eventType, grade, fairnessScore, payload — queryable per league/proposal |
| `RedraftTradeDecision` | terminal decision + reason |
| League settings | `League.tradeReviewHours`, `tradeDeadlineWeek`, `draftPickTrading`; `RedraftLeagueExtendedSettings.commissionerTradeReviewType` |
| Team profiles | `lib/trade-value/teamProfile.ts::buildTeamProfile` (stance, weak/strong positions, depth) |
| Season | sport, season year, currentWeek |
| Commissioner perms | `League.userId` (owner) or `LeagueTeam.isCommissioner/isCoCommissioner` |

### Computable deterministically (this PR)
- **Review summary**: reviewScore, fairnessScore, confidenceScore, valueDelta, grade, status,
  reviewRecommended, lopsided/deadline/expired flags, vetoMode, reviewHours.
- **Risk flags** (rule-based): `VALUE_DELTA_HIGH`, `LOW_CONFIDENCE_VALUES`, `ONE_SIDE_EMPTY`,
  `FAAB_IMBALANCE`, `DRAFT_PICK_INCLUDED`, `DEADLINE_NEAR`, `TRADE_ALREADY_ACCEPTED`,
  `TRADE_ALREADY_VETOED`, `VALUE_SNAPSHOT_MISSING`, `MARKET_EVENT_HISTORY_MISSING`.
- **Context flags** (from team profiles + assets): `CONTENDER_BUYING_POINTS`,
  `REBUILDER_ACQUIRING_FUTURE_VALUE`, `POSITION_NEED_FILLED`, `DEPTH_LOSS_WARNING`,
  `BYE_WEEK_COVERAGE`, `NCAAF_LIMITED_DATA`.
- **Market context V1** (T3 events only): sampleSize, avg/median fairness, accepted/vetoed counts,
  recent count — or `{ sampleSize: 0, message: 'Not enough AllFantasy market history yet' }`.

### Deferred (not in scope)
- `MANAGER_ALREADY_VOTED` — needs per-viewer vote lookup; deferred (the panel is league-wide commish
  context, not a per-manager voting aid). Documented.
- Cross-league market aggregation beyond same-league counts (sport/concept-wide) — V1 stays
  same-league + same-sport counts only to avoid leaking other leagues' detail.
- Adaptive values / value changes (T5).

### Visibility rules
- **Commissioner / co-commissioner / league owner only** for the review endpoint + panel. Regular
  managers → **403** (endpoint) / panel not rendered.
- Privacy: internal ids only — no emails/tokens/sessions. Output exposes only data a commissioner can
  already see (all trades + the captured snapshot/ledger).

---

## Architecture (Phases 2–6)
```
lib/trade-review/
  types.ts                          # ReviewSummary, RiskFlag, ContextFlag, MarketContext, CommissionerReview
  redraftCommissionerTradeReview.ts # pure buildCommissionerTradeReview(input) + flag detectors
  marketContext.ts                  # pure summarizeMarketContext(events)
```
- **API:** `GET /api/redraft/trades/[proposalId]/commissioner-review` — commissioner-gated; loads
  proposal + snapshot + events + settings + profiles, returns review summary + flags + market context
  + T2 snapshot summary + T3 event-trail summary.
- **UI:** commissioner-only panel in the Trade Center proposal row (grade/fairness/confidence/
  review-recommended + risk/context flags + market context + audit trail + read-only settings).
- **Settings exposure (read-only):** vetoMode, vetoThreshold, reviewHours, tradeDeadlineWeek,
  draftPickTrading (all already supported); FAAB support inferred from `faabBalance`. No new settings.

## Copy rules (commissioner-safe, non-accusatory)
Allowed: "Manual review suggested", "high value imbalance", "low confidence data", "may still make
sense because…". Never: "collusion", "cheating", "veto this", "approve automatically".

## Privacy
Internal ids only. Endpoint commissioner-gated. No PII in payloads (unit-tested).

## Future (T5 — NOT this PR)
Adaptive AllFantasy player values from the T3 ledger. T4 only reads existing data to present review
context; it changes nothing.
