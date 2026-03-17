# PROMPT 191 — AllFantasy Devy Draft Engine Deliverable

## Overview

Devy draft support for leagues drafting future college/developmental players. **Core mechanics are deterministic**; AI is optional for scouting-style explanation and strategy.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (per `lib/sport-scope.ts`). Devy player pool is implemented for **NFL** (college/devy via `DevyPlayer`); other sports can extend with sport-specific devy data.

---

## 1. Data Model Changes

- **DraftSession (Prisma):** Added `devyConfig` (Json): `{ enabled: boolean, devyRounds: number[] }`.
  - `devyRounds`: 1-based round numbers that are devy-only (e.g. `[14, 15]`). In those rounds only devy-eligible (college) players can be selected.
- **Migration:** `prisma/migrations/20260322000000_add_devy_draft_config/migration.sql`.
- **NormalizedDraftEntry / types:** Added `isDevy`, `school`, `draftEligibleYear`, `graduatedToNFL` for pool and UI.
- **DevySessionSnapshot (live-draft-engine):** `{ enabled: boolean, devyRounds: number[] }` on session snapshot.
- **Existing DevyPlayer model** is used for devy pool and eligibility checks (`devyEligible`, `graduatedToNFL`, `school`, etc.).

---

## 2. Draft Logic Updates

- **Draft pool API (`GET /api/leagues/[leagueId]/draft/pool`):**
  - When session `devyConfig.enabled` and sport is NFL, merges **DevyPlayer** (devyEligible, !graduatedToNFL) into the pro pool.
  - Dedupes by normalized name (pro names take precedence; devy entries added only when name not in pro list).
  - Returns `devyConfig: { enabled, devyRounds }` in response for client filters.
- **Pick submission (PickSubmissionService):**
  - After standard validation, runs **validateDevyEligibilityAsync**: when current round is in `devyRounds`, player must exist in `DevyPlayer` with `devyEligible: true` and `graduatedToNFL: false` (match by normalized name or case-insensitive name).
  - Rejects with clear error: "This round is devy-only. Select a devy-eligible (college) player."
- **Session snapshot (DraftSessionService):** Includes `devy` when `devyConfig.enabled` so client can show devy rounds and filters.

---

## 3. UI Changes

- **PlayerPanel:**
  - **Devy pool filter:** When `devyConfig.enabled`, adds dropdown "All | Pro | Devy". Filters list to pro-only or devy-only.
  - **Devy round hint:** When current round is a devy round, shows banner: "Devy round — select a college/devy-eligible player."
  - Search includes **school** in addition to name/team.
  - Passes `isDevy`, `school`, `graduatedToNFL` into player cards.
- **PlayerEntry / DraftPlayerCard:**
  - **Devy badge:** Devy players show a violet "Devy" or school-name badge; row has left border tint.
  - **Promotion marker:** When `graduatedToNFL`, shows "Promoted" (emerald) badge.
  - Cards use fallback display (school/team, ADP) when devy data is thinner than pro.
- **DraftBoard / DraftBoardCell:**
  - Optional **devy slot marker:** Empty cells in devy rounds show a small "Devy" badge so users see which slots are devy-only.
- **DraftRoomPageClient:** Passes `devyConfig` and `currentRound` to PlayerPanel; passes `devyRounds` to DraftBoard for slot markers.
- **Commissioner:** PATCH ` /api/leagues/[leagueId]/draft/devy/config` (body: `enabled`, `devyRounds`) to set devy config in pre_draft. No UI in CommissionerControlCenterModal in this deliverable; commissioner can use API or future settings panel.

---

## 4. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/leagues/[leagueId]/draft/pool` | GET | Returns merged pro + devy pool when devy enabled; response includes `devyConfig`. |
| `/api/leagues/[leagueId]/draft/devy/config` | PATCH | Commissioner: set `enabled`, `devyRounds` (pre_draft only). |

---

## 5. Automation vs AI Notes

| Feature | Automation (deterministic) | AI (optional) |
|---------|----------------------------|----------------|
| Devy player pool merge | ✅ Pool API merges DevyPlayer with pro pool | — |
| Devy eligibility enforcement | ✅ Pick validation (DevyPlayer lookup) | — |
| Devy round / slot display | ✅ Config-driven; board and filters | — |
| Player cards (devy badge, school, promoted) | ✅ Rules-based display | — |
| Fallback when devy data thin | ✅ Pro pool always present; devy additive | — |
| Devy scouting notes | — | Optional |
| Long-term upside/risk | — | Optional |
| Stash advice | — | Optional |
| Timeline explanation | — | Optional |

---

## 6. QA Checklist (Mandatory Click Audit)

- [ ] **Devy filters work:** With devy enabled, "All | Pro | Devy" filter shows only Pro or only Devy when selected; "All" shows both.
- [ ] **Devy player cards render correctly:** Devy players show violet devy/school badge; promoted players show "Promoted" badge; school/team and ADP display.
- [ ] **Devy slot drafting works:** In a devy round, selecting a pro-only player is rejected with clear error; selecting a devy-eligible player succeeds.
- [ ] **Promotion markers display correctly:** Players with `graduatedToNFL` show "Promoted" on cards where applicable.
- [ ] **No dead devy toggles or filters:** Pool filter and devy round banner only appear when `devyConfig.enabled`; toggles respond correctly; empty devy round cells show "Devy" badge.

---

## 7. Files Touched (Summary)

- **Schema:** `prisma/schema.prisma` (devyConfig), `prisma/migrations/20260322000000_add_devy_draft_config/migration.sql`
- **Types:** `lib/draft-sports-models/types.ts`, `lib/draft-sports-models/normalize-draft-player.ts`, `lib/live-draft-engine/types.ts`
- **Backend:** `lib/live-draft-engine/DraftSessionService.ts`, `lib/live-draft-engine/PickValidation.ts`, `lib/live-draft-engine/PickSubmissionService.ts`, `app/api/leagues/[leagueId]/draft/pool/route.ts`, `app/api/leagues/[leagueId]/draft/devy/config/route.ts`
- **Frontend:** `components/app/draft-room/PlayerPanel.tsx`, `components/app/draft-room/DraftPlayerCard.tsx`, `components/app/draft-room/DraftBoard.tsx`, `components/app/draft-room/DraftBoardCell.tsx`, `components/app/draft-room/DraftRoomPageClient.tsx`
- **Docs:** `docs/PROMPT191_DEVY_DRAFT_ENGINE_DELIVERABLE.md`
