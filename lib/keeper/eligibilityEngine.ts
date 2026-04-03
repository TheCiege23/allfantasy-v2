import type { League } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { KeeperEligibilityRow } from './types'

function computeCostRound(
  league: Pick<
    League,
    | 'keeperCostSystem'
    | 'keeperRoundPenalty'
    | 'keeperInflationRate'
    | 'keeperAuctionPctIncrease'
  >,
  originalRound: number | null,
  yearsKept: number,
): { costRound: number | null; costLabel: string | null; costAuction: number | null } {
  const sys = league.keeperCostSystem ?? 'round_based'
  const pen = league.keeperRoundPenalty ?? 1
  const infl = league.keeperInflationRate ?? 1
  const aucPct = league.keeperAuctionPctIncrease ?? 0.2

  if (sys === 'free') {
    return { costRound: null, costLabel: 'Free', costAuction: null }
  }

  if (sys === 'auction_value') {
    const base = 40
    const cost = base * (1 + aucPct) * (1 + yearsKept * 0.1)
    return { costRound: null, costLabel: `$${cost.toFixed(0)}`, costAuction: cost }
  }

  const or = originalRound ?? 10
  if (sys === 'inflation') {
    const costRound = Math.max(1, or - pen * (yearsKept + 1))
    return { costRound, costLabel: `Round ${costRound}`, costAuction: null }
  }

  const costRound = Math.max(1, or - pen)
  return { costRound, costLabel: `Round ${costRound}`, costAuction: null }
}

export async function computeKeeperEligibility(
  leagueId: string,
  outgoingSeasonId: string,
): Promise<KeeperEligibilityRow[]> {
  const league = await prisma.league.findFirst({ where: { id: leagueId } })
  if (!league) throw new Error('League not found')

  const rosters = await prisma.redraftRoster.findMany({
    where: { seasonId: outgoingSeasonId, leagueId },
    include: { players: true },
  })

  const out: KeeperEligibilityRow[] = []

  for (const roster of rosters) {
    for (const p of roster.players) {
      if (p.droppedAt) continue

      const yearsKept = 0
      let ineligibleReason: string | null = null
      let isEligible = true

      const maxY = league.keeperMaxYears ?? 3
      if (maxY > 0 && yearsKept >= maxY) {
        isEligible = false
        ineligibleReason = 'max_years_reached'
      }

      if (isEligible && league.keeperWaiverAllowed === false && p.acquisitionType === 'waiver') {
        isEligible = false
        ineligibleReason = 'not_drafted'
      }

      const originalRound = 8
      const { costRound, costLabel, costAuction } = computeCostRound(league, originalRound, yearsKept)

      if (isEligible && costRound !== null && costRound < 1) {
        isEligible = false
        ineligibleReason = 'no_pick_available'
      }

      const row = await prisma.keeperEligibility.upsert({
        where: {
          seasonId_rosterId_playerId: {
            seasonId: outgoingSeasonId,
            rosterId: roster.id,
            playerId: p.playerId,
          },
        },
        create: {
          leagueId,
          seasonId: outgoingSeasonId,
          rosterId: roster.id,
          playerId: p.playerId,
          isEligible,
          ineligibleReason,
          yearsKept,
          projectedCost: costLabel,
          projectedCostRound: costRound,
          projectedCostAuction: costAuction,
        },
        update: {
          isEligible,
          ineligibleReason,
          yearsKept,
          projectedCost: costLabel,
          projectedCostRound: costRound,
          projectedCostAuction: costAuction,
          computedAt: new Date(),
        },
      })
      out.push(row)
    }
  }

  return out
}
