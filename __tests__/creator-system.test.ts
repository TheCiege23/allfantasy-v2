import { describe, expect, it } from 'vitest'
import {
  buildCreatorAnalyticsSnapshot,
  buildCreatorFeaturedScore,
  buildCreatorLeagueNarrative,
  buildLeagueShareUrl,
  normalizeCreatorHandle,
} from '@/lib/creator-system'

describe('creator system helpers', () => {
  it('normalizes creator handles into stable slugs', () => {
    expect(normalizeCreatorHandle('  The Film Room Podcast  ')).toBe('the-film-room-podcast')
    expect(normalizeCreatorHandle('@@@')).toBe('creator')
  })

  it('builds featured scores and analytics snapshots deterministically', () => {
    expect(
      buildCreatorFeaturedScore({
        followerCount: 140,
        totalLeagueMembers: 320,
        leagueCount: 4,
        isVerified: true,
      })
    ).toBeGreaterThan(350)

    expect(
      buildCreatorAnalyticsSnapshot({
        profileViews: 200,
        followCount: 92,
        leagueJoins: 34,
        inviteShares: 21,
        leagueMembers: 187,
        publicLeagues: 3,
        topShareChannel: 'direct',
        featuredRank: 5,
        periodDays: 30,
      })
    ).toMatchObject({
      followCount: 92,
      leagueMembers: 187,
      publicLeagues: 3,
      topShareChannel: 'direct',
      period: '30d',
    })
  })

  it('builds creator recaps and share urls', () => {
    expect(
      buildCreatorLeagueNarrative({
        leagueName: 'Studio League',
        creatorName: 'Alpha Host',
        sport: 'NFL',
        memberCount: 48,
        isPublic: true,
      }).summary
    ).toContain('48 members')

    expect(buildLeagueShareUrl('league-1', 'JOINALPHA', 'https://allfantasy.test')).toBe(
      'https://allfantasy.test/creator/leagues/league-1?join=JOINALPHA'
    )
  })
})
