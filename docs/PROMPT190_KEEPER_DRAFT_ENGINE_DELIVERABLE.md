# PROMPT 190 — AllFantasy Keeper Draft Engine Deliverable

## Overview

Keeper draft support with **deterministic, rules-based** enforcement: configurable keeper rules, round-cost logic, protected player carryover, and draft board integration. AI is optional for advice only (who to keep, value, strategy, risk).

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (per `lib/sport-scope.ts`).

---

## 1. Rule Engine

- **Location:** `lib/live-draft-engine/keeper/KeeperRuleEngine.ts`
- **Behavior:** Deterministic validation only (no AI).
  - **Max keepers:** Enforces `config.maxKeepers` per roster; commissioner override can add beyond limit when needed.
  - **Round cost:** Must be in `[1, rounds]`; one keeper per round per roster (no duplicate round cost).
  - **Duplicate player:** Same player cannot be kept twice for same roster; global duplicate keeper protection across rosters by default.
  - **Max keepers per position:** Optional `config.maxKeepersPerPosition` (e.g. `{ QB: 1, RB: 2 }`); commissioner override can bypass.
  - **Player name:** Required non-empty.
- **Exports:** `validateKeeperSelection`, `validateRosterKeeperSelections`.

---

## 2. Schema & Migration

- **Prisma:** `DraftSession` has:
  - `keeperConfig` (Json): `{ maxKeepers, deadline?, maxKeepersPerPosition? }`
  - `keeperSelections` (Json): array of `KeeperSelection`
- **Migration:** `prisma/migrations/20260321000000_add_keeper_draft_fields/migration.sql`
- **Types:** `lib/live-draft-engine/keeper/types.ts` — `KeeperConfig`, `KeeperSelection`, `KeeperLock`.

---

## 3. Keeper ↔ Draft Order

- **Location:** `lib/live-draft-engine/keeper/KeeperDraftOrder.ts`
- **Behavior:** Maps roster + round cost → (round, slot, overall) for snake/3RR; builds `KeeperLock[]` for draft board; respects traded picks via `resolvePickOwner`.

---

## 4. Session Snapshot

- **Location:** `lib/live-draft-engine/DraftSessionService.ts`
- When `keeperConfig` is present, snapshot includes `keeper`: `{ config, selections, locks }`; locks from `buildKeeperLocks`.

---

## 4.5 Keeper Runtime Automation

- **Location:** `lib/live-draft-engine/keeper/KeeperAutomationService.ts`
- Deterministic tick applies keeper-locked on-clock picks (`source: 'keeper'`) and advances draft state.
- Integrated in:
  - `GET /api/leagues/[leagueId]/draft/session`
  - `GET /api/leagues/[leagueId]/draft/events`
  - `POST /api/leagues/[leagueId]/draft/session` start flow
  - `POST /api/leagues/[leagueId]/draft/controls` action `keeper_tick`
- Result: keeper locks are progression-safe enforcement, not visual-only.

---

## 5. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/leagues/[leagueId]/draft/keepers` | GET | Config, selections, locks, mySelections, carryover visibility, deadline lock, currentUserRosterId |
| `/api/leagues/[leagueId]/draft/keepers` | POST | Add/update one keeper (rosterId, roundCost, playerName, position, team?, playerId?, commissionerOverride?) with deadline + carryover eligibility enforcement |
| `/api/leagues/[leagueId]/draft/keepers/config` | PATCH | Commissioner: set maxKeepers, deadline, maxKeepersPerPosition (pre_draft only) |
| `/api/leagues/[leagueId]/draft/keepers/remove` | POST | Remove keeper by rosterId + playerName or rosterId + roundCost; commissioner can remove any; deadline lock applies for non-commissioners |
| `/api/leagues/[leagueId]/draft/controls` | POST (`keeper_tick`) | Manual deterministic keeper automation tick |

---

## 6. UI Changes

- **DraftBoard:** Accepts `keeperLocks`; grid shows keeper picks in locked slots with player and “K” badge.
- **DraftBoardCell:** Renders “K” badge when `pick.isKeeper` is true.
- **DraftRoomPageClient:** Passes `keeperLocks={session.keeper?.locks}` to `DraftBoard`; when keeper config exists or user is commissioner, renders `KeeperPanel` and passes it to shell as `keeperPanel`.
- **DraftRoomShell:** Optional `keeperPanel`; new mobile tab “Keepers” (Shield icon); tab visible when `keeperPanel` is provided.
- **KeeperPanel:** Shows config summary (max keepers, deadline), deadline lock status, roster carryover visibility, “My keepers” list with remove, and “Add keeper” form (player name, position, team, round).
  - Commissioner config includes max keepers, deadline, and position cap JSON.
  - Commissioner roster targeting + override checkbox support deterministic bypass.
  - Keeper-specific `data-testid` hooks added for click-audit coverage.
- **CommissionerControlCenterModal:** Added `Run keeper automation` action (`draft-commissioner-keeper-tick`).

---

## 7. Automation vs AI Matrix

| Feature | Automation (rules) | AI (optional) |
|---------|--------------------|----------------|
| Keeper eligibility | ✅ Rule engine (max keepers, round cost, position caps) | — |
| Carryover eligibility | ✅ Enforced when roster carryover names are present | — |
| Keeper deadline lock | ✅ Deterministic deadline lock with commissioner override path | — |
| Round-cost mapping | ✅ KeeperDraftOrder (snake/3RR, traded picks) | — |
| Draft board locks | ✅ Locks applied to board and auto-applied when on clock | — |
| Commissioner override | ✅ Rule engine allows override flag | — |
| Select / remove keeper | ✅ API + UI | — |
| Who to keep | — | Optional (advice) |
| Keeper value explanation | — | Optional (advice) |
| Long-term roster strategy | — | Optional (advice) |
| Keeper risk explanation | — | Optional (advice) |

---

## 8. QA Checklist (Mandatory Click Audit)

- [ ] **Select keeper works:** Add keeper from KeeperPanel (player name, round cost); appears in “My keepers” and on draft board in correct round/slot.
- [ ] **Validate keeper eligibility works:** Try adding over max keepers, duplicate round, duplicate player, over position cap; rule engine returns clear error; no invalid state saved.
- [ ] **Round-cost mapping works:** Keeper at round cost N appears in correct (round, slot) and overall pick number for snake/3RR and with traded picks.
- [ ] **Draft board reflects keeper locks correctly:** Locked slots show player name and “K” badge; no duplicate picks; order matches slot order and trades.
- [ ] **Commissioner override works:** Commissioner can add keeper for any roster; can set override to bypass max keepers / position limits when needed; can remove any team’s keeper.
- [ ] **No dead keeper actions:** Remove keeper removes from list and board; config change (e.g. max keepers) only in pre_draft; after draft start, keeper APIs return appropriate errors.
- [ ] **Keeper lock progression works:** keeper-locked on-clock picks auto-apply deterministically via runtime tick.

---

## 9. Files Touched (Summary)

- **Backend:** `prisma/schema.prisma`, keeper migration, `lib/live-draft-engine/keeper/*`, `DraftSessionService.ts`, `app/api/leagues/[leagueId]/draft/keepers/*`
- **Frontend:** `components/app/draft-room/DraftBoard.tsx`, `DraftBoardCell.tsx`, `DraftRoomShell.tsx`, `DraftRoomPageClient.tsx`, `KeeperPanel.tsx`, `index.ts`
- **Docs:** `docs/PROMPT190_KEEPER_DRAFT_ENGINE_DELIVERABLE.md`
