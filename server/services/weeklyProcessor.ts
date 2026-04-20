/**
 * Weekly scoring processor: stats → player points → team totals → H2H → standings.
 */
import { prisma } from '@/lib/prisma'
import { resolveScoringRulesForLeague } from '@/lib/multi-sport/MultiSportScoringResolver'
import type { LeagueSport } from '@prisma/client'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { getStarterPlayerIdsForScoring } from '@/lib/scoring-engine/rosterLineup'
import { computePlayerFantasyPointsPipeline } from '@/server/services/scoringEngine'
import { buildRoundRobinPairsForWeek } from '@/server/services/roundRobinSchedule'
import { resolveMatchupOutcomesForWeek } from '@/server/services/matchupEngine'
import { recomputeStandingsForSeason } from '@/server/services/standingsEngine'
import { applyConceptWeeklyPoints } from '@/lib/scoring-engine/conceptAdjustments'
import { isRosterChopped } from '@/lib/guillotine/guillotineGuard'
import { isRosterCurrentlyEliminated } from '@/lib/survivor/SurvivorRosterState'
import { parseSettingsSnapshot } from '@/lib/league-contract/types'

export type ProcessWeekResult = {
  leagueId: string
  season: number
  week: number
  rostersProcessed: number
  weeklyScoreRows: number
}

export async function processLeagueWeek(params: {
  leagueId: string
  season: number
  week: number
}): Promise<ProcessWeekResult> {
  const { leagueId, season, week } = params

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { rosters: true },
  })
  if (!league) {
    throw new Error('League not found')
  }

  const rules = await resolveScoringRulesForLeague(leagueId, league.sport as LeagueSport)
  const snap = parseSettingsSnapshot(league.settings)
  const scoringSettings = (snap?.scoringSettings ?? null) as Record<string, unknown> | null

  const rosterIds = league.rosters.map((r) => r.id).sort((a, b) => a.localeCompare(b))
  const pairMap = buildRoundRobinPairsForWeek(rosterIds, week)

  await prisma.$transaction(async (tx) => {
    await tx.weeklyScore.deleteMany({ where: { leagueId, season, week } })
    await tx.teamWeekResult.deleteMany({ where: { leagueId, season, week } })

    const weeklyRows: Array<{
      leagueId: string
      season: number
      week: number
      rosterId: string
      playerId: string
      points: number
      isStarter: boolean
      statLine?: object
    }> = []

    const teamTotals = new Map<string, number>()

    for (const roster of league.rosters) {
      const chopped = await isRosterChopped(leagueId, roster.id)
      const survivorOut = await isRosterCurrentlyEliminated(leagueId, roster.id).catch(() => false)
      const starterIds = new Set(getStarterPlayerIdsForScoring(roster.playerData))
      const allIds = getRosterPlayerIds(roster.playerData)

      let teamSum = 0

      if (chopped || survivorOut) {
        for (const playerId of allIds) {
          const isStarter = starterIds.size === 0 ? true : starterIds.has(playerId)
          weeklyRows.push({
            leagueId,
            season,
            week,
            rosterId: roster.id,
            playerId,
            points: 0,
            isStarter,
            statLine: { suppressed: chopped ? 'guillotine_chopped' : 'survivor_eliminated' },
          })
        }
        teamTotals.set(roster.id, 0)
        continue
      }

      const seenPlayer = new Set<string>()
      for (const playerId of allIds) {
        const isStarter = starterIds.size === 0 ? true : starterIds.has(playerId)

        if (seenPlayer.has(playerId)) {
          weeklyRows.push({
            leagueId,
            season,
            week,
            rosterId: roster.id,
            playerId,
            points: 0,
            isStarter,
            statLine: { duplicate: true, reason: 'duplicate_player_slot' },
          })
          continue
        }
        seenPlayer.add(playerId)

        const pws = await tx.playerWeeklyScore.findUnique({
          where: {
            playerId_week_season_sport: {
              playerId,
              week,
              season,
              sport: String(league.sport),
            },
          },
        })

        const rawStats = (pws?.stats && typeof pws.stats === 'object' && !Array.isArray(pws.stats)
          ? (pws.stats as Record<string, unknown>)
          : {}) as Record<string, unknown>

        const posRow = await tx.sportsPlayer
          .findUnique({
            where: { id: playerId },
            select: { position: true },
          })
          .catch(() => null)

        const { points, statLine } = computePlayerFantasyPointsPipeline({
          stats: rawStats,
          rules,
          position: posRow?.position ?? null,
          scoringSettings,
        })

        weeklyRows.push({
          leagueId,
          season,
          week,
          rosterId: roster.id,
          playerId,
          points,
          isStarter,
          statLine,
        })

        if (isStarter) {
          teamSum += points
        }
      }

      teamSum = applyConceptWeeklyPoints({
        leagueId,
        leagueVariant: league.leagueVariant ?? null,
        week,
        season,
        rosterId: roster.id,
        basePoints: teamSum,
        settingsJson: league.settings,
      })

      teamTotals.set(roster.id, teamSum)
    }

    if (weeklyRows.length > 0) {
      await tx.weeklyScore.createMany({
        data: weeklyRows.map((w) => ({
          leagueId: w.leagueId,
          season: w.season,
          week: w.week,
          rosterId: w.rosterId,
          playerId: w.playerId,
          points: w.points,
          isStarter: w.isStarter,
          statLine: w.statLine ?? undefined,
        })),
      })
    }

    for (const roster of league.rosters) {
      const total = teamTotals.get(roster.id) ?? 0
      const opp = pairMap.get(roster.id) ?? null
      await tx.teamWeekResult.create({
        data: {
          leagueId,
          season,
          week,
          rosterId: roster.id,
          totalPoints: total,
          opponentRosterId: opp,
          status: 'final',
        },
      })
    }
  })

  await resolveMatchupOutcomesForWeek(leagueId, season, week)
  await recomputeStandingsForSeason(leagueId, season)

  try {
    const { resolveSpecialtyConceptKey, isSpecialtyConcept } = await import('@/lib/specialty-automation/types')
    const { dispatchSpecialtyAutomationTrigger } = await import('@/lib/specialty-automation/triggerDispatcher')
    if (isSpecialtyConcept(resolveSpecialtyConceptKey(league))) {
      await dispatchSpecialtyAutomationTrigger({
        trigger: 'onWeekFinalized',
        leagueId,
        season,
        week,
        source: 'weekly_processor',
      })
    }
  } catch (e) {
    console.warn('[weeklyProcessor] specialty automation', leagueId, e)
  }

  const count = await prisma.weeklyScore.count({
    where: { leagueId, season, week },
  })

  return {
    leagueId,
    season,
    week,
    rostersProcessed: league.rosters.length,
    weeklyScoreRows: count,
  }
}

/**
 * Batch driver for cron / worker (best-effort per league).
 */
export async function processAllActiveLeaguesForWeek(season: number, week: number): Promise<ProcessWeekResult[]> {
  const leagues = await prisma.league.findMany({
    where: {
      OR: [{ status: null }, { status: { notIn: ['archived', 'deleted'] } }],
    },
    select: { id: true },
    take: 200,
  })
  const out: ProcessWeekResult[] = []
  for (const l of leagues) {
    try {
      out.push(await processLeagueWeek({ leagueId: l.id, season, week }))
    } catch (e) {
      console.error('[weeklyProcessor] league failed', l.id, e)
    }
  }
  return out
}
