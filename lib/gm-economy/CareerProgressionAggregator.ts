/**
 * CareerProgressionAggregator — aggregates career stats across leagues and seasons for a manager.
 * Uses SeasonResult, Roster, LegacyScoreRecord, ManagerReputationRecord, HallOfFameEntry.
 */

import { prisma } from '@/lib/prisma'
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
    select: { id: true, leagueId: true },
  })

  const rosterIdsByLeague = new Map<string, string>()
  for (const r of rosters) {
    rosterIdsByLeague.set(r.leagueId, r.id)
  }

  // SeasonResults where rosterId = managerId (when app uses platform user id as rosterId)
  const seasonResultsByManagerId = await prisma.seasonResult.findMany({
    where: { rosterId: managerId },
    select: { leagueId: true, season: true, wins: true, losses: true, champion: true },
  })

  // SeasonResults where (leagueId, rosterId) matches our Roster ids
  const leagueIds = Array.from(rosterIdsByLeague.keys())
  const seasonResultsByRosterId = await prisma.seasonResult.findMany({
    where: {
      leagueId: { in: leagueIds },
      rosterId: { in: Array.from(rosterIdsByLeague.values()) },
    },
    select: { leagueId: true, season: true, wins: true, losses: true, champion: true },
  })

  const combined = new Map<string, { wins: number; losses: number; champion: boolean }>()
  for (const s of seasonResultsByManagerId) {
    const key = `${s.leagueId}:${s.season}`
    if (!combined.has(key)) {
      combined.set(key, {
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        champion: s.champion ?? false,
      })
    } else {
      const ex = combined.get(key)!
      ex.wins += s.wins ?? 0
      ex.losses += s.losses ?? 0
      ex.champion = ex.champion || (s.champion ?? false)
    }
  }
  for (const s of seasonResultsByRosterId) {
    const key = `${s.leagueId}:${s.season}`
    if (!combined.has(key)) {
      combined.set(key, {
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        champion: s.champion ?? false,
      })
    } else {
      const ex = combined.get(key)!
      ex.wins += s.wins ?? 0
      ex.losses += s.losses ?? 0
      ex.champion = ex.champion || (s.champion ?? false)
    }
  }

  const totalCareerSeasons = combined.size
  const leagueIdsSeen = new Set(combined.keys().map((k) => k.split(':')[0]))
  const totalLeaguesPlayed = leagueIdsSeen.size
  let championshipCount = 0
  let playoffAppearances = 0
  let totalWins = 0
  let totalLosses = 0

  for (const [, v] of combined) {
    if (v.champion) championshipCount++
    if (v.wins + v.losses > 0) playoffAppearances++ // treat any completed season as "appearance" for simplicity
    totalWins += v.wins
    totalLosses += v.losses
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
