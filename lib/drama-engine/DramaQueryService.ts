/**
 * DramaQueryService — query drama events by league, sport, season, type.
 */

import { prisma } from '@/lib/prisma'
import { buildTimelineForLeague } from './DramaTimelineBuilder'
import { getDramaSportLabel } from './SportDramaResolver'

export interface DramaEventView {
  id: string
  leagueId: string
  sport: string
  sportLabel: string
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

export async function listDramaEvents(
  leagueId: string,
  options?: { sport?: string; season?: number | null; dramaType?: string; limit?: number }
): Promise<DramaEventView[]> {
  const where: { leagueId: string; sport?: string; season?: number | null; dramaType?: string } = { leagueId }
  if (options?.sport) where.sport = options.sport
  if (options?.season != null) where.season = options.season
  if (options?.dramaType) where.dramaType = options.dramaType

  const events = await prisma.dramaEvent.findMany({
    where,
    orderBy: [{ dramaScore: 'desc' }, { createdAt: 'desc' }],
    take: options?.limit ?? 30,
  })
  return events.map((e) => ({
    ...e,
    sportLabel: getDramaSportLabel(e.sport),
    relatedManagerIds: Array.isArray(e.relatedManagerIds) ? (e.relatedManagerIds as string[]) : [],
    relatedTeamIds: Array.isArray(e.relatedTeamIds) ? (e.relatedTeamIds as string[]) : [],
  }))
}

export async function getDramaEventById(eventId: string): Promise<DramaEventView | null> {
  const e = await prisma.dramaEvent.findUnique({ where: { id: eventId } })
  if (!e) return null
  return {
    ...e,
    sportLabel: getDramaSportLabel(e.sport),
    relatedManagerIds: Array.isArray(e.relatedManagerIds) ? (e.relatedManagerIds as string[]) : [],
    relatedTeamIds: Array.isArray(e.relatedTeamIds) ? (e.relatedTeamIds as string[]) : [],
  }
}

export { buildTimelineForLeague }
