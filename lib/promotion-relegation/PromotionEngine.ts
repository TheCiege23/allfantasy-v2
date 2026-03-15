/**
 * PromotionEngine — run promotion/relegation at season end; move teams between divisions.
 */

import { prisma } from '@/lib/prisma'
import { getStandingsWithZones } from './StandingsEvaluator'
import type { SeasonEndTransition } from './types'

export interface RunPromotionInput {
  leagueId: string
  /** If true, perform DB updates; if false, return planned transitions only */
  dryRun?: boolean
}

export interface RunPromotionResult {
  leagueId: string
  applied: boolean
  transitions: SeasonEndTransition[]
  error?: string
}

/**
 * For each promotion rule: take top promoteCount from toTierLevel (lower tier) → move to fromTierLevel;
 * take bottom relegateCount from fromTierLevel → move to toTierLevel.
 * Tiers: fromTierLevel is the higher (e.g. 1), toTierLevel is the lower (e.g. 2).
 */
export async function runPromotionRelegation(
  input: RunPromotionInput
): Promise<RunPromotionResult> {
  const { leagueId, dryRun = false } = input
  const transitions: SeasonEndTransition[] = []

  try {
    const rules = await prisma.promotionRule.findMany({
      where: { leagueId },
      orderBy: [{ fromTierLevel: 'asc' }, { toTierLevel: 'asc' }],
    })

    const divisions = await prisma.leagueDivision.findMany({
      where: { leagueId },
      orderBy: { tierLevel: 'asc' },
    })
    const divisionByTier = new Map(divisions.map((d) => [d.tierLevel, d]))

    for (const rule of rules) {
      const higherDivision = divisionByTier.get(rule.fromTierLevel)
      const lowerDivision = divisionByTier.get(rule.toTierLevel)
      if (!higherDivision || !lowerDivision) continue

      const higherStandings = await getStandingsWithZones({
        divisionId: higherDivision.id,
        promoteCount: 0,
        relegateCount: rule.relegateCount,
      })
      const lowerStandings = await getStandingsWithZones({
        divisionId: lowerDivision.id,
        promoteCount: rule.promoteCount,
        relegateCount: 0,
      })

      const toRelegate = higherStandings.filter((s) => s.inRelegationZone).slice(0, rule.relegateCount)
      const toPromote = lowerStandings.filter((s) => s.inPromotionZone).slice(0, rule.promoteCount)

      for (const t of toRelegate) {
        transitions.push({
          teamId: t.teamId,
          teamName: t.teamName,
          fromDivisionId: higherDivision.id,
          fromTierLevel: rule.fromTierLevel,
          toDivisionId: lowerDivision.id,
          toTierLevel: rule.toTierLevel,
          type: 'relegation',
        })
      }
      for (const t of toPromote) {
        transitions.push({
          teamId: t.teamId,
          teamName: t.teamName,
          fromDivisionId: lowerDivision.id,
          fromTierLevel: rule.toTierLevel,
          toDivisionId: higherDivision.id,
          toTierLevel: rule.fromTierLevel,
          type: 'promotion',
        })
      }
    }

    if (!dryRun && transitions.length > 0) {
      for (const t of transitions) {
        await prisma.leagueTeam.update({
          where: { id: t.teamId },
          data: { divisionId: t.toDivisionId },
        })
      }
    }

    return {
      leagueId,
      applied: !dryRun && transitions.length > 0,
      transitions,
    }
  } catch (e) {
    return {
      leagueId,
      applied: false,
      transitions: [],
      error: e instanceof Error ? e.message : 'Promotion run failed',
    }
  }
}
