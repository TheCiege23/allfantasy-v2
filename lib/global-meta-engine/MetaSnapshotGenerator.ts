/**
 * MetaSnapshotGenerator – produces GlobalMetaSnapshot records per sport/season/week and meta type.
 * Uses TrendDetectionService and existing PlayerMetaTrend / StrategyMetaReport data.
 */
import { prisma } from '@/lib/prisma'
import { getTrendSignalsForMetaType } from './TrendDetectionService'
import { normalizeSportForMeta } from './SportMetaResolver'
import type { MetaType } from './types'
import { META_TYPES } from './types'

export interface GenerateSnapshotInput {
  sport: string
  season: string
  weekOrPeriod?: number
  metaTypes?: MetaType[]
}

export async function generateGlobalMetaSnapshots(input: GenerateSnapshotInput): Promise<number> {
  const sport = normalizeSportForMeta(input.sport)
  const season = String(input.season)
  const weekOrPeriod = input.weekOrPeriod ?? 0
  const metaTypes = input.metaTypes ?? [...META_TYPES]
  let created = 0

  for (const metaType of metaTypes) {
    const trendData = await getTrendSignalsForMetaType(metaType, {
      sport,
      season,
      weekOrPeriod,
    })
    const data = {
      ...trendData,
      generatedAt: new Date().toISOString(),
      sport,
      season,
      weekOrPeriod,
    }
    await prisma.globalMetaSnapshot.create({
      data: {
        sport,
        season,
        weekOrPeriod,
        metaType,
        data,
      },
    })
    created++
  }
  return created
}

/** Generate snapshots for all supported sports and current season. */
export async function generateAllSportSnapshots(season?: string): Promise<number> {
  const year = season ?? String(new Date().getFullYear())
  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const
  let total = 0
  for (const sport of sports) {
    total += await generateGlobalMetaSnapshots({ sport, season: year })
  }
  return total
}
