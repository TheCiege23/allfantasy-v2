/**
 * PlayerCardAnalyticsService — aggregates AI insights, meta trends, matchup predictions, career projections for player cards.
 */

import { prisma } from '@/lib/prisma'
import { openaiChatText } from '@/lib/openai-client'
import { getPlayerMetaTrendsForMeta } from '@/lib/global-meta-engine/MetaQueryService'
import { getPlayerAnalytics } from '@/lib/player-analytics'
import { normalizeSportForMeta } from '@/lib/global-meta-engine/SportMetaResolver'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type {
  PlayerCardAnalyticsPayload,
  PlayerCardMetaTrend,
  PlayerCardMatchupPrediction,
  PlayerCardCareerProjection,
} from './types'

function normalizeName(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[.'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface GetPlayerCardInput {
  playerId?: string | null
  playerName: string
  position?: string | null
  team?: string | null
  sport?: string | null
  season?: string | null
}

/**
 * Build full player card payload: AI insights, meta trends, matchup prediction, career projection.
 */
export async function getPlayerCardAnalytics(
  input: GetPlayerCardInput
): Promise<PlayerCardAnalyticsPayload> {
  const sport = normalizeToSupportedSport(input.sport)
  const metaSport = normalizeSportForMeta(sport)
  const name = input.playerName?.trim() ?? ''
  const playerId = input.playerId ?? null

  const [analytics, metaTrendsList, careerRow] = await Promise.all([
    getPlayerAnalytics(name, input.season ?? undefined),
    getPlayerMetaTrendsForMeta({ sport: metaSport, limit: 500 }),
    playerId
      ? prisma.playerCareerProjection.findFirst({
          where: { sport, playerId },
          orderBy: { season: 'desc' },
        })
      : Promise.resolve(null),
  ])

  const normName = normalizeName(name)
  const metaForPlayer = metaTrendsList.find(
    (t) => normalizeName(t.playerId) === normName || t.playerId === playerId
  )

  const metaTrends: PlayerCardMetaTrend | null = metaForPlayer
    ? {
        trendScore: metaForPlayer.trendScore ?? 0,
        addRate: metaForPlayer.addRate ?? 0,
        dropRate: metaForPlayer.dropRate ?? 0,
        tradeRate: metaForPlayer.tradeRate ?? 0,
        draftRate: metaForPlayer.draftRate ?? 0,
        trendingDirection: metaForPlayer.trendingDirection ?? 'neutral',
        updatedAt: metaForPlayer.updatedAt?.toISOString?.() ?? '',
      }
    : null

  const matchupPrediction: PlayerCardMatchupPrediction | null = analytics
    ? {
        expectedPoints: analytics.expectedFantasyPoints ?? null,
        expectedPointsPerGame: analytics.expectedFantasyPointsPerGame ?? null,
        outlook:
          analytics.expectedFantasyPointsPerGame != null
            ? `Expected ${analytics.expectedFantasyPointsPerGame.toFixed(1)} PPG (season).`
            : undefined,
      }
    : null

  const careerProjection: PlayerCardCareerProjection | null = careerRow
    ? {
        projectedPointsYear1: careerRow.projectedPointsYear1,
        projectedPointsYear2: careerRow.projectedPointsYear2,
        projectedPointsYear3: careerRow.projectedPointsYear3,
        projectedPointsYear4: careerRow.projectedPointsYear4,
        projectedPointsYear5: careerRow.projectedPointsYear5,
        breakoutProbability: careerRow.breakoutProbability,
        declineProbability: careerRow.declineProbability,
        volatilityScore: careerRow.volatilityScore,
        season: careerRow.season,
      }
    : null

  const contextParts: string[] = []
  if (analytics) {
    contextParts.push(
      `Position: ${analytics.position}. Team: ${analytics.currentTeam ?? 'FA'}.`
    )
    if (analytics.fantasyPointsPerGame != null) {
      contextParts.push(`FP/G: ${analytics.fantasyPointsPerGame.toFixed(1)}.`)
    }
    if (analytics.expectedFantasyPointsPerGame != null) {
      contextParts.push(`Expected FP/G: ${analytics.expectedFantasyPointsPerGame.toFixed(1)}.`)
    }
    if (analytics.draft?.currentAdp != null) {
      contextParts.push(`ADP: ${analytics.draft.currentAdp.toFixed(1)}.`)
    }
  }
  if (metaForPlayer) {
    contextParts.push(
      `Trend: ${metaForPlayer.trendingDirection}. Trend score: ${(metaForPlayer.trendScore ?? 0).toFixed(1)}. Add rate: ${((metaForPlayer.addRate ?? 0) * 100).toFixed(0)}%.`
    )
  }
  if (careerRow) {
    contextParts.push(
      `Career projection: Y1 ${careerRow.projectedPointsYear1} pts, breakout prob ${careerRow.breakoutProbability.toFixed(0)}%, decline ${careerRow.declineProbability.toFixed(0)}%.`
    )
  }

  let aiInsights: string | null = null
  if (contextParts.length > 0) {
    try {
      const res = await openaiChatText({
        messages: [
          {
            role: 'system',
            content:
              'You are a fantasy sports analyst. In 2-3 short sentences, give actionable insight about this player for a player card. Be concise. No bullet lists.',
          },
          {
            role: 'user',
            content: `Player: ${name}. ${contextParts.join(' ')}`,
          },
        ],
        temperature: 0.5,
        maxTokens: 180,
      })
      if (res.ok && res.text?.trim()) aiInsights = res.text.trim()
    } catch {
      // ignore
    }
  }

  return {
    playerId,
    playerName: name || 'Unknown',
    position: analytics?.position ?? input.position ?? null,
    team: analytics?.currentTeam ?? input.team ?? null,
    sport,
    aiInsights,
    metaTrends,
    matchupPrediction,
    careerProjection,
  }
}
