import { describe, expect, it } from 'vitest'
import { applyMatchupCommandCenterMeta, MATCHUP_FINAL_REFRESH_MS } from '@/lib/matchup-center/matchupAggregation'
import { buildMatchupInsightsBlock } from '@/lib/matchup-center/matchupAiInsights'
import type { MatchupSidePayload } from '@/lib/matchup-center/types'
import { assertValidMatchupPayload } from '@/lib/matchup-center/validateMatchupPayload'

function side(partial: Partial<MatchupSidePayload> & Pick<MatchupSidePayload, 'rosterId' | 'teamName'>): MatchupSidePayload {
  return {
    avatarUrl: null,
    record: { wins: 0, losses: 0, ties: 0 },
    winPct: 0,
    totalPoints: 0,
    projectedTotal: 0,
    starters: [],
    remainingStarters: 0,
    ...partial,
  }
}

describe('matchup command center payload', () => {
  it('applyMatchupCommandCenterMeta sets refreshIntervalMs', () => {
    const left = side({ rosterId: 'a', teamName: 'A', projectedTotal: 90, starters: [] })
    const right = side({ rosterId: 'b', teamName: 'B', projectedTotal: 88, starters: [] })
    const insights = buildMatchupInsightsBlock({ left, right, sport: 'NFL' })
    const base = {
      leagueId: 'x',
      season: 2026,
      week: 3,
      sport: 'NFL',
      matchupStatus: 'live' as const,
      conceptOverlay: null,
      left,
      right,
      winProbabilityLeft: 0.5,
      insights,
      partialData: false,
    }
    const out = applyMatchupCommandCenterMeta(base)
    expect(out.refreshIntervalMs).toBeGreaterThan(0)
    const fin = applyMatchupCommandCenterMeta({ ...base, matchupStatus: 'final' })
    expect(fin.refreshIntervalMs).toBe(MATCHUP_FINAL_REFRESH_MS)
  })

  it('assertValidMatchupPayload accepts merged insights + refresh', () => {
    const left = side({ rosterId: 'a', teamName: 'A', projectedTotal: 90, starters: [] })
    const right = side({ rosterId: 'b', teamName: 'B', projectedTotal: 88, starters: [] })
    const insights = buildMatchupInsightsBlock({ left, right, sport: 'NBA' })
    const v = assertValidMatchupPayload(
      applyMatchupCommandCenterMeta({
        leagueId: 'y',
        season: 2026,
        week: 1,
        sport: 'NBA',
        matchupStatus: 'upcoming',
        conceptOverlay: null,
        left,
        right,
        winProbabilityLeft: null,
        insights,
        partialData: false,
      }),
    )
    expect(v.ok).toBe(true)
  })
})
