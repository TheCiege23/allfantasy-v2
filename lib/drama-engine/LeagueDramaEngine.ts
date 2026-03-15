/**
 * LeagueDramaEngine — orchestrates detection, scoring, persistence, and timeline update.
 */

import { prisma } from '@/lib/prisma'
import { detectDramaEvents } from './DramaEventDetector'
import { calculateDramaScore } from './DramaScoreCalculator'
import { normalizeSportForDrama, isSupportedDramaSport } from './SportDramaResolver'
import type { DramaType } from './types'

export interface LeagueDramaEngineInput {
  leagueId: string
  sport: string
  season?: number | null
  /** If true, clear existing events for this league/sport/season before adding new ones. */
  replace?: boolean
}

export interface LeagueDramaEngineResult {
  created: number
  eventIds: string[]
}

/**
 * Run the drama engine: detect candidates, score, persist DramaEvent, update DramaTimelineRecord.
 */
export async function runLeagueDramaEngine(input: LeagueDramaEngineInput): Promise<LeagueDramaEngineResult> {
  const sportNorm = normalizeSportForDrama(input.sport)
  if (!isSupportedDramaSport(sportNorm)) {
    return { created: 0, eventIds: [] }
  }

  const sportKey = sportNorm ?? input.sport
  const seasonKey = input.season ?? null

  if (input.replace) {
    await prisma.dramaEvent.deleteMany({
      where: { leagueId: input.leagueId, sport: sportKey, season: seasonKey },
    })
    await prisma.dramaTimelineRecord.deleteMany({
      where: { leagueId: input.leagueId, sport: sportKey, season: seasonKey },
    })
  }

  const candidates = await detectDramaEvents({
    leagueId: input.leagueId,
    sport: input.sport,
    season: input.season,
  })

  const eventIds: string[] = []
  for (const c of candidates) {
    const dramaScore = calculateDramaScore({
      dramaType: c.dramaType as DramaType,
      intensityFactor: c.intensityFactor,
      relatedCount: c.relatedManagerIds.length + c.relatedTeamIds.length,
    })
    const created = await prisma.dramaEvent.create({
      data: {
        leagueId: input.leagueId,
        sport: sportKey,
        season: seasonKey,
        dramaType: c.dramaType,
        headline: c.headline.slice(0, 256),
        summary: c.summary.slice(0, 2000),
        relatedManagerIds: c.relatedManagerIds,
        relatedTeamIds: c.relatedTeamIds,
        relatedMatchupId: c.relatedMatchupId,
        dramaScore,
      },
    })
    eventIds.push(created.id)
  }

  const existing = await prisma.dramaTimelineRecord.findFirst({
    where: { leagueId: input.leagueId, sport: sportKey, season: seasonKey },
  })
  if (existing) {
    await prisma.dramaTimelineRecord.update({
      where: { id: existing.id },
      data: { eventIds, updatedAt: new Date() },
    })
  } else {
    await prisma.dramaTimelineRecord.create({
      data: { leagueId: input.leagueId, sport: sportKey, season: seasonKey, eventIds },
    })
  }

  return { created: eventIds.length, eventIds }
}
