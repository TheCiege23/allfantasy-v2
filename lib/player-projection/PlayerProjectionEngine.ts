import { prisma } from '@/lib/prisma'
import type { PlayerAgingInputs, PlayerCareerProjection, SportCode } from './types'
import { projectPerGameUsingCurves } from './AgingCurveModel'
import { estimateBreakoutProbability } from './BreakoutProbabilityEstimator'
import { estimateDeclineProbability } from './DeclineProbabilityEstimator'

export class PlayerProjectionEngine {
  constructor(private readonly sport: SportCode) {}

  project(inputs: PlayerAgingInputs): PlayerCareerProjection {
    const perGame = projectPerGameUsingCurves(inputs)
    const breakout = estimateBreakoutProbability(inputs)
    const decline = estimateDeclineProbability(inputs)

    const gamesBaseline = 16
    const injuryFactor = inputs.injuryIndex != null
      ? Math.max(0.7, 1 - inputs.injuryIndex / 150)
      : 1

    const projectedPoints: number[] = []
    for (let h = 1; h <= 5; h++) {
      const ppg = perGame[h as 1 | 2 | 3 | 4 | 5]
      const factor = Math.max(0, 1 - (h - 1) * (decline / 300))
      projectedPoints.push(ppg * gamesBaseline * injuryFactor * factor)
    }

    const volatility =
      (Math.abs(projectedPoints[2] - projectedPoints[0]) / Math.max(1, projectedPoints[0])) * 60 +
      (breakout / 2) +
      (decline / 3)

    return {
      playerId: inputs.playerId,
      sport: this.sport,
      projectedPointsYear1: Math.round(projectedPoints[0]),
      projectedPointsYear2: Math.round(projectedPoints[1]),
      projectedPointsYear3: Math.round(projectedPoints[2]),
      projectedPointsYear4: Math.round(projectedPoints[3]),
      projectedPointsYear5: Math.round(projectedPoints[4]),
      breakoutProbability: breakout,
      declineProbability: decline,
      volatilityScore: Math.round(Math.min(100, Math.max(0, volatility))),
    }
  }

  async persistProjection(season: number, projection: PlayerCareerProjection) {
    await prisma.playerCareerProjection.upsert({
      where: {
        uniq_player_career_projection_sport_player_season: {
          sport: projection.sport,
          playerId: projection.playerId,
          season,
        },
      },
      create: {
        sport: projection.sport,
        playerId: projection.playerId,
        season,
        projectedPointsYear1: projection.projectedPointsYear1,
        projectedPointsYear2: projection.projectedPointsYear2,
        projectedPointsYear3: projection.projectedPointsYear3,
        projectedPointsYear4: projection.projectedPointsYear4,
        projectedPointsYear5: projection.projectedPointsYear5,
        breakoutProbability: projection.breakoutProbability,
        declineProbability: projection.declineProbability,
        volatilityScore: projection.volatilityScore,
      },
      update: {
        projectedPointsYear1: projection.projectedPointsYear1,
        projectedPointsYear2: projection.projectedPointsYear2,
        projectedPointsYear3: projection.projectedPointsYear3,
        projectedPointsYear4: projection.projectedPointsYear4,
        projectedPointsYear5: projection.projectedPointsYear5,
        breakoutProbability: projection.breakoutProbability,
        declineProbability: projection.declineProbability,
        volatilityScore: projection.volatilityScore,
      },
    })
  }
}

