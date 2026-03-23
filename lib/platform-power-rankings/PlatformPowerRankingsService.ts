/**
 * Platform Power Rankings — cross-league power score from legacy, XP, championship history, win %.
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { PlatformPowerRow, PlatformPowerLeaderboardResult, PlatformPowerOptions } from './types'

/** Weight for composite power score: legacy, XP, championships, win% (sum to 1). */
const WEIGHT_LEGACY = 0.30
const WEIGHT_XP = 0.25
const WEIGHT_CHAMPIONSHIPS = 0.25
const WEIGHT_WIN_PCT = 0.20

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/** Normalize legacy (0–100) to 0–1. */
function normLegacy(v: number | null): number {
  if (v == null || Number.isNaN(v)) return 0
  return Math.max(0, Math.min(1, Number(v) / 100))
}

/** Normalize XP to 0–1 (cap at 5000 XP = 1). */
function normXP(v: number): number {
  return Math.max(0, Math.min(1, Number(v) / 5000))
}

/** Normalize championships (cap at 10 = 1). */
function normChamps(v: number): number {
  return Math.max(0, Math.min(1, Number(v) / 10))
}

/** Win percentage already 0–100. */
function normWinPct(v: number | null): number {
  if (v == null || Number.isNaN(v)) return 0
  return Math.max(0, Math.min(1, Number(v) / 100))
}

function normalizeLimit(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.floor(n), 1), MAX_LIMIT)
}

function normalizeOffset(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

async function getDisplayNames(managerIds: string[]): Promise<Map<string, string | null>> {
  if (managerIds.length === 0) return new Map()
  const unique = [...new Set(managerIds)]
  const [profiles, appUsers] = await Promise.all([
    prisma.userProfile.findMany({
      where: {
        OR: [{ userId: { in: unique } }, { sleeperUserId: { in: unique } }],
      },
      select: { userId: true, sleeperUserId: true, displayName: true },
    }),
    prisma.appUser.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true, username: true },
    }),
  ])
  const map = new Map<string, string | null>()
  for (const id of unique) {
    const byProfile = profiles.find((p) => p.userId === id || p.sleeperUserId === id)
    const byApp = appUsers.find((u) => u.id === id)
    const name = byProfile?.displayName ?? (byApp ? byApp.displayName ?? byApp.username : null)
    map.set(id, name ?? null)
  }
  return map
}

/**
 * Build cross-league power rankings: aggregate legacy (by entityId), XP, GM profile (championships, win%).
 */
export async function getPlatformPowerLeaderboard(
  options: PlatformPowerOptions = {}
): Promise<PlatformPowerLeaderboardResult> {
  const sport = options.sport ? normalizeToSupportedSport(options.sport) : null
  const limit = normalizeLimit(options.limit)
  const offset = normalizeOffset(options.offset)

  const legacyWhere: Record<string, unknown> = { entityType: 'MANAGER' }
  if (sport) legacyWhere.sport = sport

  const [legacyRecords, gmProfiles, xpProfiles] = await Promise.all([
    prisma.legacyScoreRecord.findMany({
      where: legacyWhere,
      select: { entityId: true, overallLegacyScore: true },
    }),
    prisma.managerFranchiseProfile.findMany({
      select: {
        managerId: true,
        championshipCount: true,
        careerWinPercentage: true,
        totalLeaguesPlayed: true,
      },
    }),
    prisma.managerXPProfile.findMany({
      select: { managerId: true, totalXP: true },
    }),
  ])

  const managerIds = new Set<string>()
  gmProfiles.forEach((p) => managerIds.add(p.managerId))
  xpProfiles.forEach((p) => managerIds.add(p.managerId))
  legacyRecords.forEach((r) => managerIds.add(r.entityId))

  const legacyByManager = new Map<string, { sum: number; count: number }>()
  for (const r of legacyRecords) {
    const score = Number(r.overallLegacyScore)
    if (!Number.isNaN(score)) {
      const cur = legacyByManager.get(r.entityId) ?? { sum: 0, count: 0 }
      cur.sum += score
      cur.count += 1
      legacyByManager.set(r.entityId, cur)
    }
  }

  const gmByManager = new Map(
    gmProfiles.map((p) => [
      p.managerId,
      {
        championshipCount: p.championshipCount,
        careerWinPercentage: p.careerWinPercentage != null ? Number(p.careerWinPercentage) : null,
        totalLeaguesPlayed: p.totalLeaguesPlayed ?? 0,
      },
    ])
  )
  const xpByManager = new Map(xpProfiles.map((p) => [p.managerId, p.totalXP ?? 0]))

  const rows: PlatformPowerRow[] = []
  for (const managerId of managerIds) {
    const gm = gmByManager.get(managerId)
    const xp = xpByManager.get(managerId) ?? 0
    const legAgg = legacyByManager.get(managerId)
    const legacyScore =
      legAgg && legAgg.count > 0 ? legAgg.sum / legAgg.count : null
    const championshipCount = gm?.championshipCount ?? 0
    const winPercentage = gm?.careerWinPercentage ?? null
    const totalLeaguesPlayed = gm?.totalLeaguesPlayed ?? 0

    const powerScore =
      WEIGHT_LEGACY * normLegacy(legacyScore) +
      WEIGHT_XP * normXP(xp) +
      WEIGHT_CHAMPIONSHIPS * normChamps(championshipCount) +
      WEIGHT_WIN_PCT * normWinPct(winPercentage)

    rows.push({
      managerId,
      rank: 0,
      powerScore: Math.round(powerScore * 1000) / 1000,
      legacyScore: legacyScore != null ? Math.round(legacyScore * 100) / 100 : null,
      totalXP: xp,
      championshipCount,
      winPercentage: winPercentage != null ? Math.round(winPercentage * 100) / 100 : null,
      totalLeaguesPlayed,
    })
  }

  rows.sort((a, b) => b.powerScore - a.powerScore)
  rows.forEach((r, i) => {
    r.rank = i + 1
  })

  const displayNames = await getDisplayNames(rows.map((r) => r.managerId))
  for (const row of rows) {
    row.displayName = displayNames.get(row.managerId) ?? null
  }

  const total = rows.length
  const paged = rows.slice(offset, offset + limit)

  return {
    rows: paged,
    total,
    generatedAt: new Date().toISOString(),
  }
}
