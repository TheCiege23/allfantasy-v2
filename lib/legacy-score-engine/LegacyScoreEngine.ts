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
  const entityType = String(input.entityType ?? '').toUpperCase() as LegacyEntityType
  const sport = normalizeSportForLegacy(input.sport)
  if (!isSupportedLegacySport(sport)) return null
  if (!['MANAGER', 'TEAM', 'FRANCHISE'].includes(entityType)) return null

  await seedDefaultLegacyEvidenceIfEmpty(
    entityType,
    input.entityId,
    sport
  )
  const aggregated = await aggregateLegacyEvidence(
    entityType,
    input.entityId,
    sport,
    input.leagueId ?? null
  )
  const scores = computeLegacyScores(aggregated)

  const leagueIdForDb = input.leagueId ?? null

  if (input.replace !== false) {
    const existing = await prisma.legacyScoreRecord.findFirst({
      where: {
        entityType,
        entityId: input.entityId,
        sport,
        leagueId: leagueIdForDb,
      },
    })
    const data = {
      entityType,
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
      entityType,
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
  options?: {
    sport?: string
    replace?: boolean
    entityTypes?: LegacyEntityType[]
  }
): Promise<{
  processed: number
  managerProcessed: number
  teamProcessed: number
  franchiseProcessed: number
  results: Array<{ entityType: string; entityId: string; overallLegacyScore: number }>
}> {
  const [league, seasonResults] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        sport: true,
        rosters: { select: { id: true, platformUserId: true } },
        teams: { select: { id: true, externalId: true, ownerName: true, teamName: true } },
      },
    }),
    prisma.seasonResult.findMany({
      where: { leagueId },
      select: { rosterId: true },
      distinct: ['rosterId'],
    }),
  ])
  const sport = normalizeSportForLegacy(options?.sport ?? (league?.sport ? String(league.sport) : 'NFL'))
  const requestedEntityTypes =
    options?.entityTypes && options.entityTypes.length > 0
      ? options.entityTypes
      : (['MANAGER', 'TEAM', 'FRANCHISE'] as LegacyEntityType[])

  const managerIds = new Set<string>()
  for (const row of seasonResults) managerIds.add(String(row.rosterId))
  for (const roster of league?.rosters ?? []) {
    managerIds.add(String(roster.id))
    managerIds.add(String(roster.platformUserId))
  }
  for (const team of league?.teams ?? []) {
    if (team.externalId) managerIds.add(String(team.externalId))
    if (team.ownerName) managerIds.add(String(team.ownerName))
  }

  const teamIds = new Set<string>()
  for (const team of league?.teams ?? []) {
    if (team.externalId) teamIds.add(String(team.externalId))
    teamIds.add(String(team.id))
  }

  const results: Array<{ entityType: string; entityId: string; overallLegacyScore: number }> = []
  let managerProcessed = 0
  let teamProcessed = 0
  let franchiseProcessed = 0

  for (const entityType of requestedEntityTypes) {
    const entityIds =
      entityType === 'MANAGER'
        ? [...managerIds].filter(Boolean)
        : [...teamIds].filter(Boolean)
    for (const entityId of entityIds) {
      const result = await runLegacyScoreEngine({
        entityType,
        entityId,
        sport,
        leagueId,
        replace: options?.replace ?? true,
      })
      if (!result) continue
      results.push({
        entityType: result.entityType,
        entityId: result.entityId,
        overallLegacyScore: result.scores.overallLegacyScore,
      })
      if (entityType === 'MANAGER') managerProcessed += 1
      else if (entityType === 'TEAM') teamProcessed += 1
      else if (entityType === 'FRANCHISE') franchiseProcessed += 1
    }
  }

  return {
    processed: results.length,
    managerProcessed,
    teamProcessed,
    franchiseProcessed,
    results,
  }
}
