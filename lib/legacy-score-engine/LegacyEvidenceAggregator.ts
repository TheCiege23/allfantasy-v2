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

const clamp0to100 = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function asKey(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function toSeasonNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}

function longestConsecutiveStreak(seasons: number[]): number {
  const sorted = [...new Set(seasons)].sort((a, b) => a - b)
  let best = 0
  let current = 0
  let prev = Number.NaN
  for (const season of sorted) {
    if (season === prev + 1) current += 1
    else current = 1
    prev = season
    best = Math.max(best, current)
  }
  return best
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, row) => sum + row, 0) / values.length
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
  const type = String(entityType ?? '').toUpperCase()
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

  const get = (evidenceType: LegacyEvidenceType, defaultVal: number) => {
    const v = sums[evidenceType]
    if (v == null) return defaultVal
    const c = counts[evidenceType] ?? 0
    return c > 0 ? clamp0to100(v / c) : defaultVal
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

  if (leagueId) {
    const league = await prisma.league
      .findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          leagueSize: true,
          isDynasty: true,
          settings: true,
          rosters: {
            select: {
              id: true,
              platformUserId: true,
            },
          },
          teams: {
            select: {
              id: true,
              externalId: true,
              ownerName: true,
              teamName: true,
              wins: true,
              losses: true,
              currentRank: true,
            },
          },
        },
      })
      .catch(() => null)
    if (league) {
      const normalized = asKey(entityId)
      const matchedRoster = league.rosters.find(
        (row) => asKey(row.id) === normalized || asKey(row.platformUserId) === normalized
      )
      const matchedTeam = league.teams.find(
        (row) =>
          asKey(row.id) === normalized ||
          asKey(row.externalId) === normalized ||
          asKey(row.ownerName) === normalized ||
          asKey(row.teamName) === normalized
      )

      const aliases = new Set<string>(
        [
          entityId,
          matchedRoster?.id,
          matchedRoster?.platformUserId,
          matchedTeam?.id,
          matchedTeam?.externalId,
          matchedTeam?.ownerName,
          matchedTeam?.teamName,
        ]
          .map((row) => String(row ?? '').trim())
          .filter(Boolean)
      )

      if (type === 'MANAGER') {
        const aliasValues = [...aliases]
        const [seasonResults, hofRows, awardsRows, rivalryRows, hallEntries] = await Promise.all([
          prisma.seasonResult
            .findMany({
              where: {
                leagueId,
                ...(aliasValues.length > 0 ? { rosterId: { in: aliasValues } } : {}),
              },
              orderBy: { season: 'desc' },
            })
            .catch(() => []),
          prisma.hallOfFameRow
            .findMany({
              where: {
                leagueId,
                ...(aliasValues.length > 0 ? { rosterId: { in: aliasValues } } : {}),
              },
            })
            .catch(() => []),
          prisma.awardRecord
            .findMany({
              where: {
                leagueId,
                sport,
                ...(aliasValues.length > 0 ? { managerId: { in: aliasValues } } : {}),
              },
            })
            .catch(() => []),
          prisma.rivalryRecord
            .findMany({
              where: {
                leagueId,
                sport,
                ...(aliasValues.length > 0
                  ? {
                      OR: [
                        { managerAId: { in: aliasValues } },
                        { managerBId: { in: aliasValues } },
                      ],
                    }
                  : {}),
              },
            })
            .catch(() => []),
          prisma.hallOfFameEntry
            .findMany({
              where: {
                leagueId,
                sport,
                entityType: 'MANAGER',
                ...(aliasValues.length > 0 ? { entityId: { in: aliasValues } } : {}),
              },
              select: { category: true, score: true },
              take: 200,
            })
            .catch(() => []),
        ])

        const played = seasonResults.length
        const champs = seasonResults.filter((r) => r.champion).length
        const wins = seasonResults.reduce((sum, row) => sum + (row.wins ?? 0), 0)
        const totalGames = seasonResults.reduce(
          (sum, row) => sum + (row.wins ?? 0) + (row.losses ?? 0),
          0
        )
        const winPctDerived = totalGames > 0 ? (wins / totalGames) * 100 : 0
        const seasonWinPctValues = seasonResults
          .map((row) => {
            const w = row.wins ?? 0
            const l = row.losses ?? 0
            return w + l > 0 ? (w / (w + l)) * 100 : null
          })
          .filter((row): row is number => typeof row === 'number')
        const playoffProxyCount = seasonWinPctValues.filter((row) => row >= 55).length + champs
        const finalsProxyCount = seasonWinPctValues.filter((row) => row >= 68).length + champs
        const champStreak = longestConsecutiveStreak(
          seasonResults
            .filter((row) => row.champion)
            .map((row) => toSeasonNumber(row.season))
            .filter((row) => row > 0)
        )
        const rivalryScoreAvg = average(rivalryRows.map((row) => row.rivalryScore ?? 0))
        const awardsCount = awardsRows.length
        const awardsAvgScore = average(awardsRows.map((row) => Number(row.score ?? 0)))
        const hallOfFameBoost = average(hallEntries.map((row) => Number(row.score ?? 0) * 100))

        const leagueSettings = asObject(league.settings)
        const competitiveModeBoost = (() => {
          const size = typeof league.leagueSize === "number" ? league.leagueSize : 0
          const base = league.isDynasty ? 0.15 : 0
          const sizeBoost = size >= 16 ? 0.18 : size >= 14 ? 0.14 : size >= 12 ? 0.09 : 0
          const tournamentBoost = leagueSettings.tournamentMode === true ? 0.08 : 0
          return 1 + base + sizeBoost + tournamentBoost
        })()

        championships = Math.max(
          championships,
          clamp0to100(champs * 25),
          ...hofRows.map((row) => clamp0to100(Number(row.championships ?? 0) * 25)),
          hallOfFameBoost * 0.4
        )
        playoffAppearances = Math.max(playoffAppearances, clamp0to100(playoffProxyCount * 14))
        finalsAppearances = Math.max(finalsAppearances, clamp0to100(finalsProxyCount * 16))
        winPct = Math.max(winPct, clamp0to100(winPctDerived))
        stayingPower = Math.max(
          stayingPower,
          clamp0to100(played * 8),
          ...hofRows.map((row) => clamp0to100(Number(row.seasonsPlayed ?? 0) * 7))
        )
        const consistencyDerived = clamp0to100(average(seasonWinPctValues) * 0.7 + played * 3)
        const rivalryDerived = clamp0to100(rivalryScoreAvg)
        const awardsDerived = clamp0to100(awardsCount * 12 + awardsAvgScore * 0.3)
        const dynastyDerived = clamp0to100(champStreak * 28 + (champs >= 3 ? 12 : 0))
        const difficultyDerived = clamp0to100(
          (champs * 18 + winPctDerived * 0.35 + playoffProxyCount * 6) * competitiveModeBoost
        )

        return {
          championships,
          playoffAppearances,
          finalsAppearances,
          winPct,
          rivalryDominance: Math.max(rivalryDominance, rivalryDerived),
          awards: Math.max(awards, awardsDerived),
          consistency: Math.max(consistency, consistencyDerived),
          dynastyRun: Math.max(dynastyRun, dynastyDerived),
          highDifficultySuccess: Math.max(highDifficultySuccess, difficultyDerived),
          stayingPower,
        }
      }

      if (type === 'TEAM' || type === 'FRANCHISE') {
        const aliasValues = [...aliases]
        const [seasonResults, standingFacts, hallEntries, rivalryRows] = await Promise.all([
          prisma.seasonResult
            .findMany({
              where: {
                leagueId,
                ...(aliasValues.length > 0 ? { rosterId: { in: aliasValues } } : {}),
              },
            })
            .catch(() => []),
          prisma.seasonStandingFact
            .findMany({
              where: {
                leagueId,
                sport,
                ...(aliasValues.length > 0 ? { teamId: { in: aliasValues } } : {}),
              },
            })
            .catch(() => []),
          prisma.hallOfFameEntry
            .findMany({
              where: {
                leagueId,
                sport,
                entityType: 'TEAM',
                ...(aliasValues.length > 0 ? { entityId: { in: aliasValues } } : {}),
              },
              select: { category: true, score: true },
              take: 200,
            })
            .catch(() => []),
          prisma.rivalryRecord
            .findMany({
              where: {
                leagueId,
                sport,
                ...(matchedTeam?.ownerName
                  ? {
                      OR: [
                        { managerAId: matchedTeam.ownerName },
                        { managerBId: matchedTeam.ownerName },
                      ],
                    }
                  : {}),
              },
            })
            .catch(() => []),
        ])

        const standingSeasonMap = new Map<number, { wins: number; losses: number; rank: number }>()
        for (const row of standingFacts) {
          const season = toSeasonNumber(row.season)
          if (!season) continue
          const current = standingSeasonMap.get(season) ?? { wins: 0, losses: 0, rank: 999 }
          current.wins += row.wins ?? 0
          current.losses += row.losses ?? 0
          current.rank = Math.min(current.rank, row.rank ?? 999)
          standingSeasonMap.set(season, current)
        }

        const standings = [...standingSeasonMap.entries()].map(([season, row]) => ({
          season,
          ...row,
        }))
        const played = standings.length || seasonResults.length
        const champs = seasonResults.filter((row) => row.champion).length
        const totalWins = standings.reduce((sum, row) => sum + row.wins, 0)
        const totalGames = standings.reduce((sum, row) => sum + row.wins + row.losses, 0)
        const winPctDerived = totalGames > 0 ? (totalWins / totalGames) * 100 : 0
        const teamCount = typeof league.leagueSize === 'number' && league.leagueSize > 0 ? league.leagueSize : 12
        const playoffRankCutoff = Math.max(2, Math.ceil(teamCount * 0.45))
        const playoffProxyCount =
          standings.filter((row) => row.rank <= playoffRankCutoff).length + champs
        const finalsProxyCount = standings.filter((row) => row.rank <= 2).length + champs
        const champStreak = longestConsecutiveStreak(
          seasonResults
            .filter((row) => row.champion)
            .map((row) => toSeasonNumber(row.season))
            .filter((row) => row > 0)
        )
        const rivalryDerived = clamp0to100(average(rivalryRows.map((row) => row.rivalryScore ?? 0)))
        const hallOfFameBoost = clamp0to100(average(hallEntries.map((row) => Number(row.score ?? 0) * 100)))
        const consistencyDerived = clamp0to100(
          standings.length > 0
            ? average(
                standings.map((row) => {
                  const total = row.wins + row.losses
                  return total > 0 ? (row.wins / total) * 100 : 0
                })
              ) *
                0.75 +
                played * 2.5
            : played * 4
        )
        const awardsDerived = clamp0to100(hallEntries.length * 10)
        const dynastyDerived = clamp0to100(champStreak * 30 + (champs >= 3 ? 10 : 0))

        return {
          championships: Math.max(championships, clamp0to100(champs * 25), hallOfFameBoost * 0.5),
          playoffAppearances: Math.max(playoffAppearances, clamp0to100(playoffProxyCount * 14)),
          finalsAppearances: Math.max(finalsAppearances, clamp0to100(finalsProxyCount * 16)),
          winPct: Math.max(winPct, clamp0to100(winPctDerived)),
          rivalryDominance: Math.max(rivalryDominance, rivalryDerived),
          awards: Math.max(awards, awardsDerived),
          consistency: Math.max(consistency, consistencyDerived),
          dynastyRun: Math.max(dynastyRun, dynastyDerived),
          highDifficultySuccess: Math.max(
            highDifficultySuccess,
            clamp0to100(champs * 15 + winPctDerived * 0.3 + playoffProxyCount * 7)
          ),
          stayingPower: Math.max(stayingPower, clamp0to100(played * 8)),
        }
      }
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
