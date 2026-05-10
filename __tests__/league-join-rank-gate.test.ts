import { describe, expect, it } from 'vitest'
import { resolveJoinRankGate } from '@/lib/league-join/resolveJoinRankGate'

function createMockPrisma(overrides?: {
  listing?: { minRankLevel: number | null; maxRankLevel: number | null; creatorRankLevel: number | null } | null
  profile?: { xpLevel?: number | null; legacyCareerLevel?: number | null } | null
  invite?: { bypassRankGate?: boolean | null; useCount?: number | null; maxUses?: number | null; expiresAt?: Date | null } | null
}) {
  return {
    findLeagueListing: {
      findFirst: async () => overrides?.listing ?? null,
    },
    userProfile: {
      findUnique: async () => overrides?.profile ?? null,
    },
    leagueInvite: {
      findFirst: async () => overrides?.invite ?? null,
    },
  }
}

describe('resolveJoinRankGate', () => {
  it('allows join when listing is missing', async () => {
    const result = await resolveJoinRankGate({
      leagueId: 'league-1',
      userId: 'user-1',
      inviteTokenOrCode: 'ABC123',
      prismaLike: createMockPrisma({
        listing: null,
        profile: { xpLevel: 5, legacyCareerLevel: 2 },
      }) as any,
    })

    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('LISTING_MISSING')
    expect(result.userRankLevel).toBe(5)
  })

  it('blocks join when user rank is outside listing range and no bypass invite', async () => {
    const result = await resolveJoinRankGate({
      leagueId: 'league-2',
      userId: 'user-2',
      inviteTokenOrCode: 'JOINCODE',
      prismaLike: createMockPrisma({
        listing: { minRankLevel: 3, maxRankLevel: 6, creatorRankLevel: 4 },
        profile: { xpLevel: 1, legacyCareerLevel: 1 },
        invite: { bypassRankGate: false, useCount: 0, maxUses: 10, expiresAt: null },
      }) as any,
    })

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('OUTSIDE_RANK_RANGE')
    expect(result.minRankLevel).toBe(3)
    expect(result.maxRankLevel).toBe(6)
    expect(result.userRankLevel).toBe(1)
  })

  it('allows join when user rank is inside listing range', async () => {
    const result = await resolveJoinRankGate({
      leagueId: 'league-3',
      userId: 'user-3',
      inviteTokenOrCode: 'JOINCODE',
      prismaLike: createMockPrisma({
        listing: { minRankLevel: 2, maxRankLevel: 4, creatorRankLevel: 3 },
        profile: { xpLevel: 3, legacyCareerLevel: 1 },
      }) as any,
    })

    expect(result.allowed).toBe(true)
    expect(result.bypassed).toBe(false)
    expect(result.reason).toBe('RANGE_OK')
  })

  it('allows join via bypass invite when outside rank range', async () => {
    const result = await resolveJoinRankGate({
      leagueId: 'league-4',
      userId: 'user-4',
      inviteTokenOrCode: 'SPECIAL',
      prismaLike: createMockPrisma({
        listing: { minRankLevel: 5, maxRankLevel: 7, creatorRankLevel: 6 },
        profile: { xpLevel: 2, legacyCareerLevel: 2 },
        invite: { bypassRankGate: true, useCount: 0, maxUses: 5, expiresAt: null },
      }) as any,
    })

    expect(result.allowed).toBe(true)
    expect(result.bypassed).toBe(true)
    expect(result.reason).toBe('BYPASS_INVITE')
  })

  it('defaults user rank to 1 when no user profile exists', async () => {
    const result = await resolveJoinRankGate({
      leagueId: 'league-5',
      userId: 'user-5',
      inviteTokenOrCode: 'JOINCODE',
      prismaLike: createMockPrisma({
        listing: { minRankLevel: 2, maxRankLevel: 4, creatorRankLevel: 3 },
        profile: null,
      }) as any,
    })

    expect(result.userRankLevel).toBe(1)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('OUTSIDE_RANK_RANGE')
  })
})
