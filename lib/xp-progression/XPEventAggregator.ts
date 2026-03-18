/**
 * XPEventAggregator — collect XP from SeasonResult, rosters, and (optional) trades.
 * Emits XPEvent records and computes total XP per manager.
 */

import { prisma } from '@/lib/prisma'
import {
  buildLeagueScopedRosterIdFilters,
  mergeSeasonResultAliases,
  resolveSeasonResultRosterIds,
} from '@/lib/season-results/SeasonResultRosterIdentity'
import { XP_VALUES } from './types'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

const XP_WIN_MATCHUP = XP_VALUES.win_matchup ?? 10
const XP_MAKE_PLAYOFFS = XP_VALUES.make_playoffs ?? 50
const XP_CHAMPIONSHIP = XP_VALUES.championship ?? 200
const XP_SEASON_COMPLETION = XP_VALUES.season_completion ?? 25
const GENERATED_XP_EVENT_TYPES = [
  'win_matchup',
  'season_completion',
  'make_playoffs',
  'championship',
] as const

export interface AggregatedXPResult {
  managerId: string
  totalXP: number
  eventsCreated: number
}

/**
 * Aggregate XP for one manager from SeasonResult (wins → matchup wins, champion → championship,
 * completed season → season completion + playoffs). Optionally write XPEvent records.
 */
export async function aggregateXPForManager(
  managerId: string,
  options?: { sport?: string | null; writeEvents?: boolean }
): Promise<AggregatedXPResult> {
  const sport = options?.sport ?? DEFAULT_SPORT
  const writeEvents = options?.writeEvents !== false

  const rosters = await prisma.roster.findMany({
    where: { platformUserId: managerId },
    select: { id: true, leagueId: true, playerData: true },
  })
  const seasonResultRosterIds = resolveSeasonResultRosterIds(rosters)
  const seasonResultFilters = buildLeagueScopedRosterIdFilters(
    seasonResultRosterIds
  )

  const seasonResultsByRosterId = await prisma.seasonResult.findMany({
    where: { rosterId: managerId },
    select: { leagueId: true, season: true, wins: true, losses: true, champion: true },
  })

  const seasonResultsByRoster =
    seasonResultFilters.length > 0
      ? await prisma.seasonResult.findMany({
          where: {
            OR: seasonResultFilters,
          },
          select: { leagueId: true, season: true, wins: true, losses: true, champion: true },
        })
      : []

  const combined = mergeSeasonResultAliases([
    ...seasonResultsByRosterId,
    ...seasonResultsByRoster,
  ])

  let totalXP = 0
  const eventsToCreate: { managerId: string; eventType: string; xpValue: number; sport: string }[] = []

  for (const rec of combined) {
    const matchupXP = rec.wins * XP_WIN_MATCHUP
    totalXP += matchupXP
    if (writeEvents && rec.wins > 0) {
      eventsToCreate.push({
        managerId,
        eventType: 'win_matchup',
        xpValue: rec.wins * XP_WIN_MATCHUP,
        sport,
      })
    }
    totalXP += XP_SEASON_COMPLETION
    if (writeEvents) {
      eventsToCreate.push({
        managerId,
        eventType: 'season_completion',
        xpValue: XP_SEASON_COMPLETION,
        sport,
      })
    }
    totalXP += XP_MAKE_PLAYOFFS
    if (writeEvents) {
      eventsToCreate.push({
        managerId,
        eventType: 'make_playoffs',
        xpValue: XP_MAKE_PLAYOFFS,
        sport,
      })
    }
    if (rec.champion) {
      totalXP += XP_CHAMPIONSHIP
      if (writeEvents) {
        eventsToCreate.push({
          managerId,
          eventType: 'championship',
          xpValue: XP_CHAMPIONSHIP,
          sport,
        })
      }
    }
  }

  if (writeEvents) {
    await prisma.$transaction(async (tx) => {
      await tx.xPEvent.deleteMany({
        where: {
          managerId,
          sport,
          eventType: { in: [...GENERATED_XP_EVENT_TYPES] },
        },
      })

      if (eventsToCreate.length === 0) {
        return
      }

      await tx.xPEvent.createMany({
          data: eventsToCreate.map((e) => ({
            managerId: e.managerId,
            eventType: e.eventType,
            xpValue: e.xpValue,
            sport: e.sport,
          })),
        })
    })
  }

  return {
    managerId,
    totalXP,
    eventsCreated: eventsToCreate.length,
  }
}
