/**
 * League Ranking System (PROMPT 220).
 * Ranks leagues by activity and quality; outputs a league popularity score.
 * Metrics: league activity, chat activity, trade/transaction frequency, draft participation, manager retention.
 */

import type { LeagueSport } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type {
  LeagueRankingMetrics,
  LeaguePopularityScore,
  RankedLeague,
} from "./types"

/** Weights for composite popularity score (sum = 1). */
const WEIGHTS = {
  chatActivity: 0.2,
  transactionActivity: 0.2,
  draftParticipation: 0.25,
  managerRetention: 0.2,
  recency: 0.15,
} as const

/** Normalize a value to 0–1 using a soft cap (log-style). */
function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0
  if (value <= 0) return 0
  return Math.min(1, value / cap)
}

/** Recency score: 1 at now, decays over days (e.g. 30-day half-life). */
function recencyScore(lastAt: Date | null, halfLifeDays: number = 30): number {
  if (!lastAt) return 0
  const now = Date.now()
  const elapsed = (now - lastAt.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.exp(-(elapsed * Math.LN2) / halfLifeDays))
}

/**
 * Load raw metrics for a set of leagues (or all leagues).
 * Uses Prisma aggregates and optional date window for "recent" activity.
 */
export async function getLeagueMetrics(
  options: { leagueIds?: string[]; recentDays?: number } = {}
): Promise<Map<string, LeagueRankingMetrics>> {
  const { leagueIds, recentDays } = options
  const whereLeague = leagueIds && leagueIds.length > 0 ? { id: { in: leagueIds } } : {}

  const leagues = await prisma.league.findMany({
    where: whereLeague,
    select: {
      id: true,
      name: true,
      sport: true,
      leagueSize: true,
      updatedAt: true,
      lastSyncedAt: true,
      _count: {
        select: {
          chatMessages: true,
          waiverTransactions: true,
          rosters: true,
        },
      },
    },
  })

  const leagueIdList = leagues.map((l) => l.id)
  if (leagueIdList.length === 0) return new Map()

  const since = recentDays
    ? new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
    : undefined

  const [chatCounts, transactionCounts, draftData] = await Promise.all([
    prisma.leagueChatMessage.groupBy({
      by: ["leagueId"],
      where: {
        leagueId: { in: leagueIdList },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _count: { id: true },
    }),
    prisma.waiverTransaction.groupBy({
      by: ["leagueId"],
      where: {
        leagueId: { in: leagueIdList },
        ...(since ? { processedAt: { gte: since } } : {}),
      },
      _count: { id: true },
    }),
    prisma.draftSession.findMany({
      where: { leagueId: { in: leagueIdList } },
      select: {
        leagueId: true,
        status: true,
        updatedAt: true,
        _count: { select: { picks: true } },
      },
    }),
  ])

  const chatByLeague = new Map(chatCounts.map((c) => [c.leagueId, c._count.id]))
  const txByLeague = new Map(transactionCounts.map((t) => [t.leagueId, t._count.id]))
  const draftByLeague = new Map<
    string,
    { hasCompletedDraft: boolean; pickCount: number; lastAt: Date | null }
  >()
  for (const d of draftData) {
    const existing = draftByLeague.get(d.leagueId)
    const hasCompleted = d.status === "completed" || (existing?.hasCompletedDraft ?? false)
    const pickCount = (existing?.pickCount ?? 0) + d._count.picks
    const lastAt =
      d.updatedAt && (!existing?.lastAt || d.updatedAt > existing.lastAt)
        ? d.updatedAt
        : existing?.lastAt ?? null
    draftByLeague.set(d.leagueId, {
      hasCompletedDraft: hasCompleted,
      pickCount,
      lastAt,
    })
  }

  const [lastChatByLeague, lastTxByLeague] = await Promise.all([
    prisma.leagueChatMessage.groupBy({
      by: ["leagueId"],
      where: { leagueId: { in: leagueIdList } },
      _max: { createdAt: true },
    }),
    prisma.waiverTransaction.groupBy({
      by: ["leagueId"],
      where: { leagueId: { in: leagueIdList } },
      _max: { processedAt: true },
    }),
  ])
  const lastChatMap = new Map(lastChatByLeague.map((x) => [x.leagueId, x._max.createdAt]))
  const lastTxMap = new Map(lastTxByLeague.map((x) => [x.leagueId, x._max.processedAt]))

  const result = new Map<string, LeagueRankingMetrics>()
  for (const l of leagues) {
    const draft = draftByLeague.get(l.id)
    const lastActivityCandidates = [
      l.lastSyncedAt,
      l.updatedAt,
      lastChatMap.get(l.id) ?? null,
      lastTxMap.get(l.id) ?? null,
      draft?.lastAt ?? null,
    ].filter((d): d is Date => d != null)
    const lastActivityAt =
      lastActivityCandidates.length > 0
        ? new Date(Math.max(...lastActivityCandidates.map((d) => d.getTime())))
        : null

    result.set(l.id, {
      chatMessageCount: chatByLeague.get(l.id) ?? 0,
      transactionCount: txByLeague.get(l.id) ?? 0,
      draftParticipation: {
        hasCompletedDraft: draft?.hasCompletedDraft ?? false,
        pickCount: draft?.pickCount ?? 0,
      },
      managerCount: l._count.rosters,
      leagueSize: l.leagueSize,
      lastActivityAt,
    })
  }
  return result
}

/**
 * Compute popularity score from metrics.
 * Components are normalized 0–1; composite is 0–100.
 */
export function computePopularityScore(metrics: LeagueRankingMetrics): LeaguePopularityScore {
  const chatActivity = normalize(metrics.chatMessageCount, 500)
  const transactionActivity = normalize(metrics.transactionCount, 200)
  const draftParticipation = metrics.draftParticipation.hasCompletedDraft
    ? Math.min(1, 0.5 + normalize(metrics.draftParticipation.pickCount, 200))
    : 0
  const size = metrics.leagueSize ?? 12
  const retention =
    size > 0 ? Math.min(1, metrics.managerCount / size) : (metrics.managerCount > 0 ? 1 : 0)
  const recency = recencyScore(metrics.lastActivityAt)

  const components = {
    chatActivity,
    transactionActivity,
    draftParticipation,
    managerRetention: retention,
    recency,
  }

  const raw =
    WEIGHTS.chatActivity * components.chatActivity +
    WEIGHTS.transactionActivity * components.transactionActivity +
    WEIGHTS.draftParticipation * components.draftParticipation +
    WEIGHTS.managerRetention * components.managerRetention +
    WEIGHTS.recency * components.recency
  const score = Math.round(Math.min(100, Math.max(0, raw * 100)))

  return { score, components }
}

/**
 * Get ranked leagues with popularity score.
 * Optionally filter by sport or limit; results sorted by score descending.
 */
export async function getRankedLeagues(options: {
  leagueIds?: string[]
  sport?: string | null
  limit?: number
  recentDays?: number
} = {}): Promise<RankedLeague[]> {
  const { leagueIds, sport, limit = 50, recentDays } = options

  const whereLeague: { id?: { in: string[] }; sport?: LeagueSport } = {}
  if (leagueIds && leagueIds.length > 0) whereLeague.id = { in: leagueIds }
  if (sport && sport.trim()) whereLeague.sport = sport.trim().toUpperCase() as LeagueSport

  const leagues = await prisma.league.findMany({
    where: whereLeague,
    select: { id: true, name: true, sport: true },
  })
  const ids = leagues.map((l) => l.id)
  if (ids.length === 0) return []

  const metricsMap = await getLeagueMetrics({ leagueIds: ids, recentDays })
  const ranked: RankedLeague[] = []

  for (const l of leagues) {
    const metrics = metricsMap.get(l.id)
    if (!metrics) continue
    const popularityScore = computePopularityScore(metrics)
    ranked.push({
      leagueId: l.id,
      leagueName: l.name,
      sport: l.sport,
      popularityScore,
      metrics,
    })
  }

  ranked.sort((a, b) => b.popularityScore.score - a.popularityScore.score)
  return limit > 0 ? ranked.slice(0, limit) : ranked
}
