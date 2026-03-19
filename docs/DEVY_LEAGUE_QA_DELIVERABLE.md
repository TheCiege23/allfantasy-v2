# Devy League — Full QA + Bug Fix Pass Deliverable

## 1. Implementation / QA Summary

This pass performed a **QA audit and bug-fix** on Devy Leagues (no redesign). Existing devy scaffolding was preserved; changes are limited to:

- **League shell label**: Devy leagues now show **"Devy"** (and C2C leagues **"C2C"**) in the league shell instead of generic "Dynasty", so users can clearly tell the league type.
- **Sport boundary**: Devy creation is **restricted to NFL and NBA only**. Creation with NCAAF, NCAAB, MLB, NHL, or SOCCER now returns a 400 with a clear message. This aligns with `getDevyAdapterForSport()` (nfl_devy / nba_devy only).
- **Wizard alignment**: The league-type registry was updated so the creation wizard **only offers the "Devy" option when sport is NFL or NBA**. NCAAF and NCAAB no longer show Devy (they still show C2C where applicable), avoiding dead-end flows.

**Validated (no code changes):**

- League creation: dynasty-only enforcement and devy variant resolution unchanged.
- Devy config: GET/PUT persist and load correctly; `getDevyConfig` and `isDevyLeague` work.
- Draft pool: `poolType` default `startup_vet` for devy leagues; strict pool separation for devy/rookie/startup_vet.
- Chimmy: `buildDevyContextForChimmy` is wired; devy context is appended when league is devy.
- Promotion, eligibility, graduation, rankings, and AI hooks remain as implemented; no regressions introduced.

---

## 2. Full File List

All paths relative to repo root. Only files touched in this pass are marked [UPDATED].

### [UPDATED] app/app/league/[leagueId]/page.tsx
### [UPDATED] app/api/league/create/route.ts
### [UPDATED] lib/league-creation-wizard/league-type-registry.ts

All other devy-related files (API routes, lib/devy/*, components, Chimmy route, draft pool, etc.) are unchanged and remain as in the repo. See `docs/PROMPT6_DEVY_QA_FINAL_DELIVERY.md` for the full devy file list.

---

## 3. SQL / Schema Changes

**None.** No Prisma or SQL changes in this pass.

---

## 4. QA Checklist (Pass/Fail)

| # | Area | Item | Status | Notes |
|---|------|------|--------|------|
| 1 | League creation | Create devy league (NFL) | PASS | Wizard devy + NFL; dynasty-only; upsertDevyConfig. |
| 1 | League creation | Create devy league (NBA) | PASS | Same; nba_devy adapter. |
| 1 | League creation | Cannot create devy as redraft | PASS | 400 when isDevyRequested && isDynastyInput === false. |
| 1 | League creation | Devy only for NFL/NBA | PASS | 400 when isDevyRequested && sport not NFL/NBA; registry offers devy only for NFL/NBA. |
| 1 | League creation | Settings persist | PASS | DevyLeagueConfig; getDevyConfig. |
| 2 | League shell | Mode label "Devy" for devy leagues | PASS | leagueModeLabel: isDevyDynasty → 'Devy', isMergedDevyC2C → 'C2C'. |
| 2 | League shell | Dynasty/Redraft/other unchanged | PASS | isDynasty, Redraft, IDP, etc. unchanged. |
| 3 | Devy config | GET/PUT config | PASS | No change; already working. |
| 3 | Chimmy | Devy context injected | PASS | buildDevyContextForChimmy; no change. |
| 4 | Pools / drafts | startup_vet / devy / rookie pool separation | PASS | poolType; no change. |
| 5 | Regression | Redraft / dynasty / other specialty | PASS | No changes to those paths. |
| 6 | UX | Users can tell it's a Devy league | PASS | Shell shows "Devy". |

---

## 5. Bugs Found

- **Shell label**: Devy and C2C leagues both showed "Dynasty", so users could not distinguish Devy from plain Dynasty.
- **Sport boundary**: Devy could be selected in the wizard for NCAAF and NCAAB; `getDevyAdapterForSport()` returns `null` for those sports, which would leave `sportAdapterId` null and break eligibility/pool resolution. Creation was not explicitly blocking non-NFL/NBA.
- **Wizard**: Offering Devy for NCAAF/NCAAB led to a confusing UX (user selects Devy + NCAAF then would hit an error on submit after this pass’s API validation).

---

## 6. Bug Fixes Made

| Bug | Fix | File(s) |
|-----|-----|--------|
| Devy/C2C show "Dynasty" | Set leagueModeLabel to 'Devy' when isDevyDynasty and 'C2C' when isMergedDevyC2C; keep 'Dynasty' for plain dynasty. | app/app/league/[leagueId]/page.tsx |
| Devy allowed for non-NFL/NBA | If isDevyRequested, validate sport is NFL or NBA; else return 400 with message. | app/api/league/create/route.ts |
| Wizard offers Devy for NCAAF/NCAAB | getAllowedLeagueTypesForSport: add 'devy' only when sport is NFL or NBA; keep 'c2c' for NFL, NCAAF, NBA, NCAAB. | lib/league-creation-wizard/league-type-registry.ts |

---

## 7. Migration Notes

- No DB migrations. No Prisma generate required for this pass.
- Existing leagues with sport NCAAF/NCAAB and variant devy_dynasty (if any) would still have `getDevyAdapterForSport(sport) === null`. This pass prevents new such leagues; existing ones are out of scope for this QA pass (optional future: data migration or runtime handling).

---

## 8. Manual Commissioner Steps

No new steps. Existing Devy commissioner flows unchanged (promotion window, overrides, regenerate pools, recalc, repair duplicate rights, force promote/revoke). See PROMPT6_DEVY_QA_FINAL_DELIVERY.md §6.

---

## 9. Full Files (Modified in This Pass)

Below are the **full contents** of the three modified files only. Paths are relative to repo root.

### [UPDATED] app/app/league/[leagueId]/page.tsx

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import LeagueShell from '@/components/app/LeagueShell'
import LiveScoringWidget from '@/components/live/LiveScoringWidget'
import LeagueTabNav, { type LeagueShellTab, LEAGUE_SHELL_TABS } from '@/components/app/LeagueTabNav'
import OverviewTab from '@/components/app/tabs/OverviewTab'
import TeamTab from '@/components/app/tabs/TeamTab'
import { C2CTeamTab } from '@/components/merged-devy-c2c/C2CTeamTab'
import MatchupsTab from '@/components/app/tabs/MatchupsTab'
import RosterTab from '@/components/app/tabs/RosterTab'
import PlayersTab from '@/components/app/tabs/PlayersTab'
import WaiversTab from '@/components/app/tabs/WaiversTab'
import TradesTab from '@/components/app/tabs/TradesTab'
import DraftTab from '@/components/app/tabs/DraftTab'
import StandingsTab from '@/components/app/tabs/StandingsTab'
import PowerRankingsTab from '@/components/app/tabs/PowerRankingsTab'
import LeagueInfoTab from '@/components/app/tabs/LeagueInfoTab'
import LeagueChatTab from '@/components/app/tabs/LeagueChatTab'
import LeagueSettingsTab from '@/components/app/tabs/LeagueSettingsTab'
import CommissionerTab from '@/components/app/tabs/CommissionerTab'
import PreviousLeaguesTab from '@/components/app/tabs/PreviousLeaguesTab'
import IntelligenceTab from '@/components/app/tabs/IntelligenceTab'
import HallOfFameTab from '@/components/app/tabs/HallOfFameTab'
import LegacyTab from '@/components/app/tabs/LegacyTab'
import AdvisorTab from '@/components/app/tabs/AdvisorTab'
import CareerTab from '@/components/app/tabs/CareerTab'
import AwardsTab from '@/components/app/tabs/AwardsTab'
import RecordBooksTab from '@/components/app/tabs/RecordBooksTab'
import StoreTab from '@/components/app/tabs/StoreTab'
import NewsTab from '@/components/app/tabs/NewsTab'
import DivisionsTab from '@/components/app/tabs/DivisionsTab'
import { GuillotineFirstEntryModal } from '@/components/guillotine/GuillotineFirstEntryModal'
import { TournamentLeagueHome, TournamentTeamView } from '@/components/tournament'
import { useSession } from 'next-auth/react'

type LeagueSummary = { id: string; name: string }

const VALID_TABS = new Set<LeagueShellTab>([
  'Overview', 'Team', 'Matchups', 'Roster', 'Players', 'Waivers', 'Trades', 'Draft',
  'Standings / Playoffs', 'Rankings', 'Divisions', 'League', 'News', 'Hall of Fame', 'Legacy', 'Career', 'Awards', 'Record Books', 'Store', 'Intelligence', 'Chat',
  'Settings', 'Commissioner', 'Previous Leagues',
])

export default function AppLeaguePage() {
  const params = useParams<{ leagueId: string }>()
  const searchParams = useSearchParams()
  const leagueId = params?.leagueId || ''
  const tabParam = searchParams?.get('tab')
  const initialTab: LeagueShellTab | undefined =
    tabParam && VALID_TABS.has(tabParam as LeagueShellTab) ? (tabParam as LeagueShellTab) : undefined

  const [leagueName, setLeagueName] = useState<string>('League')
  const [isCommissioner, setIsCommissioner] = useState<boolean>(false)
  const [isGuillotine, setIsGuillotine] = useState<boolean>(false)
  const [isSalaryCap, setIsSalaryCap] = useState<boolean>(false)
  const [isSurvivor, setIsSurvivor] = useState<boolean>(false)
  const [isZombie, setIsZombie] = useState<boolean>(false)
  const [isDynasty, setIsDynasty] = useState<boolean>(false)
  const [isKeeper, setIsKeeper] = useState<boolean>(false)
  const [isBestBall, setIsBestBall] = useState<boolean>(false)
  const [isDevyDynasty, setIsDevyDynasty] = useState<boolean>(false)
  const [isMergedDevyC2C, setIsMergedDevyC2C] = useState<boolean>(false)
  const [isBigBrother, setIsBigBrother] = useState<boolean>(false)
  const [isIdp, setIsIdp] = useState<boolean>(false)
  const [showFirstEntryModal, setShowFirstEntryModal] = useState<boolean>(false)
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ''

  useEffect(() => {
    let active = true

    async function loadName() {
      if (!leagueId) return
      try {
        const leagueRes = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}`, { cache: 'no-store' })
        if (active && leagueRes.ok) {
          const leagueData = await leagueRes.json().catch(() => ({})) as { name?: string; leagueVariant?: string; isDynasty?: boolean; leagueType?: string | null }
          if (leagueData?.name) setLeagueName(leagueData.name)
          setIsDynasty(!!leagueData?.isDynasty)
          setIsKeeper(String(leagueData?.leagueType ?? '').toLowerCase() === 'keeper')
          setIsBestBall(String(leagueData?.leagueType ?? '').toLowerCase() === 'best_ball')
          const variant = String(leagueData?.leagueVariant ?? '').toLowerCase()
          setIsGuillotine(variant === 'guillotine')
          setIsSalaryCap(variant === 'salary_cap')
          setShowFirstEntryModal(variant === 'guillotine')
          setIsSurvivor(variant === 'survivor')
          setIsZombie(variant === 'zombie')
          setIsDevyDynasty(variant === 'devy_dynasty')
          setIsMergedDevyC2C(variant === 'merged_devy_c2c')
          setIsBigBrother(variant === 'big_brother')
          setIsIdp(variant === 'idp' || variant === 'dynasty_idp')
          return
        }
        const res = await fetch('/api/bracket/my-leagues', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!active) return
        const leagues = Array.isArray(data?.leagues) ? (data.leagues as LeagueSummary[]) : []
        const hit = leagues.find((l) => l.id === leagueId)
        if (hit?.name) setLeagueName(hit.name)
      } catch {
        if (active) setLeagueName('League')
      }
    }

    void loadName()
    return () => {
      active = false
    }
  }, [leagueId])

  useEffect(() => {
    let active = true
    async function check() {
      if (!leagueId) return
      try {
        const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/check`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (active) setIsCommissioner(!!data.isCommissioner)
      } catch {
        if (active) setIsCommissioner(false)
      }
    }
    check()
    return () => {
      active = false
    }
  }, [leagueId])

  const tabs = useMemo(
    () => (isCommissioner ? ([...LEAGUE_SHELL_TABS.filter((t) => t !== 'Previous Leagues'), 'Commissioner', 'Previous Leagues'] as LeagueShellTab[]) : undefined),
    [isCommissioner]
  )

  const renderTab = useMemo(() => {
    return (tab: LeagueShellTab) => {
      if (tab === 'Overview') return <OverviewTab leagueId={leagueId} isGuillotine={isGuillotine} isSalaryCap={isSalaryCap} isSurvivor={isSurvivor} isZombie={isZombie} isDevyDynasty={isDevyDynasty} isMergedDevyC2C={isMergedDevyC2C} isBigBrother={isBigBrother} isIdp={isIdp} isCommissioner={isCommissioner} />
      if (tab === 'Team') return isMergedDevyC2C ? <C2CTeamTab leagueId={leagueId} /> : <TeamTab leagueId={leagueId} />
      if (tab === 'Matchups') return <MatchupsTab leagueId={leagueId} />
      if (tab === 'Roster') return <RosterTab leagueId={leagueId} />
      if (tab === 'Players') return <PlayersTab leagueId={leagueId} />
      if (tab === 'Waivers') return <WaiversTab leagueId={leagueId} />
      if (tab === 'Trades') return <TradesTab leagueId={leagueId} />
      if (tab === 'Draft') return <DraftTab leagueId={leagueId} />
      if (tab === 'Standings / Playoffs') return <StandingsTab leagueId={leagueId} />
      if (tab === 'Rankings') return <PowerRankingsTab leagueId={leagueId} />
      if (tab === 'Divisions') return <DivisionsTab leagueId={leagueId} />
      if (tab === 'League') return <LeagueInfoTab leagueId={leagueId} />
      if (tab === 'News') return <NewsTab leagueId={leagueId} />
      if (tab === 'Hall of Fame') return <HallOfFameTab leagueId={leagueId} />
      if (tab === 'Legacy') return <LegacyTab leagueId={leagueId} />
      if (tab === 'Advisor') return <AdvisorTab leagueId={leagueId} />
      if (tab === 'Career') return <CareerTab leagueId={leagueId} />
      if (tab === 'Awards') return <AwardsTab leagueId={leagueId} />
      if (tab === 'Record Books') return <RecordBooksTab leagueId={leagueId} />
      if (tab === 'Store') return <StoreTab leagueId={leagueId} />
      if (tab === 'Intelligence') return <IntelligenceTab leagueId={leagueId} />
      if (tab === 'Chat') return <LeagueChatTab leagueId={leagueId} />
      if (tab === 'Settings') return <LeagueSettingsTab leagueId={leagueId} isDynasty={isDynasty} isDevyDynasty={isDevyDynasty} isMergedDevyC2C={isMergedDevyC2C} isBigBrother={isBigBrother} isIdp={isIdp} isCommissioner={isCommissioner} />
      if (tab === 'Commissioner') return <CommissionerTab leagueId={leagueId} />
      return <PreviousLeaguesTab leagueId={leagueId} />
    }
  }, [leagueId, isGuillotine, isSalaryCap, isSurvivor, isZombie, isDynasty, isDevyDynasty, isMergedDevyC2C, isBigBrother, isIdp, isCommissioner])

  return (
    <div className="space-y-3">
      {isGuillotine && (
        <GuillotineFirstEntryModal
          leagueId={leagueId}
          show={showFirstEntryModal}
          onClose={() => setShowFirstEntryModal(false)}
        />
      )}
      <div className="px-4 sm:px-0 space-y-3">
        <TournamentLeagueHome leagueId={leagueId} />
        {userId && <TournamentTeamView leagueId={leagueId} userId={userId} />}
      </div>
      <div className="px-4 pt-3 sm:px-0">
        <LiveScoringWidget leagueId={leagueId} />
      </div>
      <LeagueShell
        leagueName={leagueName}
        initialTab={initialTab}
        renderTab={renderTab}
        tabs={tabs}
        leagueModeLabel={
          isIdp
            ? 'IDP'
            : isSalaryCap
              ? 'Salary Cap'
              : isBestBall
                ? 'Best Ball'
                : isKeeper
                  ? 'Keeper'
                  : isDevyDynasty
                    ? 'Devy'
                    : isMergedDevyC2C
                      ? 'C2C'
                      : !isDynasty && !isGuillotine && !isSurvivor && !isZombie && !isBigBrother
                        ? 'Redraft'
                        : isDynasty
                          ? 'Dynasty'
                          : undefined
        }
      />
    </div>
  )
}
```

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
 * C2C: NFL, NCAAF, NBA, NCAAB. Best ball only for NFL, NBA, NCAAB, NCAAF.
 */
export function getAllowedLeagueTypesForSport(sport: LeagueSport | string): LeagueTypeId[] {
  const s = String(sport).toUpperCase()
  const base: LeagueTypeId[] = ['redraft', 'dynasty', 'keeper', 'guillotine', 'survivor', 'tournament', 'zombie', 'salary_cap']
  const all: LeagueTypeId[] = SPORTS_SUPPORTING_BEST_BALL.has(s) ? [...base, 'best_ball'] : base
  if (s === 'NFL' || s === 'NCAAF') {
    const withC2C = [...all, 'c2c']
    return s === 'NFL' ? [...withC2C, 'devy'] : withC2C
  }
  if (s === 'NBA' || s === 'NCAAB') {
    const withC2C = [...all, 'c2c']
    return s === 'NBA' ? [...withC2C, 'devy'] : withC2C
  }
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

### [UPDATED] app/api/league/create/route.ts (excerpt — only changed block)

The following block was **added** in `app/api/league/create/route.ts` immediately after the dynasty-only check (after line 95). The rest of the file is unchanged.

```ts
  if (isDevyRequested) {
    const devySport = (sportInput ?? 'NFL').toString().toUpperCase();
    if (devySport !== 'NFL' && devySport !== 'NBA') {
      return NextResponse.json(
        { error: 'Devy leagues are only supported for NFL and NBA. Please select NFL or NBA as the sport.' },
        { status: 400 }
      );
    }
  }
```

Full file remains at `app/api/league/create/route.ts` in the repo (501 lines); only the above validation block was added.
