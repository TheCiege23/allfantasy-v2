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
  updated: number
  eventIds: string[]
}

function normalizeIdArray(input: string[] | null | undefined): string[] {
  return [...new Set((input ?? []).map((v) => String(v).trim()).filter(Boolean))]
}

async function ensureDramaEvent(input: {
  leagueId: string
  sport: string
  season: number | null
  dramaType: string
  headline: string
  summary: string
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId?: string
  dramaScore: number
}): Promise<{ id: string; created: boolean }> {
  const relatedManagers = normalizeIdArray(input.relatedManagerIds)
  const relatedTeams = normalizeIdArray(input.relatedTeamIds)
  const existing = await prisma.dramaEvent.findFirst({
    where: {
      leagueId: input.leagueId,
      sport: input.sport,
      season: input.season,
      dramaType: input.dramaType,
      headline: input.headline.slice(0, 256),
      relatedMatchupId: input.relatedMatchupId ?? null,
    },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    const updated = await prisma.dramaEvent.update({
      where: { id: existing.id },
      data: {
        summary: input.summary.slice(0, 2000),
        relatedManagerIds: relatedManagers,
        relatedTeamIds: relatedTeams,
        dramaScore: input.dramaScore,
      },
    })
    return { id: updated.id, created: false }
  }
  const created = await prisma.dramaEvent.create({
    data: {
      leagueId: input.leagueId,
      sport: input.sport,
      season: input.season,
      dramaType: input.dramaType,
      headline: input.headline.slice(0, 256),
      summary: input.summary.slice(0, 2000),
      relatedManagerIds: relatedManagers,
      relatedTeamIds: relatedTeams,
      relatedMatchupId: input.relatedMatchupId,
      dramaScore: input.dramaScore,
    },
  })
  return { id: created.id, created: true }
}

/**
 * Run the drama engine: detect candidates, score, persist DramaEvent, update DramaTimelineRecord.
 */
export async function runLeagueDramaEngine(input: LeagueDramaEngineInput): Promise<LeagueDramaEngineResult> {
  const sportNorm = normalizeSportForDrama(input.sport)
  if (!isSupportedDramaSport(sportNorm)) {
    return { created: 0, updated: 0, eventIds: [] }
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
    sport: sportKey,
    season: input.season,
  })

  const eventIds: string[] = []
  let createdCount = 0
  let updatedCount = 0
  for (const c of candidates) {
    const dramaScore = calculateDramaScore({
      dramaType: c.dramaType as DramaType,
      sport: sportKey,
      intensityFactor: c.signal?.intensityFactor ?? c.intensityFactor,
      relatedCount: c.relatedManagerIds.length + c.relatedTeamIds.length,
      rivalryScore: c.signal?.rivalryScore,
      upsetMagnitude: c.signal?.upsetMagnitude,
      playoffSwing: c.signal?.playoffSwing,
      recencyWeight: c.signal?.recencyWeight,
      managerBehaviorHeat: c.signal?.managerBehaviorHeat,
      leagueGraphHeat: c.signal?.leagueGraphHeat,
    })
    const saved = await ensureDramaEvent({
      leagueId: input.leagueId,
      sport: sportKey,
      season: seasonKey,
      dramaType: c.dramaType,
      headline: c.headline,
      summary: c.summary,
      relatedManagerIds: c.relatedManagerIds,
      relatedTeamIds: c.relatedTeamIds,
      relatedMatchupId: c.relatedMatchupId,
      dramaScore,
    })
    eventIds.push(saved.id)
    if (saved.created) createdCount++
    else updatedCount++
  }

  const ordered = await prisma.dramaEvent.findMany({
    where: { id: { in: eventIds } },
    orderBy: [{ dramaScore: 'desc' }, { createdAt: 'desc' }],
    select: { id: true },
  })
  const orderedIds = ordered.map((e) => e.id)

  const existing = await prisma.dramaTimelineRecord.findFirst({
    where: { leagueId: input.leagueId, sport: sportKey, season: seasonKey },
  })
  if (existing) {
    await prisma.dramaTimelineRecord.update({
      where: { id: existing.id },
      data: { eventIds: orderedIds, updatedAt: new Date() },
    })
  } else {
    await prisma.dramaTimelineRecord.create({
      data: { leagueId: input.leagueId, sport: sportKey, season: seasonKey, eventIds: orderedIds },
    })
  }

  return { created: createdCount, updated: updatedCount, eventIds: orderedIds }
}
