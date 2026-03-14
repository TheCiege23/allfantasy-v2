import { prisma } from '@/lib/prisma'
import type {
  TeamWindowInputs,
  TeamWindowProfile,
  WindowStatus,
  TrajectoryDirection,
} from './types'
import { computeDynastyStrengthScore } from './FutureStrengthModel'
import { inferTrajectoryDirection } from './TrajectoryCalculator'

function classifyWindowStatus(
  dynastyStrength: number,
  rebuildProb: number,
  contenderProb: number,
  traj: TrajectoryDirection,
  recentWinPct: number,
): WindowStatus {
  if (rebuildProb >= 70 && dynastyStrength < 45) {
    if (recentWinPct < 0.25 && dynastyStrength >= 35) {
      return 'Tank Risk'
    }
    return 'Rebuilding'
  }

  if (contenderProb >= 70 && dynastyStrength >= 70) {
    return 'Contender'
  }

  if (traj === 'rising' && dynastyStrength >= 55) {
    return 'Rising'
  }

  if (traj === 'falling' && dynastyStrength >= 50 && rebuildProb >= 40) {
    return 'Declining'
  }

  return 'Competitive'
}

export class WindowDetectionEngine {
  detect(inputs: TeamWindowInputs): TeamWindowProfile {
    const { futureStrength, rosterAge, recentPerformance } = inputs
    const dynastyStrengthScore = computeDynastyStrengthScore(futureStrength)
    const trajectoryDirection = inferTrajectoryDirection(
      recentPerformance,
      futureStrength.projectedStrengthNextYear,
      futureStrength.projectedStrength3Years,
    )

    const rebuildRiskScore = Math.round(
      Math.min(
        100,
        Math.max(
          0,
          futureStrength.rebuildProbability * 0.7 +
            rosterAge.agingRiskScore * 0.2 -
            rosterAge.youngCoreScore * 0.2,
        ),
      ),
    )

    const windowStatus = classifyWindowStatus(
      dynastyStrengthScore,
      rebuildRiskScore,
      futureStrength.contenderProbability,
      trajectoryDirection,
      recentPerformance.recentWinPct,
    )

    return {
      teamId: inputs.teamId,
      leagueId: inputs.leagueId,
      windowStatus,
      windowStartYear: futureStrength.windowStartYear,
      windowEndYear: futureStrength.windowEndYear,
      rebuildRiskScore,
      dynastyStrengthScore,
      trajectoryDirection,
      updatedAt: new Date(),
    }
  }

  async persist(inputs: TeamWindowInputs) {
    const profile = this.detect(inputs)
    await prisma.teamWindowProfile.upsert({
      where: {
        uniq_team_window_profile_league_team_season: {
          leagueId: inputs.leagueId,
          teamId: inputs.teamId,
          season: inputs.season,
        },
      },
      create: {
        leagueId: inputs.leagueId,
        teamId: inputs.teamId,
        season: inputs.season,
        windowStatus: profile.windowStatus,
        windowStartYear: profile.windowStartYear,
        windowEndYear: profile.windowEndYear,
        rebuildRiskScore: profile.rebuildRiskScore,
        dynastyStrengthScore: profile.dynastyStrengthScore,
        trajectoryDirection: profile.trajectoryDirection,
      },
      update: {
        windowStatus: profile.windowStatus,
        windowStartYear: profile.windowStartYear,
        windowEndYear: profile.windowEndYear,
        rebuildRiskScore: profile.rebuildRiskScore,
        dynastyStrengthScore: profile.dynastyStrengthScore,
        trajectoryDirection: profile.trajectoryDirection,
      },
    })
    return profile
  }
}

