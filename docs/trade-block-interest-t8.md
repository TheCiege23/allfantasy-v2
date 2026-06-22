# T8 — Native Trade Block + Interest Foundation

Audit-first. Native AllFantasy trade block + trade interest so managers explicitly signal what they'll
move and want. Feeds T7 discovery now and T3/T5/T6 market signals. Do NOT merge until reviewed.

**Explicitly: no AI/LLM, no official player-value mutation, no automatic trades/auto-submit, no
auto-veto, no provider calls, no KTC scraping.**

## Precondition (Phase 0) — met
PR #96 (T7) merged to main (`ebf740ad`) and production-smoked (discovery own-roster 200 + 4 partners;
other-roster 403; package finder owned-only, no auto-submit/value-mutation language). Branched fresh.

---

## PHASE 1 — Audit findings

1. **Native block data does not exist.** No model ties a tradeable-player signal to native
   `RedraftRoster`/`leagueId`. → build `RedraftTradeBlockItem` + `RedraftTradeInterest`.
2. **Imported Sleeper `TradeBlockEntry` is NOT native** — keyed by `sleeperLeagueId` (VarChar) /
   `rosterId Int` / `createdByUsername`, bound to the Sleeper-import world. It cannot represent a
   native redraft roster (`leagueId` UUID + `RedraftRoster` cuid + `ownerId`). Left untouched.
3. **Managers can publish (block):** owned players + asking-for positions + wantsFaab + wantsDraftPicks
   + packagePreference + note + optional expiry. League-visible.
4. **Managers can mark interest in:** a player, a position need, a package, FAAB, or picks
   (`interestType`). Targets another roster/player but **never creates a proposal**.
5. **League-visible:** active trade-block items. 6. **Private:** interests default `visibility=private`
   (only affect the owner's own discovery) unless explicitly `public`.
7. **Feeds T7 discovery immediately:** block items boost partner match + package suggestions
   (`TRADE_BLOCK_MATCH`, "Player is on the trade block"); own (incl. private) interest boosts the
   owner's own discovery (`INTEREST_MATCH` / `PRIVATE_INTEREST_USED`). `TRADE_BLOCK_UNAVAILABLE` is
   dropped where native block data is present.
8. **Feeds T3/T5/T6 later:** `trade_block_*` / `trade_interest_*` market events (signals only — no
   value changes).

---

## PHASE 2 — Schema (additive)
```prisma
model RedraftTradeBlockItem {
  id String @id @default(cuid())
  leagueId String
  rosterId String
  playerId String
  playerName String
  position String?
  team String?
  askingForPositions Json @default("[]")
  wantsFaab Boolean @default(false)
  wantsDraftPicks Boolean @default(false)
  packagePreference String?
  note String?
  visibility String @default("league")
  status String @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime?
  @@unique([leagueId, rosterId, playerId])
  @@index([leagueId, status]); @@index([rosterId, status]); @@index([playerId, status])
  @@map("redraft_trade_block_items")
}
model RedraftTradeInterest {
  id String @id @default(cuid())
  leagueId String
  fromRosterId String
  targetRosterId String?
  playerId String?
  playerName String?
  position String?
  interestType String   // player_interest|position_need|package_interest|faab_interest|pick_interest
  note String?
  visibility String @default("private")
  status String @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([leagueId, status]); @@index([fromRosterId, status]); @@index([playerId, status])
  @@map("redraft_trade_interests")
}
```
No FK (signals must survive roster churn); additive idempotent migration applied via `db execute` +
`migrate resolve` (live Neon has drift; not `migrate dev`) — same pattern as T2/T3.

## PHASE 3–4 — Services + routes
`lib/trade-block/redraftTradeBlockService.ts` (pure-ish, server): upsert/list/deactivate block,
upsert/list/deactivate interest, privacy-safe discovery signals, ownership validation (**reject
players not on the roster**). Managers manage only their own roster; commissioner views league-wide.
- `GET/POST /api/redraft/trades/trade-block`, `DELETE …/trade-block/[itemId]`
- `GET/POST /api/redraft/trades/interests`, `DELETE …/interests/[interestId]`
Auth: logged-in member; own roster only unless commissioner; no PII; no private-strategy leakage.

## PHASE 5 — Market events (T3 extension)
Add `trade_block_added/updated/removed`, `trade_interest_added/updated/removed` to
`RedraftMarketEventType`. Idempotent, best-effort (never break the user action). Signals only.

## PHASE 6 — Discovery integration
Block match → `TRADE_BLOCK_MATCH` + reason + score boost; own interest → `INTEREST_MATCH` /
`PRIVATE_INTEREST_USED` boost; `BLOCK_ITEM_EXPIRED` filtered; unowned block = **validation error**,
not a UI warning. `TRADE_BLOCK_UNAVAILABLE` only when no native block exists.

## Privacy
Internal ids only. Block league-visible; interest private-by-default. Commissioner sees league-wide
block + public signals; private interest only affects its owner.

## Future (T9/T10 — NOT this PR)
T9 official adaptive values, T10 Chimmy trade intelligence, T11 automated negotiation. **T8 changes no
values and sends no trades.**
