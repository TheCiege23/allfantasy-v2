/**
 * Merge `PlayerAnalyticsSnapshot` (default) with Rolling Insights season stats when identity + freshness rules pass.
 * Single resolved analytics object per player for draft pool rows — no silent field-by-field mixing.
 */

import { prisma } from '@/lib/prisma'
import { looksLikeSleeperExternalId } from '@/lib/draft-sports-models/player-asset-resolver'

/** RI must be at least this many ms newer than snapshot.updatedAt to replace PPG (default 60s). */
export const RI_MIN_LEAD_OVER_SNAPSHOT_MS = Number(
  process.env.DRAFT_RI_MIN_LEAD_MS ?? 60_000,
)

/** Minimum games played on RI row before FPPG can replace snapshot (default 1). */
export const RI_MIN_GAMES_PLAYED = Number(process.env.DRAFT_RI_MIN_GAMES ?? 1)

export type SnapshotAnalyticsSlice = {
  fantasyPointsPerGame: number | null
  lifetimeValue: number | null
  updatedAt: Date | null
}

export type RollingInsightsSeasonSlice = {
  fantasyPointsPerGame: number | null
  fantasyPointsSeason: number | null
  gamesPlayed: number | null
  season: string | null
  updatedAt: Date
}

export type ResolvedNflDraftPoolAnalytics = {
  fantasyPointsPerGame: number | null
  lifetimeValue: number | null
  primarySource: 'snapshot' | 'rolling_insights'
  /** When RI did not win override, optional RI numbers for UI/debug (supplemental only). */
  rollingInsightsSupplemental?: {
    fantasyPointsPerGame?: number | null
    gamesPlayed?: number | null
    season?: string | null
  }
}

/** Default NFL season key for stats rows (e.g. training camp through draft). */
export function defaultNflPlayerStatsSeason(): string {
  const y = new Date()
  const yy = y.getFullYear()
  const m = y.getMonth()
  return m >= 6 ? String(yy) : String(yy - 1)
}

function seasonAllowedForStatsOverride(
  riSeason: string | null,
  currentStatsSeason: string,
): boolean {
  if (!riSeason) return false
  const prev = String(Number(currentStatsSeason) - 1)
  return riSeason === currentStatsSeason || riSeason === prev
}

/**
 * Resolve one player’s displayed PPG/LTV for the draft pool.
 * LTV stays on snapshot unless a future RI metric is wired; not mixed from RI in v1.
 */
export function resolveNflDraftPoolAnalytics(params: {
  snapshot: SnapshotAnalyticsSlice | null
  rollingInsights: RollingInsightsSeasonSlice | null
  identityMatchConfidence: 'high' | 'none'
  currentStatsSeason: string
}): ResolvedNflDraftPoolAnalytics {
  const fppgSnap = params.snapshot?.fantasyPointsPerGame ?? null
  const ltv = params.snapshot?.lifetimeValue ?? null
  const snapAt = params.snapshot?.updatedAt?.getTime() ?? 0

  const ri = params.rollingInsights
  if (!ri || params.identityMatchConfidence !== 'high') {
    if (ri && params.identityMatchConfidence === 'none') {
      return {
        fantasyPointsPerGame: fppgSnap,
        lifetimeValue: ltv,
        primarySource: 'snapshot',
        rollingInsightsSupplemental:
          ri.fantasyPointsPerGame != null
            ? {
                fantasyPointsPerGame: ri.fantasyPointsPerGame,
                gamesPlayed: ri.gamesPlayed,
                season: ri.season,
              }
            : undefined,
      }
    }
    return {
      fantasyPointsPerGame: fppgSnap,
      lifetimeValue: ltv,
      primarySource: 'snapshot',
    }
  }

  const riFppg = ri.fantasyPointsPerGame
  const gamesOk = (ri.gamesPlayed ?? 0) >= RI_MIN_GAMES_PLAYED
  const riFppgOk = riFppg != null && Number.isFinite(Number(riFppg))
  const seasonOk = seasonAllowedForStatsOverride(ri.season, params.currentStatsSeason)
  const riNewer = params.snapshot
    ? ri.updatedAt.getTime() >= snapAt + RI_MIN_LEAD_OVER_SNAPSHOT_MS
    : true

  const supplemental =
    riFppgOk || ri.gamesPlayed != null
      ? {
          fantasyPointsPerGame: riFppgOk ? riFppg : null,
          gamesPlayed: ri.gamesPlayed,
          season: ri.season,
        }
      : undefined

  if (riNewer && gamesOk && riFppgOk && seasonOk) {
    return {
      fantasyPointsPerGame: Number(riFppg),
      lifetimeValue: ltv,
      primarySource: 'rolling_insights',
      rollingInsightsSupplemental: supplemental,
    }
  }

  return {
    fantasyPointsPerGame: fppgSnap,
    lifetimeValue: ltv,
    primarySource: 'snapshot',
    rollingInsightsSupplemental: supplemental,
  }
}

export type DraftPoolRiLookupKey = string

export type RollingInsightsDraftIdentity = {
  rollingInsightsPlayerId: string
  confidence: 'high'
}

/**
 * Batch-load Rolling Insights season rows for NFL draft pool rows (identity via PlayerIdentityMap).
 */
export async function loadRollingInsightsSeasonByDraftPoolKey(options: {
  rows: Array<{
    nk: string
    pk: string
    sleeperCandidate: string | null
  }>
}): Promise<{
  identityByPoolKey: Map<DraftPoolRiLookupKey, RollingInsightsDraftIdentity>
  riSeasonByPlayerId: Map<string, RollingInsightsSeasonSlice>
}> {
  const sport = 'NFL'
  const identityByPoolKey = new Map<DraftPoolRiLookupKey, RollingInsightsDraftIdentity>()

  const sleeperIds = [
    ...new Set(
      options.rows
        .map((r) => r.sleeperCandidate)
        .filter((id): id is string => Boolean(id && looksLikeSleeperExternalId(id))),
    ),
  ]

  const nkSet = [...new Set(options.rows.map((r) => r.nk).filter(Boolean))]

  const [bySleeper, byName] = await Promise.all([
    sleeperIds.length
      ? prisma.playerIdentityMap.findMany({
          where: { sport, sleeperId: { in: sleeperIds }, rollingInsightsId: { not: null } },
          select: { sleeperId: true, rollingInsightsId: true },
        })
      : [],
    nkSet.length
      ? prisma.playerIdentityMap.findMany({
          where: { sport, normalizedName: { in: nkSet }, rollingInsightsId: { not: null } },
          select: {
            normalizedName: true,
            position: true,
            rollingInsightsId: true,
          },
        })
      : [],
  ])

  const sleeperToRi = new Map<string, string>()
  for (const m of bySleeper) {
    if (m.sleeperId && m.rollingInsightsId) sleeperToRi.set(m.sleeperId, m.rollingInsightsId)
  }

  const namePosToRi = new Map<string, string>()
  for (const m of byName) {
    const nk = (m.normalizedName ?? '').trim().toLowerCase()
    const pk = (m.position ?? '').trim().toUpperCase()
    if (nk && pk && m.rollingInsightsId) namePosToRi.set(`${nk}|${pk}`, m.rollingInsightsId)
  }

  for (const r of options.rows) {
    const key = `${r.nk}|${r.pk}`
    let riId: string | null = null
    if (r.sleeperCandidate && looksLikeSleeperExternalId(r.sleeperCandidate)) {
      riId = sleeperToRi.get(r.sleeperCandidate) ?? null
    }
    if (!riId) {
      riId = namePosToRi.get(`${r.nk}|${r.pk}`) ?? null
    }
    if (riId) {
      identityByPoolKey.set(key, { rollingInsightsPlayerId: riId, confidence: 'high' })
    }
  }

  const riPlayerIds = [...new Set([...identityByPoolKey.values()].map((v) => v.rollingInsightsPlayerId))]
  const riSeasonByPlayerId = new Map<string, RollingInsightsSeasonSlice>()

  if (riPlayerIds.length === 0) {
    return { identityByPoolKey, riSeasonByPlayerId }
  }

  const statsRows = await prisma.playerSeasonStats.findMany({
    where: {
      sport,
      source: 'rolling_insights',
      seasonType: 'regular',
      playerId: { in: riPlayerIds },
    },
    select: {
      playerId: true,
      season: true,
      fantasyPointsPerGame: true,
      fantasyPoints: true,
      gamesPlayed: true,
      updatedAt: true,
    },
  })

  const sorted = [...statsRows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  for (const row of sorted) {
    if (riSeasonByPlayerId.has(row.playerId)) continue
    riSeasonByPlayerId.set(row.playerId, {
      fantasyPointsPerGame: row.fantasyPointsPerGame ?? null,
      fantasyPointsSeason: row.fantasyPoints ?? null,
      gamesPlayed: row.gamesPlayed ?? null,
      season: row.season ?? null,
      updatedAt: row.updatedAt,
    })
  }

  return { identityByPoolKey, riSeasonByPlayerId }
}
