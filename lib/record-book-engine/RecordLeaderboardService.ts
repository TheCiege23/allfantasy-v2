/**
 * RecordLeaderboardService — rank record book entries by value for leaderboards.
 */

import { prisma } from '@/lib/prisma'
import { RECORD_LABELS } from './types'
import type { RecordType } from './types'

export interface RecordLeaderboardRow {
  recordId: string
  sport: string
  leagueId: string
  recordType: string
  recordLabel: string
  holderId: string
  value: number
  season: string
  rank: number
  createdAt: Date
}

/**
 * Get leaderboard of record book entries for a league, optionally by recordType and season.
 * Ordered by value descending (higher = better for all current types).
 */
export async function getRecordLeaderboard(options: {
  leagueId: string
  sport?: string | null
  recordType?: string | null
  season?: string | null
  limit?: number
}): Promise<RecordLeaderboardRow[]> {
  const where: { leagueId: string; sport?: string; recordType?: string; season?: string } = {
    leagueId: options.leagueId,
  }
  if (options.sport) where.sport = options.sport
  if (options.recordType) where.recordType = options.recordType
  if (options.season) where.season = options.season
  const limit = Math.min(options.limit ?? 50, 200)

  const rows = await prisma.recordBookEntry.findMany({
    where,
    orderBy: { value: 'desc' },
    take: limit,
  })

  return rows.map((r, i) => ({
    recordId: r.id,
    sport: r.sport,
    leagueId: r.leagueId,
    recordType: r.recordType,
    recordLabel: RECORD_LABELS[r.recordType as RecordType] ?? r.recordType,
    holderId: r.holderId,
    value: Number(r.value),
    season: r.season,
    rank: i + 1,
    createdAt: r.createdAt,
  }))
}
