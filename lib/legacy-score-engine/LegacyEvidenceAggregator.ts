/**
 * LegacyEvidenceAggregator — collects evidence from DB and league history into dimension inputs.
 */

import { prisma } from '@/lib/prisma'
import type { LegacyEvidenceType } from './types'

export interface AggregatedLegacyEvidence {
  championships: number
  playoffAppearances: number
  finalsAppearances: number
  winPct: number
  rivalryDominance: number
  awards: number
  consistency: number
  dynastyRun: number
  highDifficultySuccess: number
  stayingPower: number
}

/**
 * Aggregate legacy evidence for an entity from LegacyEvidenceRecord and optionally SeasonResult/HallOfFameRow.
 */
export async function aggregateLegacyEvidence(
  entityType: string,
  entityId: string,
  sport: string,
  leagueId: string | null
): Promise<AggregatedLegacyEvidence> {
  const evidence = await prisma.legacyEvidenceRecord.findMany({
    where: { entityType, entityId, sport },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const sums: Record<string, number> = {}
  const counts: Record<string, number> = {}
  for (const e of evidence) {
    const t = e.evidenceType
    sums[t] = (sums[t] ?? 0) + Number(e.value)
    counts[t] = (counts[t] ?? 0) + 1
  }

  const get = (type: LegacyEvidenceType, defaultVal: number) => {
    const v = sums[type]
    if (v == null) return defaultVal
    const c = counts[type] ?? 0
    return c > 0 ? Math.max(0, Math.min(100, v / c)) : defaultVal
  }

  let championships = get('championships', 0)
  let playoffAppearances = get('playoff_appearances', 0)
  let finalsAppearances = get('finals_appearances', 0)
  let winPct = get('win_pct', 0)
  const rivalryDominance = get('rivalry_dominance', 0)
  const awards = get('awards', 0)
  const consistency = get('consistency', 0)
  const dynastyRun = get('dynasty_run', 0)
  const highDifficultySuccess = get('high_difficulty_success', 0)
  let stayingPower = get('staying_power', 0)

  if (leagueId && entityType === 'MANAGER') {
    const [seasonResults, hofRow] = await Promise.all([
      prisma.seasonResult.findMany({
        where: { leagueId, rosterId: entityId },
        orderBy: { season: 'desc' },
      }),
      prisma.hallOfFameRow.findUnique({
        where: {
          uniq_hof_league_roster: { leagueId, rosterId: entityId },
        },
      }),
    ])
    if (seasonResults.length > 0) {
      const champs = seasonResults.filter((r) => r.champion).length
      championships = Math.max(championships, Math.min(100, champs * 25))
      const played = seasonResults.length
      stayingPower = Math.max(stayingPower, Math.min(100, played * 6))
      const wins = seasonResults.reduce((a, r) => a + (r.wins ?? 0), 0)
      const total = seasonResults.reduce((a, r) => a + (r.wins ?? 0) + (r.losses ?? 0), 0)
      if (total > 0) winPct = Math.max(winPct, Math.min(100, (wins / total) * 100))
      playoffAppearances = Math.max(playoffAppearances, Math.min(100, played * 8))
      finalsAppearances = Math.max(finalsAppearances, Math.min(100, champs * 30))
    }
    if (hofRow) {
      championships = Math.max(championships, Math.min(100, Number(hofRow.championships) * 25))
      stayingPower = Math.max(stayingPower, Math.min(100, Number(hofRow.seasonsPlayed) * 6))
    }
  }

  return {
    championships,
    playoffAppearances,
    finalsAppearances,
    winPct,
    rivalryDominance,
    awards,
    consistency,
    dynastyRun,
    highDifficultySuccess,
    stayingPower,
  }
}

/**
 * Seed default evidence when none exists (optional; call from engine).
 */
export async function seedDefaultLegacyEvidenceIfEmpty(
  entityType: string,
  entityId: string,
  sport: string
): Promise<void> {
  const count = await prisma.legacyEvidenceRecord.count({
    where: { entityType, entityId, sport },
  })
  if (count > 0) return
  await prisma.legacyEvidenceRecord.createMany({
    data: [
      { entityType, entityId, sport, evidenceType: 'consistency', value: 50, sourceReference: 'default' },
      { entityType, entityId, sport, evidenceType: 'staying_power', value: 20, sourceReference: 'default' },
    ],
  })
}
