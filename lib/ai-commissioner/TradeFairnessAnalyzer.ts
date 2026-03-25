import type { LeagueSport } from '@prisma/client'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'
import { toLeagueSport } from './SportCommissionerResolver'
import type { TradeFairnessInsight, TradeControversyLevel } from './types'

interface AnalyzeTradeFairnessInput {
  leagueId: string
  sport?: string | null
  season?: number | null
  limit?: number
}

function toSport(rawSport: string | null | undefined, fallback: LeagueSport): LeagueSport {
  if (!rawSport) return fallback
  return toLeagueSport(normalizeToSupportedSport(rawSport)) as LeagueSport
}

function toControversyLevel(fairnessScore: number): TradeControversyLevel {
  if (fairnessScore <= 45) return 'high'
  if (fairnessScore <= 65) return 'medium'
  return 'low'
}

function toImbalancePct(valueGiven: number | null | undefined, valueReceived: number | null | undefined): number {
  const given = Number(valueGiven ?? 0)
  const received = Number(valueReceived ?? 0)
  const baseline = Math.max(Math.abs(given), Math.abs(received), 1)
  return Math.round((Math.abs(given - received) / baseline) * 100)
}

function toFairnessScore(imbalancePct: number): number {
  return Math.max(0, Math.min(100, 100 - imbalancePct))
}

function buildTradeSummary(input: {
  transactionId: string
  imbalancePct: number
  partnerName: string | null
  controversyLevel: TradeControversyLevel
}): string {
  const partner = input.partnerName?.trim() ? input.partnerName.trim() : 'a league manager'
  const tone =
    input.controversyLevel === 'high'
      ? 'Immediate commissioner review recommended.'
      : input.controversyLevel === 'medium'
        ? 'Review context and manager intent.'
        : 'Looks generally healthy, but track follow-up reactions.'
  return `Trade ${input.transactionId} with ${partner} shows an estimated ${input.imbalancePct}% value imbalance. ${tone}`
}

function toInsight(input: {
  tradeId: string
  transactionId: string
  createdAt: Date
  sport: LeagueSport
  valueGiven: number | null
  valueReceived: number | null
  partnerName: string | null
  partnerRosterId: number | null
}): TradeFairnessInsight {
  const imbalancePct = toImbalancePct(input.valueGiven, input.valueReceived)
  const fairnessScore = toFairnessScore(imbalancePct)
  const controversyLevel = toControversyLevel(fairnessScore)
  return {
    tradeId: input.tradeId,
    transactionId: input.transactionId,
    createdAt: input.createdAt.toISOString(),
    sport: input.sport,
    fairnessScore,
    imbalancePct,
    controversyLevel,
    summary: buildTradeSummary({
      transactionId: input.transactionId,
      imbalancePct,
      partnerName: input.partnerName,
      controversyLevel,
    }),
    relatedManagerIds: input.partnerRosterId != null ? [String(input.partnerRosterId)] : [],
  }
}

export async function analyzeTradeFairness(
  input: AnalyzeTradeFairnessInput
): Promise<TradeFairnessInsight[]> {
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { id: true, sport: true, platformLeagueId: true },
  })
  if (!league) throw new Error('League not found')

  const limit = Math.max(1, Math.min(20, input.limit ?? 6))
  const resolvedSport = toLeagueSport(input.sport ?? league.sport) as LeagueSport
  const trades = await prisma.leagueTrade.findMany({
    where: {
      history: { sleeperLeagueId: league.platformLeagueId },
      ...(input.season != null ? { season: input.season } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(limit * 3, 12),
    select: {
      id: true,
      transactionId: true,
      sport: true,
      partnerName: true,
      partnerRosterId: true,
      valueGiven: true,
      valueReceived: true,
      createdAt: true,
    },
  })

  const insights = trades
    .map((trade) =>
      toInsight({
        tradeId: trade.id,
        transactionId: trade.transactionId,
        createdAt: trade.createdAt,
        sport: toSport(trade.sport, resolvedSport),
        valueGiven: trade.valueGiven,
        valueReceived: trade.valueReceived,
        partnerName: trade.partnerName,
        partnerRosterId: trade.partnerRosterId,
      })
    )
    .filter((trade) => trade.sport === resolvedSport)
    .sort((a, b) => a.fairnessScore - b.fairnessScore || b.createdAt.localeCompare(a.createdAt))

  return insights.slice(0, limit)
}

export async function getTradeFairnessByTradeId(input: {
  leagueId: string
  tradeId: string
}): Promise<TradeFairnessInsight | null> {
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { id: true, sport: true, platformLeagueId: true },
  })
  if (!league) return null

  const trade = await prisma.leagueTrade.findFirst({
    where: {
      id: input.tradeId,
      history: { sleeperLeagueId: league.platformLeagueId },
    },
    select: {
      id: true,
      transactionId: true,
      sport: true,
      partnerName: true,
      partnerRosterId: true,
      valueGiven: true,
      valueReceived: true,
      createdAt: true,
    },
  })
  if (!trade) return null

  return toInsight({
    tradeId: trade.id,
    transactionId: trade.transactionId,
    createdAt: trade.createdAt,
    sport: toSport(trade.sport, toLeagueSport(league.sport)),
    valueGiven: trade.valueGiven,
    valueReceived: trade.valueReceived,
    partnerName: trade.partnerName,
    partnerRosterId: trade.partnerRosterId,
  })
}

export function explainTradeFairnessInsight(insight: TradeFairnessInsight): string {
  const severityText =
    insight.controversyLevel === 'high'
      ? 'high controversy'
      : insight.controversyLevel === 'medium'
        ? 'moderate controversy'
        : 'low controversy'
  return `Trade fairness score ${insight.fairnessScore}/100 (${severityText}) with an estimated ${insight.imbalancePct}% value gap. ${insight.summary}`
}
