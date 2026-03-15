/**
 * LegacyRankingService — query legacy scores for leaderboards and profile views.
 */

import { prisma } from '@/lib/prisma'
import { normalizeSportForLegacy } from './SportLegacyResolver'
import type { LegacyQueryFilters } from './types'

export interface LegacyScoreRow {
  id: string
  entityType: string
  entityId: string
  sport: string
  leagueId: string | null
  overallLegacyScore: number
  championshipScore: number
  playoffScore: number
  consistencyScore: number
  rivalryScore: number
  awardsScore: number
  dynastyScore: number
  updatedAt: Date
}

export async function queryLegacyLeaderboard(
  filters: LegacyQueryFilters
): Promise<{ records: LegacyScoreRow[]; total: number }> {
  const sport = filters.sport ? normalizeSportForLegacy(filters.sport) : undefined
  const where: Record<string, unknown> = {}
  if (sport) where.sport = sport
  if (filters.leagueId != null) where.leagueId = filters.leagueId
  if (filters.entityType != null) where.entityType = filters.entityType

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const [records, total] = await Promise.all([
    prisma.legacyScoreRecord.findMany({
      where,
      orderBy: [{ overallLegacyScore: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.legacyScoreRecord.count({ where }),
  ])

  const rows: LegacyScoreRow[] = records.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    sport: r.sport,
    leagueId: r.leagueId,
    overallLegacyScore: Number(r.overallLegacyScore),
    championshipScore: Number(r.championshipScore),
    playoffScore: Number(r.playoffScore),
    consistencyScore: Number(r.consistencyScore),
    rivalryScore: Number(r.rivalryScore),
    awardsScore: Number(r.awardsScore),
    dynastyScore: Number(r.dynastyScore),
    updatedAt: r.updatedAt,
  }))

  return { records: rows, total }
}

export async function getLegacyScoreByEntity(
  entityType: string,
  entityId: string,
  sport: string,
  leagueId: string | null
): Promise<LegacyScoreRow | null> {
  const sportNorm = normalizeSportForLegacy(sport)
  const r = await prisma.legacyScoreRecord.findFirst({
    where: {
      entityType,
      entityId,
      sport: sportNorm,
      leagueId: leagueId ?? null,
    },
  })
  if (!r) return null
  return {
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    sport: r.sport,
    leagueId: r.leagueId,
    overallLegacyScore: Number(r.overallLegacyScore),
    championshipScore: Number(r.championshipScore),
    playoffScore: Number(r.playoffScore),
    consistencyScore: Number(r.consistencyScore),
    rivalryScore: Number(r.rivalryScore),
    awardsScore: Number(r.awardsScore),
    dynastyScore: Number(r.dynastyScore),
    updatedAt: r.updatedAt,
  }
}

export async function getLegacyScoreById(recordId: string): Promise<LegacyScoreRow | null> {
  const r = await prisma.legacyScoreRecord.findUnique({
    where: { id: recordId },
  })
  if (!r) return null
  return {
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    sport: r.sport,
    leagueId: r.leagueId,
    overallLegacyScore: Number(r.overallLegacyScore),
    championshipScore: Number(r.championshipScore),
    playoffScore: Number(r.playoffScore),
    consistencyScore: Number(r.consistencyScore),
    rivalryScore: Number(r.rivalryScore),
    awardsScore: Number(r.awardsScore),
    dynastyScore: Number(r.dynastyScore),
    updatedAt: r.updatedAt,
  }
}
