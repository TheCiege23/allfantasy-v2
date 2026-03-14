/**
 * Generates and persists StrategyMetaReport from league outcomes.
 * Uses SeasonResult + draft/roster data; runs StrategyPatternAnalyzer and MetaSuccessEvaluator.
 */
import { prisma } from '@/lib/prisma'
import { getLeagueDrafts, getDraftPicks } from '@/lib/sleeper-client'
import { detectStrategies, toLeagueFormat } from './StrategyPatternAnalyzer'
import { computeStrategyMetaReport, type TeamStrategyOutcome } from './MetaSuccessEvaluator'
import type { StrategySport, LeagueFormat } from './types'
import type { DraftPickFact } from './types'
import { getPositionCountsFromRoster } from './RosterCompositionAnalyzer'

/** Map League.sport (enum) to string. */
function leagueSportToSport(sport: string): StrategySport {
  const s = (sport || 'NFL').toUpperCase()
  if (['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'].includes(s)) return s as StrategySport
  return 'NFL'
}

/**
 * Build draft pick facts for one roster from Sleeper draft picks (need player positions from allPlayers).
 */
function buildDraftPicksForRoster(
  allPicks: Array<{ round: number; pickNo?: number; pick_no?: number; rosterId?: number; roster_id?: number; player_id?: string; playerId?: string }>,
  rosterId: number,
  positionByPlayerId: Record<string, string>
): DraftPickFact[] {
  const rid = (p: (typeof allPicks)[0]) => p.rosterId ?? p.roster_id ?? (p as any).picked_by
  return allPicks
    .filter((p) => rid(p) === rosterId)
    .map((p, i) => ({
      round: p.round ?? Math.floor(i / 12) + 1,
      pickNo: p.pickNo ?? p.pick_no ?? i + 1,
      rosterId: rid(p),
      playerId: p.playerId ?? p.player_id ?? null,
      position: (p.player_id || p.playerId) && positionByPlayerId[(p.player_id || p.playerId)!]
        ? positionByPlayerId[(p.player_id || p.playerId)!]
        : null,
    }))
}

/**
 * Generate strategy meta reports for a sport/format from leagues we have data for.
 * Call from cron or admin; optionally pass leagueIds to limit scope.
 */
export async function generateStrategyMetaReports(opts: {
  sport?: StrategySport
  leagueFormat?: LeagueFormat
  leagueIds?: string[]
}): Promise<{ reports: number; errors: string[] }> {
  const errors: string[] = []
  const leagues = await prisma.league.findMany({
    where: {
      ...(opts.leagueIds && opts.leagueIds.length > 0 && { id: { in: opts.leagueIds } }),
      ...(opts.sport && { sport: opts.sport as any }),
    },
    select: {
      id: true,
      platformLeagueId: true,
      sport: true,
      season: true,
      isDynasty: true,
      settings: true,
    },
    take: 200,
  })

  const outcomes: TeamStrategyOutcome[] = []

  for (const league of leagues) {
    try {
      const isSF = (league.settings as Record<string, unknown>)?.is_superflex ?? false
      const format = toLeagueFormat({ isDynasty: league.isDynasty ?? false, isSuperFlex: !!isSF })
      if (opts.leagueFormat && format !== opts.leagueFormat) continue

      const sport = leagueSportToSport(league.sport)
      const seasonResults = await prisma.seasonResult.findMany({
        where: { leagueId: league.id, season: String(league.season ?? new Date().getFullYear()) },
      })

      let draftPicks: DraftPickFact[] = []
      let positionByPlayerId: Record<string, string> = {}
      try {
        const drafts = await getLeagueDrafts(league.platformLeagueId)
        const latest = drafts?.[0]
        if (latest?.draft_id) {
          const raw = await getDraftPicks(latest.draft_id)
          const allPlayers = await (await import('@/lib/sleeper-client')).getAllPlayers?.() ?? {}
          for (const pid of Object.keys(allPlayers)) {
            const p = (allPlayers as Record<string, { position?: string }>)[pid]
            if (p?.position) positionByPlayerId[pid] = p.position
          }
          draftPicks = (raw ?? []).map((p: any, i: number) => ({
            round: p.round ?? Math.floor(i / 12) + 1,
            pickNo: p.pick_no ?? i + 1,
            rosterId: p.roster_id ?? p.picked_by,
            playerId: p.player_id ?? null,
            position: p.player_id ? positionByPlayerId[p.player_id] ?? null : null,
          }))
        }
      } catch (e) {
        errors.push(`Draft fetch ${league.id}: ${(e as Error).message}`)
      }

      const rosterIds = new Set<number>()
      for (const sr of seasonResults) {
        const rid = parseInt(sr.rosterId, 10)
        if (!isNaN(rid)) rosterIds.add(rid)
      }

      for (const sr of seasonResults) {
        const rosterId = parseInt(sr.rosterId, 10)
        if (isNaN(rosterId)) continue
        const picksForRoster = buildDraftPicksForRoster(
          draftPicks as any[],
          rosterId,
          positionByPlayerId
        )
        const rosterPositions = getPositionCountsFromRoster(
          picksForRoster
            .filter((p) => p.position)
            .map((p) => ({ position: p.position! }))
        )
        const detected = detectStrategies({
          sport,
          leagueFormat: format,
          draftPicks: picksForRoster,
          rosterPositions,
        })
        if (detected.length === 0) continue
        outcomes.push({
          leagueId: league.id,
          rosterId: sr.rosterId,
          season: league.season ?? new Date().getFullYear(),
          strategyTypes: detected.map((d) => d.strategyType),
          leagueFormat: format,
          wins: sr.wins ?? 0,
          losses: sr.losses ?? 0,
          pointsFor: Number(sr.pointsFor ?? 0),
          champion: sr.champion ?? false,
        })
      }
    } catch (e) {
      errors.push(`League ${league.id}: ${(e as Error).message}`)
    }
  }

  if (outcomes.length === 0) {
    return { reports: 0, errors }
  }

  const bySegment = new Map<string, TeamStrategyOutcome[]>()
  for (const o of outcomes) {
    const key = `${o.leagueFormat}`
    const list = bySegment.get(key) ?? []
    list.push(o)
    bySegment.set(key, list)
  }

  const sport = opts.sport ?? 'NFL'
  let reportCount = 0
  for (const [leagueFormat, segmentOutcomes] of bySegment) {
    const reports = computeStrategyMetaReport(segmentOutcomes, { sport, leagueFormat })
    for (const r of reports) {
      await prisma.strategyMetaReport.upsert({
        where: {
          uniq_strategy_meta_report_type_sport_format: {
            strategyType: r.strategyType,
            sport: r.sport,
            leagueFormat: r.leagueFormat,
          },
        },
        create: {
          strategyType: r.strategyType,
          sport: r.sport,
          usageRate: r.usageRate,
          successRate: r.successRate,
          trendingDirection: r.trendingDirection,
          leagueFormat: r.leagueFormat,
          sampleSize: r.sampleSize,
        },
        update: {
          usageRate: r.usageRate,
          successRate: r.successRate,
          trendingDirection: r.trendingDirection,
          sampleSize: r.sampleSize,
        },
      })
      reportCount++
    }
  }

  return { reports: reportCount, errors }
}

/**
 * Fetch current strategy meta reports for API/dashboard.
 */
export async function getStrategyMetaReports(opts: {
  sport?: string
  leagueFormat?: string
}): Promise<Array<{ strategyType: string; sport: string; usageRate: number; successRate: number; trendingDirection: string; leagueFormat: string; sampleSize: number }>> {
  const rows = await prisma.strategyMetaReport.findMany({
    where: {
      ...(opts.sport && { sport: opts.sport }),
      ...(opts.leagueFormat && { leagueFormat: opts.leagueFormat }),
    },
    orderBy: [{ usageRate: 'desc' }, { successRate: 'desc' }],
  })
  return rows.map((r) => ({
    strategyType: r.strategyType,
    sport: r.sport,
    usageRate: r.usageRate,
    successRate: r.successRate,
    trendingDirection: r.trendingDirection,
    leagueFormat: r.leagueFormat,
    sampleSize: r.sampleSize,
  }))
}
