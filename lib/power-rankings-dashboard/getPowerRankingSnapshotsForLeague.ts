import 'server-only'

import { prisma } from '@/lib/prisma'
import type { RankingModeId } from './types'

export type LeaguePowerRankingSnapshotRow = {
  id: string
  leagueId: string
  season: number
  week: number
  rankingMode: string
  engine: string
  teams: unknown
  computedAt: Date
}

export async function getPowerRankingSnapshotsForLeague(args: {
  leagueId: string
  rankingMode?: RankingModeId | string
  limit?: number
}): Promise<LeaguePowerRankingSnapshotRow[]> {
  const limit = Math.min(48, Math.max(1, args.limit ?? 16))
  const rankingMode = args.rankingMode ?? 'current_power'

  return prisma.leaguePowerRankingSnapshot.findMany({
    where: {
      leagueId: args.leagueId,
      rankingMode,
    },
    orderBy: { computedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      leagueId: true,
      season: true,
      week: true,
      rankingMode: true,
      engine: true,
      teams: true,
      computedAt: true,
    },
  })
}
