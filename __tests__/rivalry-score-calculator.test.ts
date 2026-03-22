import { describe, expect, it } from 'vitest'
import { calculateRivalryScore } from '@/lib/rivalry-engine/RivalryScoreCalculator'

describe('RivalryScoreCalculator', () => {
  it('returns 0 for no rivalry signals', () => {
    const score = calculateRivalryScore({
      totalMatchups: 0,
      closeGameCount: 0,
      playoffMeetings: 0,
      eliminationEvents: 0,
      championshipMeetings: 0,
      upsetWins: 0,
      tradeCount: 0,
      contentionOverlapScore: 0,
      dramaEventCount: 0,
    })
    expect(score).toBe(0)
  })

  it('produces high score for strong long-running rivalry', () => {
    const score = calculateRivalryScore({
      totalMatchups: 24,
      closeGameCount: 12,
      playoffMeetings: 3,
      eliminationEvents: 2,
      championshipMeetings: 1,
      upsetWins: 4,
      tradeCount: 5,
      contentionOverlapScore: 75,
      dramaEventCount: 3,
    })
    expect(score).toBeGreaterThanOrEqual(60)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('respects custom weights', () => {
    const score = calculateRivalryScore(
      {
        totalMatchups: 8,
        closeGameCount: 2,
        playoffMeetings: 0,
        eliminationEvents: 0,
        championshipMeetings: 0,
        upsetWins: 1,
        tradeCount: 7,
        contentionOverlapScore: 30,
        dramaEventCount: 0,
      },
      {
        tradeFrequency: 0.5,
        totalMatchups: 0.05,
        closeGameFrequency: 0.05,
      }
    )
    expect(score).toBeGreaterThan(30)
  })
})
