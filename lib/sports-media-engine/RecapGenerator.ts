/**
 * RecapGenerator — builds context for weekly/season recaps from league data.
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { GenerationContext, TeamStandingRow, SeasonResultRow } from './types'

export interface RecapOptions {
  leagueId: string
  sport?: string | null
  leagueName?: string
  season?: string
  week?: number
}

/**
 * Gather league standings (LeagueTeam) and optional SeasonResult data for recap context.
 */
export async function buildRecapContext(options: RecapOptions): Promise<GenerationContext> {
  const sport = normalizeToSupportedSport(options.sport)
  const leagueId = options.leagueId

  const [teams, seasonResults, league] = await Promise.all([
    prisma.leagueTeam.findMany({
      where: { leagueId },
      orderBy: [{ currentRank: 'asc' }, { pointsFor: 'desc' }, { wins: 'desc' }],
    }),
    options.season
      ? prisma.seasonResult.findMany({
          where: { leagueId, season: options.season },
          orderBy: { pointsFor: 'desc' },
        })
      : Promise.resolve([]),
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
  ])

  const teamRows: TeamStandingRow[] = teams.map((t, i) => ({
    teamId: t.id,
    teamName: t.teamName,
    ownerName: t.ownerName,
    wins: t.wins,
    losses: t.losses,
    ties: t.ties ?? 0,
    pointsFor: t.pointsFor,
    pointsAgainst: t.pointsAgainst,
    rank: t.currentRank ?? i + 1,
  }))

  const seasonRows: SeasonResultRow[] | undefined = seasonResults.length
    ? seasonResults.map((r) => ({
        rosterId: r.rosterId,
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        pointsFor: Number(r.pointsFor ?? 0),
        pointsAgainst: Number(r.pointsAgainst ?? 0),
        champion: r.champion,
      }))
    : undefined

  const highlights: string[] = []
  if (teamRows.length >= 1) {
    const top = teamRows[0]
    highlights.push(`Leader: ${top.teamName} (${top.ownerName}) — ${top.wins}-${top.losses}, ${top.pointsFor.toFixed(1)} PF`)
  }
  const champ = seasonRows?.find((r) => r.champion)
  if (champ && seasonResults.length) {
    const team = teams.find((t) => t.externalId === champ.rosterId || t.id === champ.rosterId)
    if (team) highlights.push(`Champion: ${team.teamName} (${team.ownerName})`)
  }

  return {
    leagueId,
    sport,
    leagueName: options.leagueName ?? league?.name ?? undefined,
    season: options.season,
    week: options.week,
    teams: teamRows,
    seasonResults: seasonRows?.length ? seasonRows : undefined,
    highlights,
  }
}
