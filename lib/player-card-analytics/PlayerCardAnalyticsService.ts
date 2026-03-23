/**
 * PlayerCardAnalyticsService — aggregates AI insights, meta trends, matchup predictions, career projections for player cards.
 */

import { prisma } from '@/lib/prisma'
import { openaiChatText } from '@/lib/openai-client'
import { getPlayerMetaTrendsForMeta } from '@/lib/global-meta-engine/MetaQueryService'
import { getPlayerAnalytics } from '@/lib/player-analytics'
import { normalizeSportForMeta } from '@/lib/global-meta-engine/SportMetaResolver'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getTrendFeedItemForPlayer } from '@/lib/player-trend/TrendDetectionService'
import type {
  PlayerCardAnalyticsPayload,
  PlayerCardMetaTrend,
  PlayerCardMatchupPrediction,
  PlayerCardCareerProjection,
} from './types'

type NormalizedMetaTrend = {
  playerId: string
  trendScore: number
  addRate: number
  dropRate: number
  tradeRate: number
  draftRate: number
  trendingDirection: string
  updatedAt: Date | null
}

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

function deriveOpponentTier(input: {
  expectedPointsPerGame?: number | null
  trendingDirection?: string | null
  volatility?: number | null
}): string | undefined {
  const ppg = input.expectedPointsPerGame
  const trend = String(input.trendingDirection ?? '').toLowerCase()
  const volatility = input.volatility ?? null
  if (ppg == null) return undefined

  const trendBoost = trend === 'hot' || trend === 'rising' || trend === 'up'
  const trendPenalty = trend === 'cold' || trend === 'falling' || trend === 'down'
  const highVolatility = volatility != null && volatility >= 65

  if (ppg >= 18 || (ppg >= 15 && trendBoost)) return 'favorable'
  if (ppg <= 9 || (ppg <= 11 && (trendPenalty || highVolatility))) return 'tough'
  return 'neutral'
}

function buildFallbackInsight(input: {
  playerName: string
  trendDirection?: string | null
  expectedPointsPerGame?: number | null
  breakoutProbability?: number | null
}): string {
  const trend = input.trendDirection ?? 'neutral'
  const ppg = input.expectedPointsPerGame
  const breakout = input.breakoutProbability
  const ppgCopy =
    ppg != null
      ? `Current outlook sits around ${ppg.toFixed(1)} points per game.`
      : 'Current production outlook is stable.'
  const breakoutCopy =
    breakout != null
      ? `Long-term profile shows roughly ${breakout.toFixed(0)}% breakout probability.`
      : 'Long-term projection is still developing.'
  return `${input.playerName} is currently trending ${trend}. ${ppgCopy} ${breakoutCopy}`
}

async function resolvePlayerId(args: {
  playerId?: string | null
  playerName: string
  sport: string
}): Promise<string | null> {
  const incoming = args.playerId?.trim()
  if (incoming) return incoming
  const row = await prisma.player.findFirst({
    where: {
      sport: args.sport,
      name: { equals: args.playerName, mode: 'insensitive' },
    },
    select: { id: true },
  })
  return row?.id ?? null
}

function normalizeMetaTrendRow(raw: {
  playerId: string
  trendScore: number
  addRate: number
  dropRate: number
  tradeRate: number
  draftRate: number
  trendingDirection: string
  updatedAt: Date
}): NormalizedMetaTrend {
  return {
    playerId: raw.playerId,
    trendScore: raw.trendScore ?? 0,
    addRate: raw.addRate ?? 0,
    dropRate: raw.dropRate ?? 0,
    tradeRate: raw.tradeRate ?? 0,
    draftRate: raw.draftRate ?? 0,
    trendingDirection: raw.trendingDirection ?? 'neutral',
    updatedAt: raw.updatedAt ?? null,
  }
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
  const playerId = await resolvePlayerId({
    playerId: input.playerId,
    playerName: name,
    sport,
  })

  const [analytics, careerRow, trendFeedItem] = await Promise.all([
    getPlayerAnalytics(name, input.season ?? undefined),
    playerId
      ? prisma.playerCareerProjection.findFirst({
          where: { sport, playerId },
          orderBy: { season: 'desc' },
        })
      : Promise.resolve(null),
    playerId ? getTrendFeedItemForPlayer(playerId, sport).catch(() => null) : Promise.resolve(null),
  ])

  let metaForPlayer: NormalizedMetaTrend | null = null
  if (playerId != null) {
    const dbMetaRow = await prisma.playerMetaTrend
      .findUnique({
        where: {
          uniq_player_meta_trend_player_sport: {
            playerId,
            sport: metaSport,
          },
        },
      })
      .catch(() => null)
    if (dbMetaRow) {
      metaForPlayer = normalizeMetaTrendRow({
        playerId: dbMetaRow.playerId,
        trendScore: dbMetaRow.trendScore,
        addRate: dbMetaRow.addRate,
        dropRate: dbMetaRow.dropRate,
        tradeRate: dbMetaRow.tradeInterest,
        draftRate: dbMetaRow.draftFrequency,
        trendingDirection: dbMetaRow.trendingDirection,
        updatedAt: dbMetaRow.updatedAt,
      })
    }
  }

  const normName = normalizeName(name)
  if (!metaForPlayer) {
    const metaTrendsList = await getPlayerMetaTrendsForMeta({ sport: metaSport, limit: 500 })
    const fromList = metaTrendsList.find(
      (t) => normalizeName(t.playerId) === normName || t.playerId === playerId
    )
    if (fromList) {
      metaForPlayer = normalizeMetaTrendRow({
        playerId: fromList.playerId,
        trendScore: fromList.trendScore,
        addRate: fromList.addRate,
        dropRate: fromList.dropRate,
        tradeRate: fromList.tradeRate,
        draftRate: fromList.draftRate,
        trendingDirection: fromList.trendingDirection,
        updatedAt: fromList.updatedAt,
      })
    }
  }

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

  const opponentTier = deriveOpponentTier({
    expectedPointsPerGame: analytics?.expectedFantasyPointsPerGame ?? null,
    trendingDirection: metaForPlayer?.trendingDirection ?? trendFeedItem?.direction ?? null,
    volatility: analytics?.weeklyVolatility ?? careerRow?.volatilityScore ?? null,
  })

  const trendLabel =
    metaForPlayer?.trendingDirection ??
    trendFeedItem?.direction ??
    null

  const matchupPrediction: PlayerCardMatchupPrediction | null = analytics
    ? {
        expectedPoints: analytics.expectedFantasyPoints ?? null,
        expectedPointsPerGame: analytics.expectedFantasyPointsPerGame ?? null,
        opponentTier,
        outlook:
          analytics.expectedFantasyPointsPerGame != null
            ? `Expected ${analytics.expectedFantasyPointsPerGame.toFixed(1)} PPG (${opponentTier ?? 'neutral'} matchup tier).`
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
  if (trendFeedItem) {
    contextParts.push(
      `Recent deterministic trend classification: ${trendFeedItem.trendType} (${trendFeedItem.direction}), score ${trendFeedItem.trendScore.toFixed(1)}.`
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
      aiInsights = null
    }
  }
  if (!aiInsights) {
    aiInsights = buildFallbackInsight({
      playerName: name || 'This player',
      trendDirection: trendLabel,
      expectedPointsPerGame: analytics?.expectedFantasyPointsPerGame ?? null,
      breakoutProbability: careerRow?.breakoutProbability ?? null,
    })
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
