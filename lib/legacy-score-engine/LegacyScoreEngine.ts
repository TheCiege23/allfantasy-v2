/**
 * LegacyScoreEngine — orchestrates evidence aggregation, score calculation, and persistence.
 */

import { prisma } from '@/lib/prisma'
import { normalizeSportForLegacy, isSupportedLegacySport } from './SportLegacyResolver'
import { aggregateLegacyEvidence, seedDefaultLegacyEvidenceIfEmpty } from './LegacyEvidenceAggregator'
import { computeLegacyScores } from './LegacyScoreCalculator'
import type { LegacyScoreEngineInput, LegacyScoreEngineResult, LegacyEntityType } from './types'

export async function runLegacyScoreEngine(
  input: LegacyScoreEngineInput
): Promise<LegacyScoreEngineResult | null> {
  const sport = normalizeSportForLegacy(input.sport)
  if (!isSupportedLegacySport(sport)) return null

  await seedDefaultLegacyEvidenceIfEmpty(
    input.entityType as string,
    input.entityId,
    sport
  )
  const aggregated = await aggregateLegacyEvidence(
    input.entityType as string,
    input.entityId,
    sport,
    input.leagueId ?? null
  )
  const scores = computeLegacyScores(aggregated)

  const leagueIdForDb = input.leagueId ?? null

  if (input.replace !== false) {
    const existing = await prisma.legacyScoreRecord.findFirst({
      where: {
        entityType: input.entityType as string,
        entityId: input.entityId,
        sport,
        leagueId: leagueIdForDb,
      },
    })
    const data = {
      entityType: input.entityType as string,
      entityId: input.entityId,
      sport,
      leagueId: leagueIdForDb,
      overallLegacyScore: scores.overallLegacyScore,
      championshipScore: scores.championshipScore,
      playoffScore: scores.playoffScore,
      consistencyScore: scores.consistencyScore,
      rivalryScore: scores.rivalryScore,
      awardsScore: scores.awardsScore,
      dynastyScore: scores.dynastyScore,
    }
    if (existing) {
      await prisma.legacyScoreRecord.update({
        where: { id: existing.id },
        data: {
          overallLegacyScore: data.overallLegacyScore,
          championshipScore: data.championshipScore,
          playoffScore: data.playoffScore,
          consistencyScore: data.consistencyScore,
          rivalryScore: data.rivalryScore,
          awardsScore: data.awardsScore,
          dynastyScore: data.dynastyScore,
        },
      })
    } else {
      await prisma.legacyScoreRecord.create({ data })
    }
  }

  const r = await prisma.legacyScoreRecord.findFirst({
    where: {
      entityType: input.entityType as string,
      entityId: input.entityId,
      sport,
      leagueId: leagueIdForDb,
    },
  })
  if (!r) return null

  return {
    legacyScoreId: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    sport: r.sport,
    leagueId: r.leagueId,
    scores: {
      overallLegacyScore: Number(r.overallLegacyScore),
      championshipScore: Number(r.championshipScore),
      playoffScore: Number(r.playoffScore),
      consistencyScore: Number(r.consistencyScore),
      rivalryScore: Number(r.rivalryScore),
      awardsScore: Number(r.awardsScore),
      dynastyScore: Number(r.dynastyScore),
    },
  }
}

/**
 * Run legacy score engine for all managers (rosters) in a league.
 */
export async function runLegacyScoreEngineForLeague(
  leagueId: string,
  options?: { sport?: string; replace?: boolean }
): Promise<{ processed: number; results: Array<{ entityId: string; overallLegacyScore: number }> }> {
  const [league, seasonResults] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true },
    }),
    prisma.seasonResult.findMany({
      where: { leagueId },
      select: { rosterId: true },
      distinct: ['rosterId'],
    }),
  ])
  const sport = options?.sport ?? (league?.sport ? String(league.sport) : 'NFL')
  const rosterIds = [...new Set(seasonResults.map((r) => r.rosterId))]
  const results: Array<{ entityId: string; overallLegacyScore: number }> = []
  for (const rosterId of rosterIds) {
    const result = await runLegacyScoreEngine({
      entityType: 'MANAGER' as LegacyEntityType,
      entityId: String(rosterId),
      sport,
      leagueId,
      replace: options?.replace ?? true,
    })
    if (result) results.push({ entityId: result.entityId, overallLegacyScore: result.scores.overallLegacyScore })
  }
  return { processed: results.length, results }
}
