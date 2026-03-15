/**
 * BehaviorSignalAggregator — aggregates draft, trade, waiver, and lineup signals per manager.
 * Uses LeagueTradeHistory/LeagueTrade, WaiverClaim, DraftFact, and roster/lineup data where available.
 */

import { prisma } from '@/lib/prisma'

export interface BehaviorSignalsOutput {
  managerId: string
  leagueId: string
  sport: string
  tradeCount: number
  tradeFrequencyNorm: number
  waiverClaimCount: number
  waiverFocusNorm: number
  lineupChangeRate: number
  rookieAcquisitionRate: number
  vetAcquisitionRate: number
  picksTradedAway: number
  picksAcquired: number
  rebuildScore: number
  contentionScore: number
  aggressionNorm: number
  riskNorm: number
}

const MAX_TRADES_FOR_NORM = 20
const MAX_WAIVER_FOR_NORM = 50

/**
 * Resolve league platform id for trade history (Sleeper: platformLeagueId or dynasty seasons).
 */
async function getPlatformLeagueIds(leagueId: string): Promise<string[]> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { platform: true, platformLeagueId: true },
  })
  if (!league || league.platform !== 'sleeper') return []
  const dynasty = await prisma.leagueDynastySeason.findMany({
    where: { leagueId },
    select: { platformLeagueId: true },
  })
  if (dynasty.length > 0) return dynasty.map((d) => d.platformLeagueId).filter(Boolean)
  return league.platformLeagueId ? [league.platformLeagueId] : []
}

/**
 * Aggregate behavior signals for one manager in a league.
 * managerId is the stable key (e.g. rosterId as string). options.sleeperUsername for trade history lookup.
 */
export async function aggregateBehaviorSignals(
  leagueId: string,
  managerId: string,
  sport: string,
  options?: { sleeperUsername?: string; rosterId?: string }
): Promise<BehaviorSignalsOutput> {
  const platformIds = await getPlatformLeagueIds(leagueId)
  const username = options?.sleeperUsername ?? managerId

  let tradeCount = 0
  let playersGiven = 0
  let playersReceived = 0
  let picksGiven = 0
  let picksReceived = 0
  let youthCount = 0
  let vetCount = 0

  if (platformIds.length > 0) {
    const history = await prisma.leagueTradeHistory.findFirst({
      where: {
        sleeperLeagueId: { in: platformIds },
        sleeperUsername: username,
      },
      include: {
        trades: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    })
    if (history?.trades) {
      tradeCount = history.trades.length
      for (const t of history.trades) {
        const pGiven = (t.playersGiven as any[]) ?? []
        const pReceived = (t.playersReceived as any[]) ?? []
        const dkGiven = (t.picksGiven as any[]) ?? []
        const dkReceived = (t.picksReceived as any[]) ?? []
        playersGiven += pGiven.length
        playersReceived += pReceived.length
        picksGiven += dkGiven.length
        picksReceived += dkReceived.length
        for (const p of pReceived) {
          const age = p?.age ?? 0
          if (age > 0 && age < 25) youthCount++
          if (age >= 28) vetCount++
        }
      }
    }
  }

  let waiverClaimCount = 0
  const rosterIdForWaiver = options?.rosterId ?? managerId
  const roster = await prisma.roster.findFirst({
    where: { leagueId, ...(rosterIdForWaiver ? { id: rosterIdForWaiver } : {}) },
  })
  if (roster) {
    waiverClaimCount = await prisma.waiverClaim.count({
      where: { leagueId, rosterId: roster.id },
    })
  }

  const totalAcquisitions = youthCount + vetCount || 1
  const rookieRate = totalAcquisitions > 0 ? youthCount / totalAcquisitions : 0
  const vetRate = totalAcquisitions > 0 ? vetCount / totalAcquisitions : 0

  const tradeFrequencyNorm = Math.min(tradeCount / MAX_TRADES_FOR_NORM, 1) * 100
  const waiverFocusNorm = Math.min(waiverClaimCount / MAX_WAIVER_FOR_NORM, 1) * 100

  const rebuildScore = picksReceived > picksGiven ? Math.min((picksReceived - picksGiven) * 10, 100) : 0
  const contentionScore = picksGiven > picksReceived ? Math.min((picksGiven - picksReceived) * 10, 100) : 0

  const aggressionNorm = Math.min((tradeCount * 4 + waiverClaimCount * 0.5), 100)
  const riskNorm = rookieRate > 0.5 ? Math.min(50 + rookieRate * 50, 100) : Math.min(vetRate * 80, 100)

  return {
    managerId,
    leagueId,
    sport,
    tradeCount,
    tradeFrequencyNorm,
    waiverClaimCount,
    waiverFocusNorm,
    lineupChangeRate: 0,
    rookieAcquisitionRate: rookieRate * 100,
    vetAcquisitionRate: vetRate * 100,
    picksTradedAway: picksGiven,
    picksAcquired: picksReceived,
    rebuildScore,
    contentionScore,
    aggressionNorm,
    riskNorm,
  }
}
