/**
 * BehaviorSignalAggregator — aggregates draft, trade, waiver, and lineup signals per manager.
 * Uses LeagueTradeHistory/LeagueTrade, WaiverClaim, DraftFact, and roster/lineup data where available.
 */

import { prisma } from '@/lib/prisma'
import { getBehaviorCalibration, normalizeSportForPsych } from './SportBehaviorResolver'

export interface BehaviorSignalsOutput {
  managerId: string
  leagueId: string
  sport: string
  tradeCount: number
  tradeFrequencyNorm: number
  tradeTimingLateRate: number
  waiverClaimCount: number
  waiverFocusNorm: number
  lineupChangeRate: number
  benchingPatternScore: number
  rookieAcquisitionRate: number
  vetAcquisitionRate: number
  draftPickCount: number
  draftEarlyRoundRate: number
  positionPriorityConcentration: number
  picksTradedAway: number
  picksAcquired: number
  rebuildScore: number
  contentionScore: number
  aggressionNorm: number
  riskNorm: number
}

const MAX_TRADES_FOR_NORM = 20
const MAX_WAIVER_FOR_NORM = 50
const MAX_LINEUP_VOLATILITY = 100

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

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function seasonDateRange(season?: number | null): { from: Date; to: Date } | null {
  if (season == null) return null
  const from = new Date(Date.UTC(season, 0, 1, 0, 0, 0))
  const to = new Date(Date.UTC(season + 1, 0, 1, 0, 0, 0))
  return { from, to }
}

function computePositionConcentration(positionCounts: Map<string, number>): number {
  const total = [...positionCounts.values()].reduce((sum, n) => sum + n, 0)
  if (total <= 0) return 0
  const top = Math.max(...positionCounts.values())
  return Math.min(100, (top / total) * 100)
}

function computeLineupVolatility(lineups: string[][]): number {
  if (lineups.length < 2) return 0
  let totalChangeRatio = 0
  let comparisons = 0
  for (let i = 1; i < lineups.length; i++) {
    const prev = new Set(lineups[i - 1])
    const curr = new Set(lineups[i])
    const union = new Set([...prev, ...curr]).size || 1
    let same = 0
    for (const p of curr) if (prev.has(p)) same++
    const changed = union - same
    totalChangeRatio += changed / union
    comparisons++
  }
  return Math.min(100, (totalChangeRatio / Math.max(1, comparisons)) * 100)
}

/**
 * Aggregate behavior signals for one manager in a league.
 * managerId is the stable key (e.g. rosterId as string). options.sleeperUsername for trade history lookup.
 */
export async function aggregateBehaviorSignals(
  leagueId: string,
  managerId: string,
  sport: string,
  options?: { sleeperUsername?: string; rosterId?: string; season?: number | null }
): Promise<BehaviorSignalsOutput> {
  const sportNorm = normalizeSportForPsych(sport) ?? sport
  const calibration = normalizeSportForPsych(sportNorm)
    ? getBehaviorCalibration(normalizeSportForPsych(sportNorm)!)
    : { lineupVolatilityWeight: 1, lateTradeWeekThreshold: 10, rookiePreferenceWeight: 1 }
  const seasonRange = seasonDateRange(options?.season)
  const platformIds = await getPlatformLeagueIds(leagueId)
  const username = options?.sleeperUsername ?? managerId

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  })
  const team = league?.teams.find(
    (t) => t.externalId === managerId || t.id === managerId || t.ownerName === username
  )
  const managerCandidates = new Set<string>(
    [managerId, username, team?.externalId, team?.id, team?.ownerName].filter(
      (v): v is string => Boolean(v && String(v).trim().length > 0)
    )
  )

  let tradeCount = 0
  let lateTradeCount = 0
  let playersGiven = 0
  let playersReceived = 0
  let picksGiven = 0
  let picksReceived = 0
  let youthCount = 0
  let vetCount = 0

  const txFacts = await prisma.transactionFact.findMany({
    where: {
      leagueId,
      sport: sportNorm,
      type: { in: ['trade', 'TRADE'] },
      ...(options?.season != null ? { season: options.season } : {}),
      OR: [
        { managerId: { in: [...managerCandidates] } },
        { rosterId: { in: [...managerCandidates] } },
      ],
    },
    select: { transactionId: true, weekOrPeriod: true },
  })
  if (txFacts.length > 0) {
    const uniqueIds = new Set(txFacts.map((t) => t.transactionId))
    tradeCount = uniqueIds.size
    lateTradeCount = txFacts.filter(
      (t) => (t.weekOrPeriod ?? 0) >= calibration.lateTradeWeekThreshold
    ).length
  }

  if (platformIds.length > 0) {
    const historyRows = await prisma.leagueTradeHistory.findMany({
      where: {
        sleeperLeagueId: { in: platformIds },
        sleeperUsername: { in: [...managerCandidates] },
      },
      include: {
        trades: { orderBy: { createdAt: 'desc' }, take: 200 },
      },
    })
    for (const history of historyRows) {
      for (const t of history.trades) {
        if (options?.season != null && t.season !== options.season) continue
        const pGiven = (t.playersGiven as any[]) ?? []
        const pReceived = (t.playersReceived as any[]) ?? []
        const dkGiven = (t.picksGiven as any[]) ?? []
        const dkReceived = (t.picksReceived as any[]) ?? []
        playersGiven += pGiven.length
        playersReceived += pReceived.length
        picksGiven += dkGiven.length
        picksReceived += dkReceived.length
        if ((t.week ?? 0) >= calibration.lateTradeWeekThreshold) lateTradeCount++
        for (const p of pReceived) {
          const age = p?.age ?? 0
          if (age > 0 && age < 25) youthCount++
          if (age >= 28) vetCount++
        }
      }
    }
    // Keep the larger trade sample between transaction facts and trade history.
    tradeCount = Math.max(
      tradeCount,
      historyRows.reduce(
        (sum, h) =>
          sum +
          h.trades.filter((t) => (options?.season != null ? t.season === options.season : true))
            .length,
        0
      )
    )
  }

  let waiverClaimCount = 0
  const rosterIdForWaiver = options?.rosterId ?? managerId
  const roster = await prisma.roster.findFirst({
    where: {
      leagueId,
      OR: [
        { id: rosterIdForWaiver },
        { platformUserId: { in: [...managerCandidates] } },
      ],
    },
  })
  if (roster) {
    const waiverWhere = {
      leagueId,
      rosterId: roster.id,
      ...(sportNorm ? { sportType: sportNorm } : {}),
      ...(seasonRange
        ? { createdAt: { gte: seasonRange.from, lt: seasonRange.to } }
        : {}),
    }
    waiverClaimCount = await prisma.waiverClaim.count({
      where: waiverWhere,
    })
  }

  const draftFacts = await prisma.draftFact.findMany({
    where: {
      leagueId,
      sport: sportNorm,
      ...(options?.season != null ? { season: options.season } : {}),
      managerId: { in: [...managerCandidates] },
    },
    select: { playerId: true, round: true },
  })
  const draftPickCount = draftFacts.length
  const earlyRoundPickCount = draftFacts.filter((d) => d.round <= 3).length
  const draftEarlyRoundRate =
    draftPickCount > 0 ? (earlyRoundPickCount / draftPickCount) * 100 : 0

  const positionCounts = new Map<string, number>()
  if (draftFacts.length > 0) {
    const ids = [...new Set(draftFacts.map((d) => d.playerId))]
    const playerRows = await prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, position: true },
    })
    const posById = new Map(
      playerRows.map((p) => [p.id, (p.position ?? 'UNK').toUpperCase()])
    )
    for (const d of draftFacts) {
      const pos = posById.get(d.playerId) ?? 'UNK'
      positionCounts.set(pos, (positionCounts.get(pos) ?? 0) + 1)
    }
  }
  const positionPriorityConcentration = computePositionConcentration(positionCounts)

  const snapshots = await prisma.rosterSnapshot.findMany({
    where: {
      leagueId,
      ...(options?.season != null ? { season: options.season } : {}),
      teamId: { in: [...managerCandidates] },
    },
    orderBy: [{ season: 'asc' }, { weekOrPeriod: 'asc' }],
    select: { lineupPlayers: true },
  })
  const lineups = snapshots.map((s) =>
    parseJsonArray(s.lineupPlayers).map((v) => String(v))
  )
  const lineupChangeRateRaw = computeLineupVolatility(lineups)
  const lineupChangeRate = Math.min(
    MAX_LINEUP_VOLATILITY,
    lineupChangeRateRaw * calibration.lineupVolatilityWeight
  )
  const benchingPatternScore = Math.min(100, lineupChangeRate * 0.9)

  const totalAcquisitions = youthCount + vetCount + draftPickCount || 1
  const rookieRate =
    totalAcquisitions > 0
      ? Math.min(
          1,
          ((youthCount + draftPickCount * calibration.rookiePreferenceWeight) /
            totalAcquisitions)
        )
      : 0
  const vetRate = totalAcquisitions > 0 ? vetCount / totalAcquisitions : 0

  const tradeFrequencyNorm = Math.min(tradeCount / MAX_TRADES_FOR_NORM, 1) * 100
  const waiverFocusNorm = Math.min(waiverClaimCount / MAX_WAIVER_FOR_NORM, 1) * 100
  const tradeTimingLateRate =
    tradeCount > 0 ? Math.min(100, (lateTradeCount / tradeCount) * 100) : 0

  const standingsFact = await prisma.seasonStandingFact.findFirst({
    where: {
      leagueId,
      sport: sportNorm,
      ...(options?.season != null ? { season: options.season } : {}),
      teamId: { in: [...managerCandidates] },
    },
    orderBy: { createdAt: 'desc' },
    select: { wins: true, losses: true, rank: true },
  })
  const standingWinRate =
    standingsFact && standingsFact.wins + standingsFact.losses > 0
      ? standingsFact.wins / (standingsFact.wins + standingsFact.losses)
      : 0
  const standingRankBoost =
    standingsFact?.rank != null ? Math.max(0, 20 - standingsFact.rank) : 0

  const rebuildScore = picksReceived > picksGiven
    ? Math.min((picksReceived - picksGiven) * 10 + rookieRate * 20, 100)
    : Math.min(rookieRate * 25, 100)
  const contentionScore = picksGiven > picksReceived
    ? Math.min((picksGiven - picksReceived) * 10 + standingWinRate * 40 + standingRankBoost, 100)
    : Math.min(standingWinRate * 35 + standingRankBoost, 100)

  const aggressionNorm = Math.min(
    tradeFrequencyNorm * 0.45 + waiverFocusNorm * 0.25 + lineupChangeRate * 0.3,
    100
  )
  const riskNorm = Math.min(
    rookieRate * 55 + tradeTimingLateRate * 0.25 + lineupChangeRate * 0.2,
    100
  )

  return {
    managerId,
    leagueId,
    sport: sportNorm,
    tradeCount,
    tradeFrequencyNorm,
    tradeTimingLateRate,
    waiverClaimCount,
    waiverFocusNorm,
    lineupChangeRate,
    benchingPatternScore,
    rookieAcquisitionRate: rookieRate * 100,
    vetAcquisitionRate: vetRate * 100,
    draftPickCount,
    draftEarlyRoundRate,
    positionPriorityConcentration,
    picksTradedAway: picksGiven,
    picksAcquired: picksReceived,
    rebuildScore,
    contentionScore,
    aggressionNorm,
    riskNorm,
  }
}
