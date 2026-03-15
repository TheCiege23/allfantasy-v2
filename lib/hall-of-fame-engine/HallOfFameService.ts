/**
 * HallOfFameService — create entries and moments; run induction from league data.
 */

import { prisma } from '@/lib/prisma'
import { normalizeSportForHallOfFame, isSupportedHallOfFameSport } from './SportHallOfFameResolver'
import { computeInductionScore } from './InductionScoreCalculator'
import type { InductionMetrics } from './InductionScoreCalculator'
import { detectHistoricMoments, toMomentInput } from './HistoricMomentDetector'
import type { HallOfFameEntryInput, HallOfFameMomentInput } from './types'
import type { HallOfFameEntityType, HallOfFameCategory } from './types'

export interface CreateEntryResult {
  id: string
  entityType: string
  entityId: string
  score: number
}

export async function createHallOfFameEntry(
  input: HallOfFameEntryInput
): Promise<CreateEntryResult | null> {
  const sport = normalizeSportForHallOfFame(input.sport)
  if (!isSupportedHallOfFameSport(sport)) return null

  const score = Number.isFinite(input.score) ? Math.max(0, Math.min(1, input.score)) : 0
  const entry = await prisma.hallOfFameEntry.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      sport,
      leagueId: input.leagueId ?? null,
      season: input.season ?? null,
      category: input.category,
      title: input.title,
      summary: input.summary ?? null,
      score,
      metadata: (input.metadata ?? {}) as object,
    },
  })
  return {
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    score: Number(entry.score),
  }
}

export async function createHallOfFameMoment(
  input: HallOfFameMomentInput
): Promise<{ id: string; significanceScore: number } | null> {
  const sport = normalizeSportForHallOfFame(input.sport)
  if (!isSupportedHallOfFameSport(sport)) return null

  const score = Number.isFinite(input.significanceScore)
    ? Math.max(0, Math.min(1, input.significanceScore))
    : 0
  const moment = await prisma.hallOfFameMoment.create({
    data: {
      leagueId: input.leagueId,
      sport,
      season: input.season,
      headline: input.headline,
      summary: input.summary ?? null,
      relatedManagerIds: input.relatedManagerIds ?? [],
      relatedTeamIds: input.relatedTeamIds ?? [],
      relatedMatchupId: input.relatedMatchupId ?? null,
      significanceScore: score,
    },
  })
  return { id: moment.id, significanceScore: Number(moment.significanceScore) }
}

/**
 * Induct a manager from HallOfFameRow + SeasonResult–derived metrics.
 */
export async function inductManagerFromLeagueHistory(
  leagueId: string,
  rosterId: string,
  sport: string,
  options?: { season?: string }
): Promise<CreateEntryResult | null> {
  const sportNorm = normalizeSportForHallOfFame(sport)
  if (!isSupportedHallOfFameSport(sportNorm)) return null

  const [hofRow, seasonResults] = await Promise.all([
    prisma.hallOfFameRow.findUnique({
      where: { uniq_hof_league_roster: { leagueId, rosterId } },
    }),
    prisma.seasonResult.findMany({
      where: { leagueId, rosterId },
      orderBy: { season: 'desc' },
    }),
  ])

  if (!hofRow && !seasonResults.length) return null

  const championships = hofRow?.championships ?? seasonResults.filter((r) => r.champion).length
  const seasonsPlayed = hofRow?.seasonsPlayed ?? seasonResults.length
  const dominance = hofRow ? Number(hofRow.dominance) : 0
  const longevity = hofRow ? Number(hofRow.longevity) : Math.min(1, seasonsPlayed / 15)

  const metrics: InductionMetrics = {
    championships,
    seasonsPlayed,
    dominance,
    longevity,
  }
  const score = computeInductionScore(
    metrics,
    'MANAGER' as HallOfFameEntityType,
    'all_time_great_managers' as HallOfFameCategory
  )
  const title = `Legendary Manager — Roster ${rosterId}`
  const summary = `${championships} championship(s), ${seasonsPlayed} season(s) in league.`

  return createHallOfFameEntry({
    entityType: 'MANAGER',
    entityId: rosterId,
    sport: sportNorm,
    leagueId,
    season: options?.season ?? null,
    category: 'all_time_great_managers',
    title,
    summary,
    score,
    metadata: { source: 'league_history', rosterId, championships, seasonsPlayed },
  })
}

/**
 * Sync historic moments for a league (detect and upsert into HallOfFameMoment).
 * Idempotent by (leagueId, season, headline) — we create new moments per run for simplicity.
 */
export async function syncHistoricMomentsForLeague(
  leagueId: string,
  sport: string,
  options?: { maxSeasons?: number }
): Promise<{ created: number }> {
  const sportNorm = normalizeSportForHallOfFame(sport)
  if (!isSupportedHallOfFameSport(sportNorm)) return { created: 0 }

  const candidates = await detectHistoricMoments(leagueId, sportNorm, options)
  let created = 0
  for (const c of candidates) {
    const input = toMomentInput(c)
    const existing = await prisma.hallOfFameMoment.findFirst({
      where: {
        leagueId,
        season: c.season,
        headline: c.headline,
      },
    })
    if (existing) continue
    const result = await createHallOfFameMoment(input)
    if (result) created++
  }
  return { created }
}
