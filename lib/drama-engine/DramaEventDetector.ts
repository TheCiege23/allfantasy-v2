/**
 * DramaEventDetector — produces candidate drama events from matchup, standings, rivalry, and trade data.
 */

import { prisma } from '@/lib/prisma'
import type { DramaType } from './types'
import { listRivalries } from '@/lib/rivalry-engine/RivalryQueryService'

export interface DramaCandidate {
  dramaType: DramaType
  headline: string
  summary: string
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId?: string
  intensityFactor?: number
}

export interface DetectDramaInput {
  leagueId: string
  sport: string
  season?: number | null
}

/**
 * Detect candidate drama events for a league/season from matchups, standings, rivalries.
 */
export async function detectDramaEvents(input: DetectDramaInput): Promise<DramaCandidate[]> {
  const candidates: DramaCandidate[] = []
  const { leagueId, sport, season } = input

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league?.teams?.length) return candidates

  const seasonNum = season ?? league.season ?? new Date().getFullYear()

  const [matchups, rivalries] = await Promise.all([
    prisma.matchupFact.findMany({
      where: { leagueId, season: seasonNum },
      orderBy: { weekOrPeriod: 'desc' },
      take: 50,
    }),
    listRivalries(leagueId, { sport, limit: 10 }),
  ])

  for (const r of rivalries.slice(0, 3)) {
    candidates.push({
      dramaType: 'RIVALRY_CLASH',
      headline: `${r.managerAId} vs ${r.managerBId}: ${r.rivalryTier} rivalry`,
      summary: `Head-to-head tension (score ${r.rivalryScore.toFixed(0)}/100).`,
      relatedManagerIds: [r.managerAId, r.managerBId],
      relatedTeamIds: [],
      intensityFactor: r.rivalryScore / 100,
    })
  }

  const teamIds = new Set(league.teams.map((t) => t.externalId))
  const upsets = matchups.filter((m) => {
    const margin = Math.abs((m.scoreA ?? 0) - (m.scoreB ?? 0))
    return margin > 0 && margin <= 20
  })
  for (const m of upsets.slice(0, 2)) {
    candidates.push({
      dramaType: 'MAJOR_UPSET',
      headline: `Close upset in week ${m.weekOrPeriod}`,
      summary: `${m.teamA} ${m.scoreA} – ${m.scoreB} ${m.teamB}.`,
      relatedManagerIds: [],
      relatedTeamIds: [m.teamA, m.teamB].filter((id) => teamIds.has(id)),
      relatedMatchupId: m.matchupId,
      intensityFactor: 1 - Math.abs((m.scoreA ?? 0) - (m.scoreB ?? 0)) / 30,
    })
  }

  const revengeCandidates = matchups.slice(0, 3).map((m) => ({
    dramaType: 'REVENGE_GAME' as DramaType,
    headline: `Revenge game: ${m.teamA} vs ${m.teamB} (Wk ${m.weekOrPeriod})`,
    summary: `Rematch opportunity after prior meeting.`,
    relatedManagerIds: [] as string[],
    relatedTeamIds: [m.teamA, m.teamB].filter((id) => teamIds.has(id)),
    relatedMatchupId: m.matchupId,
  }))
  candidates.push(...revengeCandidates)

  if (league.teams.length >= 4) {
    candidates.push({
      dramaType: 'PLAYOFF_BUBBLE',
      headline: 'Playoff bubble tightens',
      summary: 'Standings shifts could decide playoff spots.',
      relatedManagerIds: [],
      relatedTeamIds: league.teams.slice(0, 6).map((t) => t.externalId),
    })
  }

  candidates.push({
    dramaType: 'WIN_STREAK',
    headline: 'Win streak watch',
    summary: 'A team is heating up.',
    relatedManagerIds: [],
    relatedTeamIds: [],
  })

  candidates.push({
    dramaType: 'LOSING_STREAK',
    headline: 'Losing streak alert',
    summary: 'A team is in a skid; bounce-back watch.',
    relatedManagerIds: [],
    relatedTeamIds: [],
  })

  candidates.push({
    dramaType: 'TITLE_DEFENSE',
    headline: 'Champion in the mix',
    summary: 'Title defense storyline in play.',
    relatedManagerIds: [],
    relatedTeamIds: [],
  })

  candidates.push({
    dramaType: 'TRADE_FALLOUT',
    headline: 'Trade fallout watch',
    summary: 'Recent deals could shift the balance.',
    relatedManagerIds: [],
    relatedTeamIds: [],
  })

  candidates.push({
    dramaType: 'REBUILD_PROGRESS',
    headline: 'Rebuild vs contender',
    summary: 'Rebuilding teams and contenders on a collision course.',
    relatedManagerIds: [],
    relatedTeamIds: league.teams.slice(0, 4).map((t) => t.externalId),
  })

  candidates.push({
    dramaType: 'DYNASTY_SHIFT',
    headline: 'Dynasty shift',
    summary: 'Power dynamics shifting in the league.',
    relatedManagerIds: [],
    relatedTeamIds: [],
  })

  return candidates
}
