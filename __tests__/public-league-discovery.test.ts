import { describe, expect, it } from 'vitest'
import {
  calculateDiscoveryFillingFastScore,
  calculateDiscoveryTrendingScore,
  matchesDiscoveryLeagueStyle,
} from '@/lib/public-discovery'
import { isLeagueVisibleForCareerTier } from '@/lib/ranking/tier-visibility'
import type { DiscoveryCard } from '@/lib/public-discovery/types'

function buildCard(overrides: Partial<DiscoveryCard> = {}): DiscoveryCard {
  return {
    source: 'fantasy',
    id: 'league-1',
    name: 'Alpha League',
    description: 'Rank-matched public league',
    sport: 'NFL',
    memberCount: 8,
    maxMembers: 12,
    joinUrl: '/join?code=ALPHA',
    detailUrl: '/leagues/league-1',
    ownerName: 'Commissioner',
    ownerAvatar: null,
    creatorSlug: null,
    creatorName: null,
    tournamentName: null,
    season: 2026,
    scoringMode: 'PPR',
    isPaid: false,
    isPrivate: false,
    createdAt: new Date('2026-03-25T12:00:00.000Z').toISOString(),
    fillPct: 67,
    leagueType: 'fantasy',
    leagueStyle: 'dynasty',
    draftType: null,
    teamCount: 12,
    draftDate: null,
    commissionerName: 'Commissioner',
    aiFeatures: ['Coach', 'Simulation'],
    leagueTier: 5,
    ...overrides,
  }
}

describe('public league discovery helpers', () => {
  it('matches discovery styles deterministically', () => {
    expect(matchesDiscoveryLeagueStyle(buildCard({ leagueStyle: 'dynasty' }), 'dynasty')).toBe(true)
    expect(matchesDiscoveryLeagueStyle(buildCard({ leagueStyle: 'dynasty' }), 'redraft')).toBe(false)
    expect(matchesDiscoveryLeagueStyle(buildCard({ leagueStyle: 'best_ball' }), 'all')).toBe(true)
  })

  it('prioritizes newer and fuller leagues in score calculations', () => {
    const fasterLeague = buildCard({
      id: 'league-fast',
      memberCount: 10,
      fillPct: 83,
      createdAt: new Date().toISOString(),
    })
    const slowerLeague = buildCard({
      id: 'league-slow',
      memberCount: 4,
      fillPct: 33,
      createdAt: new Date('2026-03-01T12:00:00.000Z').toISOString(),
    })

    expect(calculateDiscoveryTrendingScore(fasterLeague)).toBeGreaterThan(
      calculateDiscoveryTrendingScore(slowerLeague)
    )
    expect(calculateDiscoveryFillingFastScore(fasterLeague)).toBeGreaterThan(
      calculateDiscoveryFillingFastScore(slowerLeague)
    )
  })

  it('keeps discovery visibility within one tier by default', () => {
    expect(isLeagueVisibleForCareerTier(5, 4, 1)).toBe(true)
    expect(isLeagueVisibleForCareerTier(5, 5, 1)).toBe(true)
    expect(isLeagueVisibleForCareerTier(5, 6, 1)).toBe(true)
    expect(isLeagueVisibleForCareerTier(5, 7, 1)).toBe(false)
    expect(isLeagueVisibleForCareerTier(5, 3, 1)).toBe(false)
  })
})
