import { describe, expect, it } from 'vitest'

import { calculateAwardWinners } from '@/lib/awards-engine/AwardScoreCalculator'
import type { SeasonPerformanceInput } from '@/lib/awards-engine/types'

function buildInput(overrides?: Partial<SeasonPerformanceInput['byManager']>): SeasonPerformanceInput {
  return {
    leagueId: 'league-1',
    season: '2025',
    sport: 'NFL',
    byManager: {
      m1: {
        wins: 11,
        losses: 3,
        pointsFor: 1700,
        pointsAgainst: 1450,
        champion: true,
        madePlayoffs: true,
        playoffSeed: 1,
        playoffFinish: 'Champion',
        playoffWins: 3,
        playoffLosses: 0,
        bestFinish: 1,
        draftScore: 92,
        waiverClaimCount: 7,
        tradeCount: 4,
        isRookie: false,
        seasonsInLeague: 4,
        championshipCount: 2,
        playoffAppearanceCount: 3,
      },
      m2: {
        wins: 8,
        losses: 6,
        pointsFor: 1560,
        pointsAgainst: 1610,
        champion: false,
        madePlayoffs: true,
        playoffSeed: 4,
        playoffFinish: 'Runner-up',
        playoffWins: 2,
        playoffLosses: 1,
        bestFinish: 2,
        draftScore: 88,
        waiverClaimCount: 14,
        tradeCount: 1,
        isRookie: true,
        seasonsInLeague: 1,
        championshipCount: 0,
        playoffAppearanceCount: 1,
      },
      m3: {
        wins: 9,
        losses: 5,
        pointsFor: 1520,
        pointsAgainst: 1510,
        champion: false,
        madePlayoffs: false,
        playoffSeed: null,
        playoffFinish: null,
        playoffWins: 0,
        playoffLosses: 0,
        bestFinish: 5,
        draftScore: 75,
        waiverClaimCount: 2,
        tradeCount: 5,
        isRookie: false,
        seasonsInLeague: 3,
        championshipCount: 1,
        playoffAppearanceCount: 2,
      },
      ...overrides,
    },
  }
}

describe('AwardScoreCalculator', () => {
  it('applies prompt formulas for GM of the Year and Dynasty Builder', () => {
    const winners = calculateAwardWinners(buildInput())
    const gm = winners.find((w) => w.awardType === 'gm_of_the_year')
    const dynasty = winners.find((w) => w.awardType === 'dynasty_builder')

    expect(gm).toMatchObject({
      managerId: 'm1',
      score: 89.29,
    })
    expect(dynasty).toMatchObject({
      managerId: 'm1',
      score: 180,
    })
  })

  it('restricts Biggest Upset to champions only', () => {
    const winners = calculateAwardWinners(
      buildInput({
        m1: {
          wins: 8,
          losses: 6,
          pointsFor: 1500,
          pointsAgainst: 1490,
          champion: true,
          madePlayoffs: true,
          playoffSeed: 6,
          playoffFinish: 'Champion',
          playoffWins: 3,
          playoffLosses: 0,
          bestFinish: 1,
          draftScore: 82,
          waiverClaimCount: 1,
          tradeCount: 1,
          isRookie: false,
          seasonsInLeague: 2,
          championshipCount: 1,
          playoffAppearanceCount: 1,
        },
        m2: {
          wins: 5,
          losses: 9,
          pointsFor: 1400,
          pointsAgainst: 1600,
          champion: false,
          madePlayoffs: true,
          playoffSeed: 8,
          playoffFinish: 'Runner-up',
          playoffWins: 2,
          playoffLosses: 1,
          bestFinish: 2,
          draftScore: 80,
          waiverClaimCount: 4,
          tradeCount: 1,
          isRookie: false,
          seasonsInLeague: 2,
          championshipCount: 0,
          playoffAppearanceCount: 1,
        },
      })
    )
    const upset = winners.find((w) => w.awardType === 'biggest_upset')
    expect(upset?.managerId).toBe('m1')
    expect(upset?.score).toBe(42.86)
  })

  it('omits Trade Master and Waiver Wizard when no activity exists', () => {
    const winners = calculateAwardWinners(
      buildInput({
        m1: { ...buildInput().byManager.m1, tradeCount: 0, waiverClaimCount: 0 },
        m2: { ...buildInput().byManager.m2, tradeCount: 0, waiverClaimCount: 0 },
        m3: { ...buildInput().byManager.m3, tradeCount: 0, waiverClaimCount: 0 },
      })
    )

    expect(winners.find((w) => w.awardType === 'trade_master')).toBeUndefined()
    expect(winners.find((w) => w.awardType === 'waiver_wizard')).toBeUndefined()
  })
})
