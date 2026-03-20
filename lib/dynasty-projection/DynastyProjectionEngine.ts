import { prisma } from '@/lib/prisma'
import type {
  DynastyLeagueContext,
  TeamDynastyInputs,
  DynastyProjectionSnapshotPayload,
} from './types'
import { calculateRosterFutureValue } from './RosterFutureValueCalculator'
import { valueFuturePicks } from './DraftPickValueModel'
import { estimateLongTermStrength } from './LongTermStrengthEstimator'
import { scoreProjectionConfidence } from './ProjectionConfidenceScorer'

export class DynastyProjectionEngine {
  constructor(private readonly ctx: DynastyLeagueContext) {}

  private getSportType(): string {
    return String(this.ctx.sport || 'NFL').toUpperCase()
  }

  projectTeam(inputs: TeamDynastyInputs): DynastyProjectionSnapshotPayload {
    const rosterValue = calculateRosterFutureValue(inputs.players, this.ctx)
    const pickValue = valueFuturePicks(inputs.futurePicks, this.ctx)
    const longTerm = estimateLongTermStrength(rosterValue, pickValue, this.ctx)
    const confidence = scoreProjectionConfidence({
      players: inputs.players,
      picks: pickValue,
      leagueContext: this.ctx,
    })

    return {
      leagueId: inputs.leagueId,
      sportType: this.getSportType(),
      teamId: inputs.teamId,
      season: this.ctx.season,
      projectedStrengthNextYear: longTerm.projectedStrengthNextYear,
      projectedStrength3Years: longTerm.projectedStrength3Years,
      projectedStrength5Years: longTerm.projectedStrength5Years,
      rebuildProbability: longTerm.rebuildProbability,
      contenderProbability: longTerm.contenderProbability,
      windowStartYear: longTerm.windowStartYear,
      windowEndYear: longTerm.windowEndYear,
      volatilityScore: longTerm.volatilityScore,
      confidenceScore: confidence,
    }
  }

  async persistSnapshot(payload: DynastyProjectionSnapshotPayload) {
    return prisma.dynastyProjectionSnapshot.upsert({
      where: {
        uniq_dynasty_projection_league_team_season: {
          leagueId: payload.leagueId,
          teamId: payload.teamId,
          season: payload.season,
        },
      },
      create: {
        leagueId: payload.leagueId,
        sportType: payload.sportType,
        teamId: payload.teamId,
        season: payload.season,
        projectedStrengthNextYear: payload.projectedStrengthNextYear,
        projectedStrength3Years: payload.projectedStrength3Years,
        projectedStrength5Years: payload.projectedStrength5Years,
        rebuildProbability: payload.rebuildProbability,
        contenderProbability: payload.contenderProbability,
        windowStartYear: payload.windowStartYear,
        windowEndYear: payload.windowEndYear,
        volatilityScore: payload.volatilityScore,
        confidenceScore: payload.confidenceScore,
      },
      update: {
        sportType: payload.sportType,
        projectedStrengthNextYear: payload.projectedStrengthNextYear,
        projectedStrength3Years: payload.projectedStrength3Years,
        projectedStrength5Years: payload.projectedStrength5Years,
        rebuildProbability: payload.rebuildProbability,
        contenderProbability: payload.contenderProbability,
        windowStartYear: payload.windowStartYear,
        windowEndYear: payload.windowEndYear,
        volatilityScore: payload.volatilityScore,
        confidenceScore: payload.confidenceScore,
      },
    })
  }

  async projectAndPersist(inputs: TeamDynastyInputs) {
    const snapshot = this.projectTeam(inputs)
    await this.persistSnapshot(snapshot)
    return snapshot
  }
}

