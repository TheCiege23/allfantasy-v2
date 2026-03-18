/**
 * CareerProgressionAggregator — aggregates career stats across leagues and seasons for a manager.
 * Uses SeasonResult, Roster, LegacyScoreRecord, ManagerReputationRecord, HallOfFameEntry.
 */

import { prisma } from '@/lib/prisma'
import { getMergedHistoricalSeasonResultsForManager } from '@/lib/season-results/HistoricalSeasonResultService'
import type { ManagerFranchiseProfileInput } from './types'

/**
 * Resolve managerId to roster ids per league (Roster.id where platformUserId = managerId).
 * Then aggregate SeasonResult for those (leagueId, rosterId) pairs.
 */
export async function aggregateCareerForManager(
  managerId: string
): Promise<ManagerFranchiseProfileInput> {
  const rosters = await prisma.roster.findMany({
    where: { platformUserId: managerId },
    select: { id: true, leagueId: true, platformUserId: true, playerData: true },
  })
  const combined = await getMergedHistoricalSeasonResultsForManager({
    managerId,
    rosters,
  })

  const totalCareerSeasons = combined.length
  const leagueIdsSeen = new Set(combined.map((row) => row.leagueId))
  const totalLeaguesPlayed = leagueIdsSeen.size
  let championshipCount = 0
  let playoffAppearances = 0
  let totalWins = 0
  let totalLosses = 0

  for (const row of combined) {
    if (row.champion) championshipCount++
    if (row.madePlayoffs || row.champion) playoffAppearances++
    totalWins += row.wins
    totalLosses += row.losses
  }

  const careerWinPercentage =
    totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0

  const prestigeInput: ManagerFranchiseProfileInput = {
    managerId,
    totalCareerSeasons,
    totalLeaguesPlayed,
    championshipCount,
    playoffAppearances,
    careerWinPercentage,
    gmPrestigeScore: 0,
    franchiseValue: 0,
  }

  const { computeGMPrestigeScore } = await import('./GMPrestigeCalculator')
  const { computeFranchiseValue } = await import('./FranchiseValueResolver')

  prestigeInput.gmPrestigeScore = computeGMPrestigeScore(prestigeInput)
  prestigeInput.franchiseValue = computeFranchiseValue(prestigeInput)

  return prestigeInput
}
