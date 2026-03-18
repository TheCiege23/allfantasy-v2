/**
 * CareerProgressionAggregator — aggregates career stats across leagues and seasons for a manager.
 * Uses SeasonResult, Roster, LegacyScoreRecord, ManagerReputationRecord, HallOfFameEntry.
 */

import { prisma } from '@/lib/prisma'
import {
  buildLeagueScopedRosterIdFilters,
  mergeSeasonResultAliases,
  resolveSeasonResultRosterIds,
} from '@/lib/season-results/SeasonResultRosterIdentity'
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
    select: { id: true, leagueId: true, playerData: true },
  })

  const seasonResultRosterIds = resolveSeasonResultRosterIds(rosters)
  const seasonResultFilters = buildLeagueScopedRosterIdFilters(seasonResultRosterIds)

  // SeasonResults where rosterId = managerId (when app uses platform user id as rosterId)
  const seasonResultsByManagerId = await prisma.seasonResult.findMany({
    where: { rosterId: managerId },
    select: { leagueId: true, season: true, wins: true, losses: true, champion: true },
  })

  // SeasonResults where (leagueId, rosterId) matches either internal Roster ids
  // or imported provider roster ids like Sleeper source_team_id.
  const seasonResultsByRosterId =
    seasonResultFilters.length > 0
      ? await prisma.seasonResult.findMany({
          where: {
            OR: seasonResultFilters,
          },
          select: { leagueId: true, season: true, wins: true, losses: true, champion: true },
        })
      : []

  const combined = mergeSeasonResultAliases([
    ...seasonResultsByManagerId,
    ...seasonResultsByRosterId,
  ])

  const totalCareerSeasons = combined.length
  const leagueIdsSeen = new Set(combined.map((row) => row.leagueId))
  const totalLeaguesPlayed = leagueIdsSeen.size
  let championshipCount = 0
  let playoffAppearances = 0
  let totalWins = 0
  let totalLosses = 0

  for (const row of combined) {
    if (row.champion) championshipCount++
    if (row.wins + row.losses > 0) playoffAppearances++ // treat any completed season as "appearance" for simplicity
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
