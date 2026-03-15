/**
 * RivalryEngine — orchestrates detection, scoring, tier resolution, and persistence of rivalries.
 * Uses HeadToHeadAggregator, RivalryScoreCalculator, RivalryTierResolver; upserts RivalryRecord and RivalryEvent.
 */

import { prisma } from '@/lib/prisma'
import { aggregateHeadToHeadForLeague } from './HeadToHeadAggregator'
import { calculateRivalryScore } from './RivalryScoreCalculator'
import { resolveRivalryTier } from './RivalryTierResolver'
import { normalizeSportForRivalry, isSupportedRivalrySport } from './SportRivalryResolver'
import type { RivalryScoreInput, RivalryEventType } from './types'

export interface RivalryEngineInput {
  leagueId: string
  sport: string
  /** Season(s) to aggregate; if multiple, H2H is merged across seasons. */
  seasons: number[]
  /** Optional: trade count per canonical pair key "managerAId|managerBId" (managerAId <= managerBId). */
  tradeCountByPair?: Map<string, number>
  /** Optional: playoff/elimination/championship counts per canonical pair key. */
  playoffMeetingsByPair?: Map<string, number>
  eliminationEventsByPair?: Map<string, number>
  championshipMeetingsByPair?: Map<string, number>
  /** Optional: drama event count per pair. */
  dramaEventsByPair?: Map<string, number>
  /** Optional: contention overlap score 0–100 per pair. */
  contentionOverlapByPair?: Map<string, number>
}

export interface RivalryEngineResult {
  processed: number
  created: number
  updated: number
  rivalryIds: string[]
}

function pairKey(managerAId: string, managerBId: string): string {
  return managerAId <= managerBId ? `${managerAId}|${managerBId}` : `${managerBId}|${managerAId}`
}

/**
 * Run the rivalry engine for a league/sport/season(s): aggregate H2H, compute score, resolve tier,
 * upsert RivalryRecord, and create RivalryEvent entries for key events.
 */
export async function runRivalryEngine(input: RivalryEngineInput): Promise<RivalryEngineResult> {
  const sportNorm = normalizeSportForRivalry(input.sport)
  if (!isSupportedRivalrySport(sportNorm)) {
    return { processed: 0, created: 0, updated: 0, rivalryIds: [] }
  }

  const summariesByPair = new Map<string, Awaited<ReturnType<typeof aggregateHeadToHeadForLeague>>[0]>()
  for (const season of input.seasons) {
    const summaries = await aggregateHeadToHeadForLeague(input.leagueId, season, { useTeamIds: true })
    for (const s of summaries) {
      const key = pairKey(s.managerAId, s.managerBId)
      const existing = summariesByPair.get(key)
      if (!existing) {
        summariesByPair.set(key, { ...s, matchups: [...s.matchups] })
      } else {
        existing.totalMatchups += s.totalMatchups
        existing.winsA += s.winsA
        existing.winsB += s.winsB
        existing.closeGameCount += s.closeGameCount
        existing.upsetWins += s.upsetWins
        existing.matchups.push(...s.matchups)
      }
    }
  }

  let created = 0
  let updated = 0
  const rivalryIds: string[] = []

  for (const [, summary] of summariesByPair) {
    const key = pairKey(summary.managerAId, summary.managerBId)
    const scoreInput: RivalryScoreInput = {
      totalMatchups: summary.totalMatchups,
      closeGameCount: summary.closeGameCount,
      playoffMeetings: input.playoffMeetingsByPair?.get(key) ?? 0,
      eliminationEvents: input.eliminationEventsByPair?.get(key) ?? 0,
      championshipMeetings: input.championshipMeetingsByPair?.get(key) ?? 0,
      upsetWins: summary.upsetWins,
      tradeCount: input.tradeCountByPair?.get(key) ?? 0,
      contentionOverlapScore: input.contentionOverlapByPair?.get(key) ?? 0,
      dramaEventCount: input.dramaEventsByPair?.get(key) ?? 0,
    }

    const score = calculateRivalryScore(scoreInput)
    const tier = resolveRivalryTier(score)

    const existing = await prisma.rivalryRecord.findUnique({
      where: {
        leagueId_managerAId_managerBId: {
          leagueId: input.leagueId,
          managerAId: summary.managerAId,
          managerBId: summary.managerBId,
        },
      },
      include: { events: true },
    })

    let rivalryId: string
    if (existing) {
      rivalryId = existing.id
      await prisma.rivalryRecord.update({
        where: { id: existing.id },
        data: {
          rivalryScore: score,
          rivalryTier: tier,
          ...(sportNorm != null && { sport: sportNorm }),
          updatedAt: new Date(),
        },
      })
      updated++
    } else {
      const createdRecord = await prisma.rivalryRecord.create({
        data: {
          leagueId: input.leagueId,
          sport: sportNorm!,
          managerAId: summary.managerAId,
          managerBId: summary.managerBId,
          rivalryScore: score,
          rivalryTier: tier,
        },
      })
      rivalryId = createdRecord.id
      created++
    }
    rivalryIds.push(rivalryId)

    // Append timeline events only when we first create the rivalry (avoid duplicate events on re-runs).
    if (!existing) {
      const tradeCount = input.tradeCountByPair?.get(key) ?? 0
      const events: { eventType: RivalryEventType; season: number | null; description: string }[] = []
      if (summary.totalMatchups > 0) {
        events.push({
          eventType: 'h2h_matchup',
          season: input.seasons[0] ?? null,
          description: `${summary.totalMatchups} head-to-head matchups`,
        })
      }
      if (summary.closeGameCount > 0) {
        events.push({
          eventType: 'close_game',
          season: input.seasons[0] ?? null,
          description: `${summary.closeGameCount} close games`,
        })
      }
      if (summary.upsetWins > 0) {
        events.push({
          eventType: 'upset_win',
          season: null,
          description: `${summary.upsetWins} upset wins`,
        })
      }
      if (tradeCount > 0) {
        events.push({
          eventType: 'trade',
          season: null,
          description: `${tradeCount} trades between pair`,
        })
      }
      for (const e of events) {
        await prisma.rivalryEvent.create({
          data: { rivalryId, eventType: e.eventType, season: e.season, description: e.description },
        })
      }
    }
  }

  return {
    processed: summariesByPair.size,
    created,
    updated,
    rivalryIds,
  }
}
