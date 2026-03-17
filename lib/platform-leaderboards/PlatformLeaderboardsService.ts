/**
 * Platform Leaderboards — best draft grades, most championships, highest win %, most active managers.
 */

import { prisma } from '@/lib/prisma'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

export interface LeaderboardEntry {
  rank: number
  managerId: string
  displayName: string | null
  value: number
  extra?: { count?: number; grade?: string }
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  total: number
  generatedAt: string
}

/** Resolve display names for manager IDs (sleeper user id or app user id). */
async function getDisplayNames(managerIds: string[]): Promise<Map<string, string | null>> {
  if (managerIds.length === 0) return new Map()
  const unique = [...new Set(managerIds)]
  const profiles = await prisma.userProfile.findMany({
    where: {
      OR: [
        { userId: { in: unique } },
        { sleeperUserId: { in: unique } },
      ],
    },
    select: { userId: true, sleeperUserId: true, displayName: true },
  })
  const map = new Map<string, string | null>()
  for (const id of unique) {
    const byUserId = profiles.find((p) => p.userId === id)
    const bySleeper = profiles.find((p) => p.sleeperUserId === id)
    const p = byUserId ?? bySleeper
    map.set(id, p?.displayName ?? null)
  }
  return map
}

/**
 * Best draft grades — average draft grade score by manager (via LegacyRoster ownerId).
 * DraftGrade.leagueId = sleeper league id; we join LegacyLeague -> LegacyRoster to get ownerId.
 */
export async function getBestDraftGradesLeaderboard(options: {
  limit?: number
}): Promise<LeaderboardResult> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)

  const grades = await prisma.draftGrade.findMany({
    select: { leagueId: true, rosterId: true, score: true, grade: true },
  })

  const legacyLeagues = await prisma.legacyLeague.findMany({
    where: { sleeperLeagueId: { in: [...new Set(grades.map((g) => g.leagueId))] } },
    select: { id: true, sleeperLeagueId: true },
  })
  const leagueIdBySleeper = new Map(legacyLeagues.map((l) => [l.sleeperLeagueId, l.id]))

  const rosters = await prisma.legacyRoster.findMany({
    where: { leagueId: { in: legacyLeagues.map((l) => l.id) } },
    select: { leagueId: true, rosterId: true, ownerId: true },
  })
  const ownerByKey = new Map(rosters.map((r) => [`${r.leagueId}:${r.rosterId}`, r.ownerId]))

  const byManager = new Map<string, { sum: number; count: number; grades: string[] }>()
  for (const g of grades) {
    const legacyLeagueId = leagueIdBySleeper.get(g.leagueId)
    if (!legacyLeagueId) continue
    const rosterIdNum = parseInt(g.rosterId, 10)
    if (Number.isNaN(rosterIdNum)) continue
    const ownerId = ownerByKey.get(`${legacyLeagueId}:${rosterIdNum}`)
    if (!ownerId) continue
    const score = Number(g.score)
    if (Number.isNaN(score)) continue
    const cur = byManager.get(ownerId) ?? { sum: 0, count: 0, grades: [] }
    cur.sum += score
    cur.count += 1
    if (g.grade) cur.grades.push(g.grade)
    byManager.set(ownerId, cur)
  }

  const rows: { managerId: string; avgScore: number; count: number; latestGrade: string }[] = []
  byManager.forEach((v, managerId) => {
    if (v.count > 0) {
      rows.push({
        managerId,
        avgScore: v.sum / v.count,
        count: v.count,
        latestGrade: v.grades[v.grades.length - 1] ?? '',
      })
    }
  })
  rows.sort((a, b) => b.avgScore - a.avgScore)

  const managerIds = rows.slice(0, limit).map((r) => r.managerId)
  const displayNames = await getDisplayNames(managerIds)

  const entries: LeaderboardEntry[] = rows.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    managerId: r.managerId,
    displayName: displayNames.get(r.managerId) ?? null,
    value: Math.round(r.avgScore * 100) / 100,
    extra: { count: r.count, grade: r.latestGrade || undefined },
  }))

  return {
    entries,
    total: rows.length,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Most championships — from ManagerFranchiseProfile, ordered by championshipCount desc.
 */
export async function getMostChampionshipsLeaderboard(options: {
  limit?: number
}): Promise<LeaderboardResult> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)

  const profiles = await prisma.managerFranchiseProfile.findMany({
    where: { championshipCount: { gt: 0 } },
    orderBy: { championshipCount: 'desc' },
    take: limit,
    select: { managerId: true, championshipCount: true },
  })

  const displayNames = await getDisplayNames(profiles.map((p) => p.managerId))

  const entries: LeaderboardEntry[] = profiles.map((p, i) => ({
    rank: i + 1,
    managerId: p.managerId,
    displayName: displayNames.get(p.managerId) ?? null,
    value: p.championshipCount,
    extra: { count: p.championshipCount },
  }))

  return {
    entries,
    total: await prisma.managerFranchiseProfile.count({ where: { championshipCount: { gt: 0 } } }),
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Highest win % — from ManagerFranchiseProfile, ordered by careerWinPercentage desc.
 */
export async function getHighestWinPctLeaderboard(options: {
  limit?: number
  minGames?: number
}): Promise<LeaderboardResult> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const minLeagues = options.minGames ?? 5

  const profiles = await prisma.managerFranchiseProfile.findMany({
    where: {
      ...(minLeagues > 0 ? { totalLeaguesPlayed: { gte: minLeagues } } : {}),
    },
    orderBy: { careerWinPercentage: 'desc' },
    take: limit * 2,
    select: { managerId: true, careerWinPercentage: true, totalLeaguesPlayed: true },
  })

  const rows = profiles
    .filter((p) => p.careerWinPercentage != null && Number(p.careerWinPercentage) >= 0)
    .slice(0, limit)

  const displayNames = await getDisplayNames(rows.map((p) => p.managerId))

  const entries: LeaderboardEntry[] = rows.map((p, i) => ({
    rank: i + 1,
    managerId: p.managerId,
    displayName: displayNames.get(p.managerId) ?? null,
    value: Math.round(Number(p.careerWinPercentage) * 10000) / 100,
    extra: { count: p.totalLeaguesPlayed ?? 0 },
  }))

  const total = await prisma.managerFranchiseProfile.count()

  return {
    entries,
    total,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Most active managers — from ManagerFranchiseProfile, ordered by totalLeaguesPlayed desc.
 */
export async function getMostActiveLeaderboard(options: {
  limit?: number
}): Promise<LeaderboardResult> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)

  const profiles = await prisma.managerFranchiseProfile.findMany({
    orderBy: { totalLeaguesPlayed: 'desc' },
    take: limit,
    select: { managerId: true, totalLeaguesPlayed: true },
  })

  const displayNames = await getDisplayNames(profiles.map((p) => p.managerId))

  const entries: LeaderboardEntry[] = profiles.map((p, i) => ({
    rank: i + 1,
    managerId: p.managerId,
    displayName: displayNames.get(p.managerId) ?? null,
    value: p.totalLeaguesPlayed ?? 0,
    extra: { count: p.totalLeaguesPlayed ?? 0 },
  }))

  return {
    entries,
    total: await prisma.managerFranchiseProfile.count(),
    generatedAt: new Date().toISOString(),
  }
}
