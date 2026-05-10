import { describe, expect, it, vi } from 'vitest'
import { createCanonicalLeagueInTransaction } from '@/lib/league-creation/canonical/createCanonicalLeagueInTransaction'

function buildTx() {
  const tx = {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({ displayName: 'Creator Name', xpLevel: 9, legacyCareerLevel: null }),
    },
    appUser: {
      findUnique: vi.fn().mockResolvedValue({ username: 'creator_user', email: 'creator@test.local' }),
    },
    league: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'league-1' }),
    },
    leagueSettings: {
      create: vi.fn().mockResolvedValue({ id: 'ls-1' }),
    },
    leagueWaiverSettings: {
      create: vi.fn().mockResolvedValue({ id: 'lws-1' }),
    },
    redraftLeagueExtendedSettings: {
      create: vi.fn().mockResolvedValue({ id: 'ext-1' }),
    },
    redraftLeagueDraftProfile: {
      create: vi.fn().mockResolvedValue({ id: 'dp-1' }),
    },
    redraftLeagueHomepageState: {
      create: vi.fn().mockResolvedValue({ id: 'home-1' }),
    },
    redraftLeagueSportIntegration: {
      create: vi.fn().mockResolvedValue({ id: 'si-1' }),
    },
    redraftLeagueChatRoom: {
      create: vi.fn().mockResolvedValue({ id: 'chat-1' }),
    },
    roster: {
      create: vi.fn().mockResolvedValue({ id: 'roster-1' }),
    },
    leagueTeam: {
      create: vi.fn().mockResolvedValue({ id: 'team-1' }),
    },
    redraftLeagueMember: {
      create: vi.fn().mockResolvedValue({ id: 'member-1' }),
    },
    leagueEntrySlot: {
      createMany: vi.fn().mockResolvedValue({ count: 12 }),
    },
    draftSession: {
      create: vi.fn().mockResolvedValue({ id: 'ds-1' }),
    },
    leagueInvite: {
      create: vi.fn().mockResolvedValue({ id: 'invite-1', token: 'JOIN12345' }),
    },
    findLeagueListing: {
      upsert: vi.fn().mockResolvedValue({ id: 'listing-1' }),
    },
  }

  return tx
}

describe('createCanonicalLeagueInTransaction contract', () => {
  it('writes canonical records and defaults for create->finder/join/draft-intro flow', async () => {
    const tx = buildTx()

    const body = {
      concept: 'redraft',
      sport: 'NFL',
      teamCount: 12,
      draftType: 'snake',
      scoringPreset: 'fb_half_ppr',
      leagueName: 'Contract League',
      language: 'en',
      tradeReviewMode: 'commissioner',
    } as any

    const engine = {
      presetKey: 'preset-contract',
      leagueFormatId: 'redraft',
      settingsSnapshot: {},
      formatResolution: {
        draftDefaults: {
          rounds_default: 15,
          timer_seconds_default: 90,
        },
        waiverDefaults: {
          waiver_type: 'faab',
          processing_days: [2],
          processing_time_utc: '12:00:00',
          max_claims_per_period: 3,
          FAAB_budget_default: 100,
          claim_priority_behavior: 'reverse_standings',
          game_lock_behavior: 'game_time',
          free_agent_unlock_behavior: 'instant',
        },
        modifiers: [],
      },
    } as any

    const result = await createCanonicalLeagueInTransaction(tx as any, 'app-user-1', body, engine)

    expect(result.leagueId).toBe('league-1')
    expect(result.inviteUrl).toBe('/join/JOIN12345')

    const homepage = new URL(result.homepageUrl, 'http://localhost')
    expect(homepage.pathname).toBe('/league/league-1')
    expect(homepage.searchParams.get('created')).toBe('1')
    expect(homepage.searchParams.get('showInvite')).toBe('1')
    expect(homepage.searchParams.get('openChat')).toBe('league')
    expect(homepage.searchParams.get('playIntro')).toBe('1')

    expect(tx.league.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Contract League',
          timezone: 'America/New_York',
          language: 'en',
          leagueType: 'redraft',
        }),
      }),
    )

    expect(tx.leagueTeam.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueId: 'league-1',
          claimedByUserId: 'app-user-1',
          isCommissioner: true,
        }),
      }),
    )

    expect(tx.redraftLeagueMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueId: 'league-1',
          userId: 'app-user-1',
          role: 'COMMISSIONER',
        }),
      }),
    )

    expect(tx.draftSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueId: 'league-1',
          status: 'pre_draft',
          teamCount: 12,
        }),
      }),
    )

    expect(tx.leagueInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueId: 'league-1',
          createdByRole: 'COMMISSIONER',
          bypassRankGate: false,
        }),
      }),
    )

    expect(tx.redraftLeagueExtendedSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueId: 'league-1',
          allowMemberInviteRankBypass: false,
        }),
      }),
    )

    expect(tx.leagueEntrySlot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ leagueId: 'league-1', slotNumber: 1 }),
          expect.objectContaining({ leagueId: 'league-1', slotNumber: 12 }),
        ]),
      }),
    )

    expect(tx.findLeagueListing.upsert).toHaveBeenCalledTimes(1)
    const listingArg = tx.findLeagueListing.upsert.mock.calls[0]?.[0]
    expect(listingArg.create.creatorRankLevel).toBe(9)
    expect(listingArg.create.minRankLevel).toBe(6)
    expect(listingArg.create.maxRankLevel).toBe(12)

    const listingBody = JSON.parse(String(listingArg.create.body)) as {
      creatorRankLevel: number
      minRankLevel: number
      maxRankLevel: number
      timezone: string
    }

    expect(listingBody.creatorRankLevel).toBe(9)
    expect(listingBody.minRankLevel).toBe(6)
    expect(listingBody.maxRankLevel).toBe(12)
    expect(listingBody.timezone).toBe('America/New_York')
  })
})
