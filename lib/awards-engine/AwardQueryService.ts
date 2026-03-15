/**
 * AwardQueryService — query awards by league, season, type; get detail; build explain narrative.
 */

import { prisma } from '@/lib/prisma'
import { AWARD_LABELS } from './types'
import type { AwardType, AwardRecordView } from './types'

export async function listAwards(options: {
  leagueId: string
  season?: string | null
  awardType?: string | null
  limit?: number
}): Promise<AwardRecordView[]> {
  const where: { leagueId: string; season?: string; awardType?: string } = {
    leagueId: options.leagueId,
  }
  if (options.season) where.season = options.season
  if (options.awardType) where.awardType = options.awardType
  const limit = Math.min(options.limit ?? 100, 200)
  const records = await prisma.awardRecord.findMany({
    where,
    orderBy: [{ season: 'desc' }, { awardType: 'asc' }],
    take: limit,
  })
  return records.map((r) => ({
    awardId: r.id,
    leagueId: r.leagueId,
    sport: r.sport,
    season: r.season,
    awardType: r.awardType,
    awardLabel: AWARD_LABELS[r.awardType as AwardType] ?? r.awardType,
    managerId: r.managerId,
    score: Number(r.score),
    createdAt: r.createdAt,
  }))
}

export async function getAwardById(awardId: string): Promise<AwardRecordView | null> {
  const r = await prisma.awardRecord.findUnique({
    where: { id: awardId },
  })
  if (!r) return null
  return {
    awardId: r.id,
    leagueId: r.leagueId,
    sport: r.sport,
    season: r.season,
    awardType: r.awardType,
    awardLabel: AWARD_LABELS[r.awardType as AwardType] ?? r.awardType,
    managerId: r.managerId,
    score: Number(r.score),
    createdAt: r.createdAt,
  }
}

export async function getSeasonsWithAwards(leagueId: string): Promise<string[]> {
  const rows = await prisma.awardRecord.findMany({
    where: { leagueId },
    distinct: ['season'],
    select: { season: true },
    orderBy: { season: 'desc' },
  })
  return rows.map((r) => r.season)
}

/**
 * Build a short narrative for "Why did they win?" for AI explain.
 */
export function buildAwardExplanation(record: AwardRecordView): string {
  const parts: string[] = []
  parts.push(`${record.awardLabel} (${record.season}): ${record.managerId} won with score ${record.score.toFixed(2)}.`)
  return parts.join(' ')
}
