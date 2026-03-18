/**
 * Zombie universe projection: who moves up/down (PROMPT 353). Deterministic rank calculations.
 */

import { getUniverseStandings } from './ZombieUniverseStandingsService'
import { getMovementProjections, upsertMovementProjection } from './ZombieMovementEngine'
import { prisma } from '@/lib/prisma'

export async function refreshMovementProjections(universeId: string, season?: number): Promise<void> {
  const standings = await getUniverseStandings(universeId, season)
  const levels = await prisma.zombieUniverseLevel.findMany({
    where: { universeId },
    orderBy: { rankOrder: 'asc' },
  })
  const levelIds = levels.map((l) => l.id)
  const byLevel = new Map<string, typeof standings>()
  for (const s of standings) {
    const list = byLevel.get(s.levelId) ?? []
    list.push(s)
    byLevel.set(s.levelId, list)
  }

  const se = season ?? new Date().getFullYear()
  for (const row of standings) {
    const list = byLevel.get(row.levelId) ?? []
    const sorted = [...list].sort((a, b) => b.totalPoints - a.totalPoints)
    const rank = sorted.findIndex((r) => r.rosterId === row.rosterId) + 1
    const levelIndex = levels.findIndex((l) => l.id === row.levelId)
    const promoteLevel = levelIndex < levels.length - 1 ? levels[levelIndex + 1]?.id : null
    const relegateLevel = levelIndex > 0 ? levels[levelIndex - 1]?.id : null
    const promoteCount = 1
    const relegateCount = 1
    const inPromoteZone = promoteLevel && rank <= promoteCount
    const inRelegateZone = relegateLevel && rank > sorted.length - relegateCount
    let projectedLevelId: string | null = row.levelId
    let reason: string | null = null
    if (inPromoteZone) {
      projectedLevelId = promoteLevel
      reason = 'promotion'
    } else if (inRelegateZone) {
      projectedLevelId = relegateLevel
      reason = 'relegation'
    } else {
      reason = 'watch'
    }
    await upsertMovementProjection(universeId, row.rosterId, row.leagueId, {
      currentLevelId: row.levelId,
      projectedLevelId,
      reason,
      season: se,
    })
  }
}

export async function getMovementOutlook(universeId: string, season?: number) {
  return getMovementProjections(universeId, season)
}
