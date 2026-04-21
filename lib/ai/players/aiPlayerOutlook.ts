/**
 * Player outlook — deterministic trend signals + optional cache for LLM copy.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getCacheKeyForAiContext } from '@/lib/ai/cacheKeys'
import { getPlayerMarketSignal } from '@/lib/ai/memory/aiMemory'

export type PlayerOutlook = {
  playerId: string
  restOfSeasonOutlook: string
  dynastyOutlook: string
  riskProfile: 'low' | 'medium' | 'high'
  trend: 'buy' | 'sell' | 'hold'
  confidence: number
  explanation: string
}

export async function getPlayerOutlook(input: {
  playerId: string
  sport: string
  season: number
  isDynasty?: boolean
  leagueContext?: Record<string, unknown>
}): Promise<PlayerOutlook> {
  const hash = getCacheKeyForAiContext({
    playerId: input.playerId,
    sport: input.sport,
    season: input.season,
    isDynasty: Boolean(input.isDynasty),
    ctx: input.leagueContext ?? {},
  })

  try {
    const cached = await prisma.aiPlayerOutlookCache.findUnique({
      where: {
        playerId_sport_leagueContextHash: {
          playerId: input.playerId,
          sport: input.sport,
          leagueContextHash: hash,
        },
      },
    })
    if (cached && cached.expiresAt > new Date()) {
      const p = cached.outlookPayload as Record<string, unknown>
      return {
        playerId: input.playerId,
        restOfSeasonOutlook: String(p.restOfSeasonOutlook ?? ''),
        dynastyOutlook: String(p.dynastyOutlook ?? ''),
        riskProfile: (p.riskProfile as PlayerOutlook['riskProfile']) ?? 'medium',
        trend: (p.trend as PlayerOutlook['trend']) ?? 'hold',
        confidence: Number(p.confidence) || 0.6,
        explanation: String(p.explanation ?? ''),
      }
    }
  } catch {
    /* fall through */
  }

  const sig = await getPlayerMarketSignal(input.playerId, input.sport, input.season)
  const vol = sig.metrics?.volatilityScore ?? 30
  const riskProfile: PlayerOutlook['riskProfile'] = vol > 55 ? 'high' : vol > 30 ? 'medium' : 'low'
  const trend: PlayerOutlook['trend'] =
    (sig.metrics?.adpTrend7d ?? 0) < -0.02 ? 'buy' : (sig.metrics?.adpTrend7d ?? 0) > 0.02 ? 'sell' : 'hold'

  const restOfSeasonOutlook =
    sig.notes[0] ?? 'Role-stable profile based on available platform activity sample.'
  const dynastyOutlook = input.isDynasty
    ? 'Long-range value leans on age curve + pick capital — monitor offseason usage.'
    : 'Redraft focus: weekly ceiling/floor from usage and matchup schedule.'

  const outlook: PlayerOutlook = {
    playerId: input.playerId,
    restOfSeasonOutlook,
    dynastyOutlook,
    riskProfile,
    trend,
    confidence: 0.55 + (sig.metrics ? 0.15 : 0),
    explanation: [
      ...sig.notes,
      `Volatility index (0-100): ${vol.toFixed(0)} from sampled platform events.`,
    ].join(' '),
  }

  try {
    const expires = new Date(Date.now() + 6 * 60 * 60 * 1000)
    await prisma.aiPlayerOutlookCache.upsert({
      where: {
        playerId_sport_leagueContextHash: {
          playerId: input.playerId,
          sport: input.sport,
          leagueContextHash: hash,
        },
      },
      create: {
        id: randomUUID(),
        playerId: input.playerId,
        sport: input.sport,
        leagueContextHash: hash,
        outlookPayload: { ...outlook },
        expiresAt: expires,
      },
      update: {
        outlookPayload: { ...outlook },
        expiresAt: expires,
      },
    })
  } catch {
    /* non-fatal */
  }

  return outlook
}
