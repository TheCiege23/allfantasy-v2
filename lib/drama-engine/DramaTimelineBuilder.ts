/**
 * DramaTimelineBuilder — builds ordered timeline of drama events for a league/season.
 */

import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

export interface DramaEventView {
  id: string
  leagueId: string
  sport: string
  season: number | null
  dramaType: string
  headline: string
  summary: string | null
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId: string | null
  dramaScore: number
  createdAt: Date
}

/**
 * Get timeline for league/season: either from DramaTimelineRecord (ordered eventIds) or by querying events and sorting by createdAt.
 */
export async function buildTimelineForLeague(
  leagueId: string,
  options?: { sport?: string; season?: number | null; limit?: number }
): Promise<DramaEventView[]> {
  const where: { leagueId: string; sport?: string; season?: number | null } = { leagueId }
  if (options?.sport) where.sport = options.sport
  if (options?.season != null) where.season = options.season

  const sportKey = options?.sport ?? DEFAULT_SPORT
  const seasonKey = options?.season ?? null
  const timelineRecord = await prisma.dramaTimelineRecord.findFirst({
    where: { leagueId, sport: sportKey, season: seasonKey },
  })

  const limit = options?.limit ?? 50

  if (timelineRecord?.eventIds && Array.isArray(timelineRecord.eventIds) && (timelineRecord.eventIds as string[]).length > 0) {
    const ids = (timelineRecord.eventIds as string[]).slice(0, limit)
    const events = await prisma.dramaEvent.findMany({
      where: { id: { in: ids } },
    })
    const byId = new Map(events.map((e) => [e.id, e]))
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof events
    return ordered.map(toView)
  }

  const events = await prisma.dramaEvent.findMany({
    where,
    orderBy: [{ dramaScore: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return events.map(toView)
}

function toView(e: {
  id: string
  leagueId: string
  sport: string
  season: number | null
  dramaType: string
  headline: string
  summary: string | null
  relatedManagerIds: unknown
  relatedTeamIds: unknown
  relatedMatchupId: string | null
  dramaScore: number
  createdAt: Date
}): DramaEventView {
  return {
    id: e.id,
    leagueId: e.leagueId,
    sport: e.sport,
    season: e.season,
    dramaType: e.dramaType,
    headline: e.headline,
    summary: e.summary,
    relatedManagerIds: Array.isArray(e.relatedManagerIds) ? (e.relatedManagerIds as string[]) : [],
    relatedTeamIds: Array.isArray(e.relatedTeamIds) ? (e.relatedTeamIds as string[]) : [],
    relatedMatchupId: e.relatedMatchupId,
    dramaScore: e.dramaScore,
    createdAt: e.createdAt,
  }
}
