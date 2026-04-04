import { prisma } from '@/lib/prisma'
import type {
  DynastyLeagueContext,
  DynastyProjectTeamOptions,
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

  projectTeam(
    inputs: TeamDynastyInputs,
    options?: DynastyProjectTeamOptions
  ): DynastyProjectionSnapshotPayload {
    const rosterValue = calculateRosterFutureValue(inputs.players, this.ctx)
    const pickValue = valueFuturePicks(inputs.futurePicks, this.ctx)
    const longTerm = estimateLongTermStrength(rosterValue, pickValue, this.ctx)
    const confidence = scoreProjectionConfidence({
      players: inputs.players,
      picks: pickValue,
      leagueContext: this.ctx,
    })

    let payload: DynastyProjectionSnapshotPayload = {
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

    if (options?.weatherAwareProjections && options.afProjectionByPlayerId) {
      const rel: number[] = []
      for (const pl of inputs.players) {
        const o = options.afProjectionByPlayerId[pl.playerId]
        if (o && o.baselineProjection > 0) {
          rel.push((o.afProjection - o.baselineProjection) / o.baselineProjection)
        }
      }
      if (rel.length > 0) {
        const avg = rel.reduce((a, b) => a + b, 0) / rel.length
        const blend = 1 + Math.max(-0.05, Math.min(0.05, avg * 0.25))
        payload = {
          ...payload,
          projectedStrengthNextYear: payload.projectedStrengthNextYear * blend,
          projectedStrength3Years: payload.projectedStrength3Years * blend,
          projectedStrength5Years: payload.projectedStrength5Years * blend,
          weatherAwareBlendFactor: blend,
        }
      }
    }

    return payload
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

  async projectAndPersist(inputs: TeamDynastyInputs, options?: DynastyProjectTeamOptions) {
    const snapshot = this.projectTeam(inputs, options)
    await this.persistSnapshot(snapshot)
    return snapshot
  }
}

