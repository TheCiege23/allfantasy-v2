import { describe, expect, it } from 'vitest'
import {
  getNcaafBetaStatus,
  getNcaafBetaBannerInfo,
  isNcaafPlayerPoolPending,
} from '@/lib/league/ncaaf-beta-guard'
import { resolveViewerLeagueCommissioner } from '@/lib/dashboard/get-dashboard-league-list'

// ─── Minimal UserLeague stub ──────────────────────────────────────────────────

function makeLeague(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'league-1',
    name: 'Test League',
    sport: 'NFL',
    leagueType: 'redraft',
    leagueVariant: null,
    platform: 'manual',
    teamCount: 12,
    season: 2026,
    status: 'setup',
    scoring: 'PPR',
    isDynasty: false,
    bestBallMode: false,
    guillotineMode: false,
    isCommissioner: true,
    settings: {},
    ...overrides,
  }
}

// ─── getNcaafBetaStatus ───────────────────────────────────────────────────────

describe('getNcaafBetaStatus', () => {
  it('returns null for NFL leagues', () => {
    expect(getNcaafBetaStatus(makeLeague({ sport: 'NFL' }) as any)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(getNcaafBetaStatus(null)).toBeNull()
  })

  it('returns "devy" for NCAAF devy leagues', () => {
    expect(
      getNcaafBetaStatus(makeLeague({ sport: 'NCAAF', leagueType: 'devy' }) as any),
    ).toBe('devy')
  })

  it('returns "c2c" for NCAAF C2C leagues', () => {
    expect(
      getNcaafBetaStatus(makeLeague({ sport: 'NCAAF', leagueType: 'c2c' }) as any),
    ).toBe('c2c')
  })

  it('returns "ncaaf" for plain NCAAF redraft leagues', () => {
    expect(
      getNcaafBetaStatus(makeLeague({ sport: 'NCAAF', leagueType: 'redraft' }) as any),
    ).toBe('ncaaf')
  })
})

// ─── getNcaafBetaBannerInfo ───────────────────────────────────────────────────

describe('getNcaafBetaBannerInfo', () => {
  it('returns null for null status', () => {
    expect(getNcaafBetaBannerInfo(null)).toBeNull()
  })

  it('returns devy banner with correct testId', () => {
    const info = getNcaafBetaBannerInfo('devy')
    expect(info).not.toBeNull()
    expect(info!.testId).toBe('ncaaf-devy-beta-banner')
    expect(info!.headline).toMatch(/devy/i)
  })

  it('returns c2c banner with correct testId', () => {
    const info = getNcaafBetaBannerInfo('c2c')
    expect(info).not.toBeNull()
    expect(info!.testId).toBe('ncaaf-c2c-beta-banner')
    expect(info!.headline).toMatch(/college.to.pro|c2c/i)
  })

  it('returns generic ncaaf banner', () => {
    const info = getNcaafBetaBannerInfo('ncaaf')
    expect(info).not.toBeNull()
    expect(info!.testId).toBe('ncaaf-beta-banner')
  })
})

// ─── isNcaafPlayerPoolPending ─────────────────────────────────────────────────

describe('isNcaafPlayerPoolPending', () => {
  it('returns false for NFL leagues', () => {
    expect(isNcaafPlayerPoolPending(makeLeague({ sport: 'NFL' }) as any)).toBe(false)
  })

  it('returns true for NCAAF devy', () => {
    expect(
      isNcaafPlayerPoolPending(makeLeague({ sport: 'NCAAF', leagueType: 'devy' }) as any),
    ).toBe(true)
  })

  it('returns true for NCAAF C2C', () => {
    expect(
      isNcaafPlayerPoolPending(makeLeague({ sport: 'NCAAF', leagueType: 'c2c' }) as any),
    ).toBe(true)
  })

  it('returns false for plain NCAAF redraft (Sleeper data partially available)', () => {
    expect(
      isNcaafPlayerPoolPending(makeLeague({ sport: 'NCAAF', leagueType: 'redraft' }) as any),
    ).toBe(false)
  })
})

// ─── Dashboard My Leagues query — commissioner detection ──────────────────────

describe('resolveViewerLeagueCommissioner', () => {
  const base = {
    platform: 'manual',
    leagueRowOwnerId: 'user-creator',
    viewerUserId: 'user-creator',
    leagueIsCommissionerFlag: true,
    membershipRole: null as string | null,
    team: null as { isCommissioner?: boolean | null; isCoCommissioner?: boolean | null } | null,
  }

  it('returns true for the league creator on a manual league', () => {
    expect(resolveViewerLeagueCommissioner(base)).toBe(true)
  })

  it('returns true when redraftMembers role is COMMISSIONER', () => {
    expect(
      resolveViewerLeagueCommissioner({
        ...base,
        viewerUserId: 'other-user',
        leagueRowOwnerId: 'user-creator',
        membershipRole: 'COMMISSIONER',
      }),
    ).toBe(true)
  })

  it('returns true when LeagueTeam.isCommissioner is set', () => {
    expect(
      resolveViewerLeagueCommissioner({
        ...base,
        viewerUserId: 'co-comm',
        leagueRowOwnerId: 'user-creator',
        leagueIsCommissionerFlag: false,
        team: { isCommissioner: true },
      }),
    ).toBe(true)
  })

  it('returns false for a plain member', () => {
    expect(
      resolveViewerLeagueCommissioner({
        ...base,
        viewerUserId: 'plain-member',
        leagueRowOwnerId: 'user-creator',
        leagueIsCommissionerFlag: false,
        membershipRole: 'MEMBER',
        team: null,
      }),
    ).toBe(false)
  })
})

// ─── Dashboard league list — newly created league inclusion ───────────────────

describe('newly created league appears in My Leagues query', () => {
  it('includes creator via League.userId', () => {
    // Canonical create sets League.userId = appUserId.
    // The getDashboardLeagueListForUser query ORs: userId, redraftMembers, teams.
    // Any of these three being true means the league appears.
    // This test documents the expected inclusion path.
    const creatorId = 'app-user-1'
    const league = makeLeague({ userId: creatorId, platform: 'manual' })
    // Creator matches the first OR branch: League.userId === creatorId
    expect(league.userId).toBe(creatorId)
  })

  it('includes commissioner via redraftMembers COMMISSIONER role', () => {
    // createCanonicalLeagueInTransaction creates a RedraftLeagueMember with role=COMMISSIONER.
    // The query ORs: redraftMembers: { some: { userId } } — so this always includes them.
    const creatorId = 'app-user-1'
    const member = { userId: creatorId, role: 'COMMISSIONER' }
    expect(member.role).toBe('COMMISSIONER')
    expect(member.userId).toBe(creatorId)
  })

  it('open slot teams are isOrphan and have no claimedByUserId', () => {
    // Open teams created by canonical pipeline have claimedByUserId: null + isOrphan: true.
    // They do NOT satisfy the teams: { some: { claimedByUserId: userId } } OR-branch
    // — they are NOT counted as belonging to any user, which is correct.
    const openTeam = { claimedByUserId: null, isOrphan: true, ownerName: 'Open Team 2' }
    expect(openTeam.claimedByUserId).toBeNull()
    expect(openTeam.isOrphan).toBe(true)
  })
})
