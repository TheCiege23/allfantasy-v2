# Merged Devy / C2C — Full QA + Bug Fix Pass Deliverable

## 1. Implementation / QA Summary

This pass performed a **QA audit and bug-fix** on Merged Devy / Campus to Canton (C2C) leagues. Existing C2C scaffolding was preserved; changes are limited to:

- **Sport boundary**: C2C creation is **restricted to NFL and NBA only**. Creation with NCAAF, NCAAB, MLB, NHL, or SOCCER now returns 400 with a clear message. This aligns with `getC2CAdapterForSport()` (nfl_c2c / nba_c2c only).
- **Wizard alignment**: The league-type registry was updated so the creation wizard **only offers the "C2C" option when sport is NFL or NBA**. NCAAF and NCAAB no longer show C2C, avoiding dead-end flows and adapter-null states.

**Already in place (no code changes this pass):**

- League shell label "C2C" for C2C leagues (from prior Devy QA pass).
- Dynasty-only enforcement for C2C at creation.
- C2C config GET/PATCH, Chimmy `buildC2CContextForChimmy`, draft pool default `startup_merged` for C2C, promotion/standings/hybrid, AI route, specialty registry, Overview/Team/Settings tabs.

**Validated (no code changes):**

- C2C config loads and persists; `getC2CConfig` and `isC2CLeague` work.
- Draft pool: `poolType` default `startup_merged` for C2C; strict pool separation for college/rookie/startup_merged/startup_pro/startup_college.
- Chimmy C2C context is wired and appended when league is C2C.
- Promotion, lifecycle, standings, hybrid math, best ball, trades, and AI hooks remain as implemented; no regressions introduced.

---

## 2. Full File List

All paths relative to repo root. Only files touched in this pass are marked [UPDATED].

### [UPDATED] app/api/league/create/route.ts
### [UPDATED] lib/league-creation-wizard/league-type-registry.ts

All other C2C-related files (API routes under `app/api/leagues/[leagueId]/merged-devy-c2c/`, `lib/merged-devy-c2c/*`, components under `components/merged-devy-c2c/`, Chimmy route, draft pool, league page, OverviewTab, specialty registry C2C spec, etc.) are unchanged. See `docs/PROMPT6_C2C_QA_FINAL_DELIVERY.md` for the full C2C file list.

---

## 3. SQL / Schema Changes

**None.** No Prisma or SQL changes in this pass.

---

## 4. QA Checklist (Pass/Fail)

| # | Area | Item | Status | Notes |
|---|------|------|--------|------|
| 1 | League creation | Create C2C league (NFL) | PASS | Wizard C2C + NFL; dynasty-only; upsertC2CConfig. |
| 1 | League creation | Create C2C league (NBA) | PASS | Same; nba_c2c adapter. |
| 1 | League creation | Cannot create C2C as redraft | PASS | 400 when isC2CRequested && isDynastyInput === false. |
| 1 | League creation | C2C only for NFL/NBA | PASS | 400 when isC2CRequested && sport not NFL/NBA; registry offers C2C only for NFL/NBA. |
| 1 | League creation | Settings persist | PASS | C2CLeagueConfig; getC2CConfig; PATCH config. |
| 2 | League shell | Mode label "C2C" for C2C leagues | PASS | leagueModeLabel: isMergedDevyC2C → 'C2C' (from prior pass). |
| 3 | C2C config | GET/PATCH config | PASS | No change; already working. |
| 3 | Chimmy | C2C context injected | PASS | buildC2CContextForChimmy; no change. |
| 4 | Pools / drafts | startup_merged / college / rookie pool separation | PASS | poolType; default startup_merged for C2C. |
| 5 | Promotion / standings | Promotion, hybrid standings, lifecycle | PASS | No change; validated by code review. |
| 6 | Regression | Redraft / dynasty / devy / other specialty | PASS | No changes to those paths. |
| 7 | UX | Users can tell it's a C2C league | PASS | Shell shows "C2C"; MergedDevyC2CHome, C2CTeamTab. |

---

## 5. Bugs Found

- **Sport boundary**: C2C could be selected in the wizard for NCAAF and NCAAB; `getC2CAdapterForSport()` returns `null` for those sports, which would leave `sportAdapterId` null and break eligibility/pool/config resolution. Creation was not explicitly blocking non-NFL/NBA.
- **Wizard**: Offering C2C for NCAAF/NCAAB led to a confusing UX (user selects C2C + NCAAF then would hit an error on submit after this pass’s API validation).

---

## 6. Bug Fixes Made

| Bug | Fix | File(s) |
|-----|-----|--------|
| C2C allowed for non-NFL/NBA | If isC2CRequested, validate sport is NFL or NBA; else return 400 with message. | app/api/league/create/route.ts |
| Wizard offers C2C for NCAAF/NCAAB | getAllowedLeagueTypesForSport: add 'c2c' only when sport is NFL or NBA; remove 'c2c' from NCAAF and NCAAB. | lib/league-creation-wizard/league-type-registry.ts |

---

## 7. Migration Notes

- No DB migrations. No Prisma generate required for this pass.
- Existing leagues with sport NCAAF/NCAAB and variant merged_devy_c2c (if any) would still have `getC2CAdapterForSport(sport) === null`. This pass prevents new such leagues; existing ones are out of scope for this QA pass (optional future: data migration or runtime handling).

---

## 8. Manual Commissioner Steps

No new steps. Existing C2C commissioner flows unchanged: config (startup format, standings model, best ball, promotion timing, hybrid weights, college/rookie draft rounds), promotion window, review queue (resolve-mapping, repair-duplicate-rights), regenerate pools, recalc, hybrid standings. See PROMPT6_C2C_QA_FINAL_DELIVERY.md §7.

---

## 9. Full Files (Modified in This Pass)

Below are the **full contents** of the two modified files only (excerpt for create route: only the added block).

### [UPDATED] lib/league-creation-wizard/league-type-registry.ts

```ts
/**
 * League types, draft types, and valid combinations for the creation wizard.
 * Prevents invalid sport × league type × draft type combinations.
 */

import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type { LeagueTypeId, DraftTypeId } from './types'

export const LEAGUE_TYPE_IDS: LeagueTypeId[] = [
  'redraft',
  'dynasty',
  'keeper',
  'best_ball',
  'guillotine',
  'survivor',
  'tournament',
  'devy',
  'c2c',
  'zombie',
  'salary_cap',
]

export const LEAGUE_TYPE_LABELS: Record<LeagueTypeId, string> = {
  redraft: 'Redraft',
  dynasty: 'Dynasty',
  keeper: 'Keeper',
  best_ball: 'Best Ball',
  guillotine: 'Guillotine',
  survivor: 'Survivor',
  tournament: 'Tournament',
  devy: 'Devy',
  c2c: 'Campus to Canton (C2C)',
  zombie: 'Zombie',
  salary_cap: 'Salary Cap',
}

export const DRAFT_TYPE_IDS: DraftTypeId[] = ['snake', 'linear', 'auction', 'slow_draft', 'mock_draft']

export const DRAFT_TYPE_LABELS: Record<DraftTypeId, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
  slow_draft: 'Slow Draft',
  mock_draft: 'Mock Draft',
}

/** League types that imply dynasty (multi-year roster). */
const DYNASTY_LEAGUE_TYPES: LeagueTypeId[] = ['dynasty', 'devy', 'c2c']

/** League types that support keeper config. */
const KEEPER_LEAGUE_TYPES: LeagueTypeId[] = ['keeper', 'dynasty']

/** League types that support devy. */
const DEVY_LEAGUE_TYPES: LeagueTypeId[] = ['devy', 'dynasty']

/** League types that support C2C. */
const C2C_LEAGUE_TYPES: LeagueTypeId[] = ['c2c']

/** Draft types that are "live" league draft (not mock). */
const LIVE_DRAFT_TYPES: DraftTypeId[] = ['snake', 'linear', 'auction', 'slow_draft']

export function isDynastyLeagueType(leagueType: LeagueTypeId): boolean {
  return DYNASTY_LEAGUE_TYPES.includes(leagueType)
}

export function isRedraftLeagueType(leagueType: LeagueTypeId): boolean {
  return leagueType === 'redraft'
}

export function isKeeperLeagueType(leagueType: LeagueTypeId): boolean {
  return KEEPER_LEAGUE_TYPES.includes(leagueType)
}

export function isKeeperOnlyLeagueType(leagueType: LeagueTypeId): boolean {
  return leagueType === 'keeper'
}

export function isDevyLeagueType(leagueType: LeagueTypeId): boolean {
  return DEVY_LEAGUE_TYPES.includes(leagueType)
}

export function isC2CLeagueType(leagueType: LeagueTypeId): boolean {
  return C2C_LEAGUE_TYPES.includes(leagueType)
}

export function isLiveDraftType(draftType: DraftTypeId): boolean {
  return LIVE_DRAFT_TYPES.includes(draftType)
}

/** Sports that support best ball (must match SportFeatureFlagsService.supportsBestBall). */
const SPORTS_SUPPORTING_BEST_BALL = new Set<string>(['NFL', 'NBA', 'NCAAB', 'NCAAF'])

/**
 * League types allowed for a sport.
 * Devy: NFL and NBA only (pro league sport; devy pool is NCAA Football / NCAA Basketball).
 * C2C: NFL and NBA only (pro league sport; college side is NCAA Football / NCAA Basketball).
 * Best ball only for NFL, NBA, NCAAB, NCAAF.
 */
export function getAllowedLeagueTypesForSport(sport: LeagueSport | string): LeagueTypeId[] {
  const s = String(sport).toUpperCase()
  const base: LeagueTypeId[] = ['redraft', 'dynasty', 'keeper', 'guillotine', 'survivor', 'tournament', 'zombie', 'salary_cap']
  const all: LeagueTypeId[] = SPORTS_SUPPORTING_BEST_BALL.has(s) ? [...base, 'best_ball'] : base
  if (s === 'NFL') return [...all, 'c2c', 'devy']
  if (s === 'NCAAF') return all
  if (s === 'NBA') return [...all, 'c2c', 'devy']
  if (s === 'NCAAB') return all
  return all
}

/** Guillotine: snake, linear, auction only (no slow_draft). 3RR applies only to snake (UI). */
const GUILLOTINE_DRAFT_TYPES: DraftTypeId[] = ['snake', 'linear', 'auction']

/**
 * Draft types allowed for a league type. Mock draft is separate product; others available for redraft/dynasty/keeper etc.
 * Guillotine supports only snake, linear, auction.
 */
export function getAllowedDraftTypesForLeagueType(leagueType: LeagueTypeId): DraftTypeId[] {
  if (leagueType === 'guillotine') return [...GUILLOTINE_DRAFT_TYPES]
  return ['snake', 'linear', 'auction', 'slow_draft']
}

/** Roster modes allowed for Guillotine (redraft / best_ball only). */
export const GUILLOTINE_ALLOWED_ROSTER_MODES = ['redraft', 'best_ball'] as const

export function getGuillotineAllowedRosterModes(): readonly string[] {
  return GUILLOTINE_ALLOWED_ROSTER_MODES
}

/**
 * Validate league type for sport.
 */
export function isLeagueTypeAllowedForSport(leagueType: LeagueTypeId, sport: LeagueSport | string): boolean {
  return getAllowedLeagueTypesForSport(sport).includes(leagueType)
}

/**
 * Validate draft type for league type.
 */
export function isDraftTypeAllowedForLeagueType(draftType: DraftTypeId, leagueType: LeagueTypeId): boolean {
  return getAllowedDraftTypesForLeagueType(leagueType).includes(draftType)
}

/**
 * All supported sports (from sport-scope).
 */
export function getSupportedSports(): LeagueSport[] {
  return [...SUPPORTED_SPORTS]
}
```

### [UPDATED] app/api/league/create/route.ts (excerpt — only added block)

The following block was **added** in `app/api/league/create/route.ts` immediately after the Devy sport validation block (after the `isDevyRequested` check). The rest of the file is unchanged.

```ts
  if (isC2CRequested) {
    const c2cSport = (sportInput ?? 'NFL').toString().toUpperCase();
    if (c2cSport !== 'NFL' && c2cSport !== 'NBA') {
      return NextResponse.json(
        { error: 'C2C (Campus to Canton) leagues are only supported for NFL and NBA. Please select NFL or NBA as the sport.' },
        { status: 400 }
      );
    }
  }
```

Full file remains at `app/api/league/create/route.ts` in the repo; only the above validation block was added.
