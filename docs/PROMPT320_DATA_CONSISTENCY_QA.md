# PROMPT 320 — Data Consistency QA

## Objective

Ensure data integrity across league, roster, draft, trades, and waiver data. Fix mismatches and missing relations where possible.

---

## Areas checked

### 1. League data

- **League** has `userId` (commissioner) and relations to rosters, draft sessions, waivers, etc. All use `onDelete: Cascade` from League, so deleting a league removes child records.
- **LeagueDivision**, **LeagueTeam**, **PromotionRule** reference `leagueId` with FK; no orphan risk under normal flows.
- **State consistency:** League cache is invalidated after roster/trade/waiver/settings mutations via `handleInvalidationTrigger` (see `lib/state-consistency` and `lib/trade-engine/caching.ts`).

### 2. Roster data

- **Roster** has `leagueId` → League (Cascade). `platformUserId` is a string (human user id or `orphan-{rosterId}` for AI-managed teams).
- **WaiverClaim** and **WaiverTransaction** have `rosterId` → Roster (Cascade) and `leagueId` → League (Cascade). Application must ensure `roster.leagueId === claim.leagueId` when creating claims (see fixes below).
- No application code deletes a single Roster without league context; Cascade from League handles cleanup.

### 3. Draft data

- **DraftSession** has `leagueId` → League (Cascade); one session per league (`@@unique([leagueId])`).
- **DraftPick** has `sessionId` → DraftSession (Cascade). `rosterId` is a string with no FK to Roster (by design: can be placeholder or historical after roster changes). Slot order and traded picks live in session JSON; rosterIds there are consistent at creation time from league rosters/teams.
- **DraftQueue**, **DraftPickTradeProposal** reference DraftSession (Cascade). Proposals store `proposerRosterId` / `receiverRosterId` as strings; validated in API via session and league access.
- No DB-level repair needed for draft; write path uses session’s slotOrder/tradedPicks from the league.

### 4. Trades

- **LeagueTrade** / **LeagueTradeHistory** are Sleeper-specific (sleeperLeagueId, sleeperUsername); not tied to app League/Roster FKs.
- In-app trade flows (trade block, evaluations) use league/roster context from session; no separate trade table with league/roster FKs that could get out of sync.

### 5. Waivers

- **WaiverClaim**: `leagueId` → League, `rosterId` → Roster. Risk: claim created with `rosterId` from another league (missing relation / mismatch).
- **WaiverTransaction**: created only during processing from existing claims; same roster/league as the claim.
- **WaiverPickup**: `leagueId` → League, `userId` → AppUser (Cascade).

---

## Fixes applied

### 1. Waiver claim creation: roster–league consistency

- **File:** `lib/waiver-wire/claim-service.ts`
- **Change:** Before creating a claim, verify that the roster exists and belongs to the league: `roster.leagueId === leagueId`. If not, throw so the API can return 400.
- **API:** `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts` catches that error and returns 400 with a clear message (e.g. "Roster not found or does not belong to this league").
- **Effect:** Prevents new WaiverClaim rows with mismatched roster/league; any future caller of `createClaim` (e.g. commissioner or bulk tools) is also protected.

### 2. League cache invalidation after waiver processing

- **File:** `lib/waiver-wire/run-hooks.ts`
- **Change:** At the start of `onWaiverRunComplete(leagueId, results)`, call `handleInvalidationTrigger('waiver_processed', leagueId)` so `invalidateLeagueCache(leagueId)` runs.
- **Effect:** After waivers are processed (commissioner or cron), league intel/assets caches are invalidated and the next request gets fresh data (rosters, waiver state).

---

## Detection / repair of existing data

### Waiver claims with wrong roster–league

- **Helper:** `lib/data-consistency/waiver-integrity.ts` exports `findWaiverClaimRosterMismatches(limit?)`. It returns claims where the roster is missing or `roster.leagueId !== claim.leagueId`.
- **Use:** Run from an admin script or one-off:  
  `const mismatches = await findWaiverClaimRosterMismatches(500)`  
  Then either:
  - Cancel/delete invalid pending claims (they should not be processable), or
  - Leave processed/historical claims as-is and only fix going forward via the new validation.
- **Repair:** If you need to remove invalid pending claims, delete by id or set status to `'cancelled'` for the returned claim ids; prefer doing this in a short script or admin-only API that uses the same helper.

---

## Summary

| Area        | Check / relation                         | Fix / note                                                                 |
|------------|-------------------------------------------|-----------------------------------------------------------------------------|
| League     | FKs, cascade, cache invalidation          | Already consistent; invalidation documented and used after mutations.     |
| Roster     | leagueId, waiver/draft references         | Waiver create path now enforces roster ∈ league.                          |
| Draft      | Session → League; picks use session data  | No FK for DraftPick.rosterId by design; creation path is league-scoped.    |
| Trades     | Sleeper vs app                            | No app League/Roster FK mismatch; trade data is external or session-based. |
| Waivers    | claim.rosterId vs claim.leagueId           | **Validation on create**; **cache invalidation after processing**; optional **detection helper** for existing bad data. |

---

## Reference

- **State consistency (refresh / cache):** `lib/state-consistency/README.md`, `lib/state-consistency/refresh-triggers.ts`, `lib/trade-engine/caching.ts`
- **Waiver claim service:** `lib/waiver-wire/claim-service.ts`
- **Waiver run hooks:** `lib/waiver-wire/run-hooks.ts`
- **Data consistency helpers:** `lib/data-consistency/waiver-integrity.ts`, `lib/data-consistency/index.ts`
