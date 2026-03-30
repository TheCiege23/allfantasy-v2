# PROMPT 192 — AllFantasy C2C (Campus to Canton) Draft Engine Deliverable

## Overview

C2C draft support for leagues that draft both **college** and **pro** assets. Core logic is **deterministic and sport-aware**; AI is advisory only.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer. C2C pool and validation are implemented for **NFL** (college via DevyPlayer, pro via redraft ADP); other sports can extend with sport-specific college/pro sources.

---

## 1. Schema / Model Updates

- **DraftSession (Prisma):** Added `c2cConfig` (Json): `{ enabled: boolean, collegeRounds: number[] }`.
  - `collegeRounds`: 1-based round numbers that are college-only; all other rounds are pro-only.
- **Migration:** `prisma/migrations/20260323000000_add_c2c_draft_config/migration.sql`.
- **NormalizedDraftEntry:** Added `poolType?: 'college' | 'pro'` for C2C pool distinction.
- **C2CSessionSnapshot (live-draft-engine):** `{ enabled: boolean, collegeRounds: number[] }` on session snapshot.
- **PlayerEntry / DraftPlayerCard:** Added `poolType` for College vs Pro indicators.

---

## 2. Draft Pool and Eligibility

- **GET `/api/leagues/[leagueId]/draft/pool`:**
  - When `c2cConfig.enabled`, merges college pool (DevyPlayer: devyEligible, !graduatedToNFL) with pro pool (redraft ADP).
  - Tags pro entries with `poolType: 'pro'` and college entries with `poolType: 'college'`.
  - Response includes `c2cConfig: { enabled, collegeRounds }`.
- **Pick validation (validateC2CEligibilityAsync):**
  - **College round** (round in collegeRounds): player must be college-eligible (in DevyPlayer, devyEligible, !graduatedToNFL).
  - **Pro round:** player must NOT be college-only (reject if found in DevyPlayer with devyEligible and !graduatedToNFL).
- **PickSubmissionService:** When `c2cConfig.enabled`, runs C2C validation only; when only devy enabled, runs devy validation.
- **Session snapshot:** `buildSessionSnapshot` includes `c2c` when `c2cConfig.enabled`.

---

## 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/leagues/[leagueId]/draft/pool` | GET | Returns merged college + pro pool with `poolType` and `c2cConfig` when C2C enabled. |
| `/api/leagues/[leagueId]/draft/c2c/config` | PATCH | Commissioner: set `enabled`, `collegeRounds` (pre_draft only). |

---

## 4. UI Updates

- **PlayerPanel:**
  - When **C2C** enabled: pool filter **All | College | Pro**; filters by `poolType`.
  - Round hints: **"College round (C2C)"** and **"Pro round (C2C)"** so users know which pool to use.
  - When only **devy** enabled: filter remains All | Pro | Devy (unchanged).
- **PlayerEntry / DraftPlayerCard:**
  - **Pro** badge (cyan) when `poolType === 'pro'`.
  - **College** badge (violet, school/devy label) when `poolType === 'college'` or college/devy.
  - Promoted badge unchanged for graduated players.
- **DraftBoard / DraftBoardCell:**
  - **C2C:** Empty cells in college rounds show **"College"** slot marker (violet).
  - Filled C2C picks render explicit mixed-pool badges:
    - **`C`** for college-side picks
    - **`P`** for pro-side picks
  - When C2C enabled, devy round markers are not shown (college rounds use C2C college indicators).
- **DraftRoomPageClient:** Passes `c2cConfig` and `c2cCollegeRounds` to panel and board; maps `poolType` from pool entries to players.
- **Roster rendering (mixed pools):**
  - In-draft “My roster” now labels picks as **College** or **Pro** when C2C is enabled.
  - Post-draft “My roster” applies the same C2C label distinction.
- **Commissioner controls (in-room):**
  - Added C2C config section in `CommissionerControlCenterModal`:
    - toggle C2C enable/disable
    - comma-separated college rounds mapping
    - save action wired to `PATCH /api/leagues/[leagueId]/draft/c2c/config`
  - Config is pre-draft only and refreshes session + pool after save.

---

## 5. Automation vs AI Notes

| Feature | Automation (deterministic) | AI (optional) |
|---------|----------------------------|----------------|
| Separate college and pro pools | ✅ Merged pool with poolType | — |
| Slot-aware drafting | ✅ College vs pro round validation | — |
| Eligibility (college round / pro round) | ✅ Rule-based validation | — |
| Player card College vs Pro | ✅ Badges and poolType | — |
| Filters College / Pro / All | ✅ UI filter and API poolType | — |
| Board and roster for mixed pools | ✅ Board markers, roster from picks | — |
| Crossover valuation | — | Optional |
| Timeline-to-impact | — | Optional |
| Roster balance advice | — | Optional |
| Stash vs immediate production | — | Optional |

---

## 6. QA Checklist (Mandatory Click Audit)

- [x] **College/pro filters work:** With C2C enabled, "All | College | Pro" filter shows only College or only Pro when selected; "All" shows both.
- [x] **Mixed board renders correctly:** Board shows picks in correct round/slot; empty college rounds show "College" marker; filled picks show C/P badges for mixed pools.
- [x] **Player cards differentiate pool correctly:** College players show College/school badge; pro players show Pro badge; no dead badges.
- [x] **Roster assignment works:** Picks are recorded and appear on board and in "My roster"; college vs pro labels are consistent with C2C round mapping.
- [x] **No dead C2C actions:** College round rejects pro-only player with clear error; pro round rejects college-only player with clear error; filters and round hints only appear when C2C enabled.

---

## 7. Files Touched (Summary)

- **Schema:** `prisma/schema.prisma` (c2cConfig), `prisma/migrations/20260323000000_add_c2c_draft_config/migration.sql`
- **Types:** `lib/draft-sports-models/types.ts`, `lib/draft-sports-models/normalize-draft-player.ts`, `lib/live-draft-engine/types.ts`
- **Backend:** `lib/live-draft-engine/DraftSessionService.ts`, `lib/live-draft-engine/PickValidation.ts`, `lib/live-draft-engine/PickSubmissionService.ts`, `app/api/leagues/[leagueId]/draft/pool/route.ts`, `app/api/leagues/[leagueId]/draft/c2c/config/route.ts`
- **Frontend:** `components/app/draft-room/PlayerPanel.tsx`, `components/app/draft-room/DraftPlayerCard.tsx`, `components/app/draft-room/DraftBoard.tsx`, `components/app/draft-room/DraftBoardCell.tsx`, `components/app/draft-room/DraftRoomPageClient.tsx`
- **Frontend (commissioner):** `components/app/draft-room/CommissionerControlCenterModal.tsx`
- **Post-draft roster rendering:** `components/app/draft-room/PostDraftView.tsx`
- **E2E click audit:** `e2e/c2c-draft-room-click-audit.spec.ts`
- **Docs:** `docs/PROMPT192_C2C_DRAFT_ENGINE_DELIVERABLE.md`
