/**
 * User tendency rollups from platform events (drafts, trades, waivers, AI outcomes).
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { AI_EVENT_TYPES } from '@/lib/ai/events/aiEventTypes'

export type UserTendencyRow = {
  userId: string
  sport: string
  preferredPositions: Record<string, number>
  earlyRoundBehavior: Record<string, number>
  rookieBiasScore: number | null
  riskToleranceScore: number | null
  tradeAggressionScore: number | null
  waiverActivityScore: number | null
  qbWaitScore: number | null
  rbHeavyScore: number | null
  wrHeavyScore: number | null
  zeroRbScore: number | null
  heroRbScore: number | null
  aiFollowRate: number | null
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export async function buildUserTendencies(params: { userId: string; sport?: string }): Promise<UserTendencyRow | null> {
  const { userId, sport = '' } = params
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)

  try {
    const events = await prisma.aiPlatformEvent.findMany({
      where: {
        userId,
        ...(sport ? { sport } : {}),
        createdAt: { gte: since },
      },
      select: { eventType: true, payload: true },
      take: 12000,
      orderBy: { createdAt: 'desc' },
    })

    const posEarly: Record<string, number> = {}
    let picks = 0
    let qbLate = 0
    let rb = 0
    let wr = 0
    let rookies = 0
    let trades = 0
    let waivers = 0
    let aiFollow = 0
    let aiTotal = 0

    for (const ev of events) {
      const pl = (ev.payload ?? {}) as Record<string, unknown>
      const pos = String(pl.position ?? '').toUpperCase()
      const round = typeof pl.round === 'number' ? pl.round : Number(pl.round ?? 99)

      if (ev.eventType === AI_EVENT_TYPES.DRAFT_PICK_MADE || ev.eventType === AI_EVENT_TYPES.AUTO_PICK_MADE) {
        picks += 1
        if (pos) {
          posEarly[pos] = (posEarly[pos] ?? 0) + (round <= 5 ? 1 : 0)
          if (pos === 'RB') rb += 1
          if (pos === 'WR') wr += 1
          if (pos === 'QB' && round >= 9) qbLate += 1
        }
        if (pl.isRookie || pl.is_rookie) rookies += 1
      } else if (ev.eventType === AI_EVENT_TYPES.TRADE_ACCEPTED) {
        trades += 1
      } else if (
        ev.eventType === AI_EVENT_TYPES.WAIVER_BID_SUBMITTED ||
        ev.eventType === AI_EVENT_TYPES.WAIVER_CLAIM_WON
      ) {
        waivers += 1
      } else if (ev.eventType === AI_EVENT_TYPES.AI_RECOMMENDATION_FOLLOWED) {
        aiFollow += 1
        aiTotal += 1
      } else if (ev.eventType === AI_EVENT_TYPES.AI_RECOMMENDATION_IGNORED) {
        aiTotal += 1
      }
    }

    const preferredPositions: Record<string, number> = {}
    const posSum = rb + wr + 1
    preferredPositions.RB = clamp01(rb / posSum)
    preferredPositions.WR = clamp01(wr / posSum)

    const earlyRoundBehavior = { ...posEarly }
    const rookieBiasScore = picks > 0 ? clamp01(rookies / picks) : null
    const qbWaitScore = picks > 0 ? clamp01(qbLate / Math.max(1, picks * 0.15)) : null
    const rbHeavyScore = picks > 0 ? clamp01(rb / picks) : null
    const wrHeavyScore = picks > 0 ? clamp01(wr / picks) : null
    const zeroRbScore = picks > 0 ? clamp01(1 - rb / picks) : null
    const heroRbScore = rbHeavyScore
    const tradeAggressionScore = trades > 0 ? clamp01(Math.log1p(trades) / 6) : null
    const waiverActivityScore = waivers > 0 ? clamp01(Math.log1p(waivers) / 6) : null
    const riskToleranceScore = rookieBiasScore
    const aiFollowRate = aiTotal > 0 ? clamp01(aiFollow / aiTotal) : null

    const row: UserTendencyRow = {
      userId,
      sport,
      preferredPositions,
      earlyRoundBehavior,
      rookieBiasScore,
      riskToleranceScore,
      tradeAggressionScore,
      waiverActivityScore,
      qbWaitScore,
      rbHeavyScore,
      wrHeavyScore,
      zeroRbScore,
      heroRbScore,
      aiFollowRate,
    }

    await prisma.aiUserTendency.upsert({
      where: { userId_sport: { userId, sport } },
      create: {
        id: randomUUID(),
        userId,
        sport,
        preferredPositions,
        earlyRoundBehavior,
        rookieBiasScore,
        riskToleranceScore,
        tradeAggressionScore,
        waiverActivityScore,
        qbWaitScore,
        rbHeavyScore,
        wrHeavyScore,
        zeroRbScore,
        heroRbScore,
        aiFollowRate,
      },
      update: {
        preferredPositions,
        earlyRoundBehavior,
        rookieBiasScore,
        riskToleranceScore,
        tradeAggressionScore,
        waiverActivityScore,
        qbWaitScore,
        rbHeavyScore,
        wrHeavyScore,
        zeroRbScore,
        heroRbScore,
        aiFollowRate,
      },
    })

    return row
  } catch (e) {
    console.warn('[buildUserTendencies]', e instanceof Error ? e.message : e)
    return null
  }
}
