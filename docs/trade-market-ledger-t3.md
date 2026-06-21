# T3 — AllFantasy Trade Ledger + Market Event Foundation

Audit-first. **This PR does NOT change player values.** It only captures a clean, normalized,
deterministic event ledger across the existing redraft trade lifecycle so a proprietary trade-value
market can be built later (T5). No AI, no LLM, no adaptive values, no recommendations, no external
API calls in write paths. Do NOT merge until reviewed.

---

## PHASE 1 — Audit findings

### Where each lifecycle action is handled (post-PR #90)
| Action | Handler | Event(s) to capture |
|---|---|---|
| Proposal created | `POST /api/redraft/trade-proposals` (after `created` + after `captureRedraftTradeValueSnapshot`) | `proposal_created`, `value_snapshot_created` |
| Accept (receiver) | `trade-votes` → `finalizeAcceptedTrade` (settlement tx) | `proposal_accepted`, `trade_processed` |
| Settlement failure | `finalizeAcceptedTrade` catch → 409 | `trade_failed` |
| Reject (receiver) | `trade-votes` `action==='reject'` | `proposal_rejected` |
| Cancel (proposer) | `trade-votes` `action==='cancel'` | `proposal_canceled` |
| Commissioner approve | `trade-votes` `commissioner_approve` → `finalizeAcceptedTrade` | `commissioner_approved`, `trade_processed` |
| Commissioner veto | `trade-votes` `commissioner_veto` **and** `POST /api/redraft/trades/veto` | `commissioner_vetoed` |
| League vote | `trade-votes` `vote_approve`/`vote_veto` (counts + threshold) | `league_vote_cast` (+ terminal `proposal_accepted`+`trade_processed` or `proposal_vetoed` when threshold resolves) |
| Expiry | `trade-votes` expiry branch | `proposal_expired` |

### Events that already exist implicitly
Lifecycle status transitions (`pending→accepted/rejected/cancelled/vetoed/expired`), the mirrored
`RedraftLeagueTrade` (accept only), `RedraftTradeDecision` (audit of terminal decision), and the
`RedraftTradeValueSnapshot` (T2). The AF learning system (`recordAfLearningEvent`) already fires
loosely-typed events, but they are not a normalized market ledger and are not queryable per-league
with snapshot/value context. T3 adds the dedicated normalized ledger.

### Deferred (backend support does not exist yet — not invented)
- **counter** — no native counter (a "counter" is a new proposal); no event.
- **multi-team** — engine is strictly two-party; no event.
- **trade block / trade interest** — not part of the trade lifecycle (and native versions don't exist).
- Draft-pick **ownership** transfer (picks are reference-only) — pick asset details are captured in the
  event payload, but there is no pick-settlement event.

### Captured now
`proposal_created`, `value_snapshot_created`, `proposal_accepted`, `trade_processed`,
`proposal_rejected`, `proposal_canceled`, `commissioner_approved`, `commissioner_vetoed`,
`league_vote_cast`, `proposal_vetoed` (vote threshold), `proposal_expired`, `trade_failed`.

---

## Schema (Phase 2)

```prisma
model RedraftTradeMarketEvent {
  id              String   @id @default(cuid())
  leagueId        String
  seasonId        String
  tradeProposalId String
  eventType       String
  actorUserId     String?          // internal user id only — never email/token/session
  idempotencyKey  String   @unique // stable per (proposal,eventType[,voter]) — dedupes retries
  statusAtEvent   String?
  sport           String?
  grade           String?          // from snapshot if present
  fairnessScore   Int?
  confidenceScore Int?
  payload         Json     @default("{}")  // normalized context/state/assets/profiles
  createdAt       DateTime @default(now())
  @@index([leagueId, createdAt])
  @@index([tradeProposalId])
  @@index([eventType])
  @@map("redraft_trade_market_events")
}
```
- **No FK** to `redraft_trade_proposals`: the ledger must survive even if a proposal row is later
  removed (it is an append-only market record). `tradeProposalId` is a plain indexed string.
- Additive, idempotent migration; applied to Neon via `db execute` + `migrate resolve` (the live DB has
  unrelated drift, so `migrate dev` is not used) — same pattern as T2.

## Idempotency strategy
`idempotencyKey`:
- One-shot lifecycle events: `${tradeProposalId}:${eventType}` (a retried accept/veto can't duplicate).
- Per-voter event: `${tradeProposalId}:league_vote_cast:${voterRosterId}` (one row per voter, updated
  on revote via the unique key).
Writes use create-then-ignore-`P2002`, so duplicate lifecycle calls never create duplicate events.

## Privacy rules
- Only **internal user ids** (`actorUserId`) — never emails, tokens, sessions, or auth details.
- Payload carries roster/team ids, asset references, value summary, and team-profile stance only —
  no other team's private *pending strategy* beyond what the proposal already exposes to participants.
- The read endpoint is **commissioner/owner-gated** for league-wide history.

## How this feeds future market learning (T4/T5 — NOT this PR)
The normalized ledger (asset summaries + captured snapshot values + context + outcomes) is the raw
substrate a later phase can aggregate into AllFantasy's proprietary trade-value market. **T3 writes
the ledger only — it never reads it back to change any player value.**

---

## Validation (Phase 9)
trade/redraft/trade-value tests · route + integration tests · Playwright trade walkthrough · Draft
Room Regression (alone) · eslint · touched-file tsc · git diff --check · clean `C:\tmp` build.
