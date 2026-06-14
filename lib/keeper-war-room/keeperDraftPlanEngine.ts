/**
 * KEEPER DRAFT-PLAN ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Builds a draft plan AFTER keepers: which rounds are CONSUMED by kept players (their
 * keeper cost rounds, round-based systems) and which rounds remain, plus the priority
 * positions to target with the remaining picks (from the post-keeper roster needs).
 * Keeper draft is round-based — NO future picks, NO dynasty pick capital.
 */

import { recommendKeepers } from './keeperRecommendationEngine'
import { evaluateKeeperRosterNeeds } from './keeperRosterNeedsEngine'
import type { KeeperWarRoomContext } from './types'

export interface KeeperDraftPlanResult {
  rosterId: string
  totalRounds: number
  /** Rounds forfeited/consumed by kept players (round-based systems). */
  consumedRounds: number[]
  /** Remaining draftable rounds after keepers. */
  remainingRounds: number[]
  /** Ordered positions to target in the remaining draft (most urgent first). */
  priorityPositions: string[]
  /** Round-by-round suggestion (round → suggested position focus) for the first picks. */
  roundPlan: Array<{ round: number; focus: string; note: string }>
  costSystem: string
  explanationFacts: string[]
  missingDataFlags: string[]
}

export function buildKeeperDraftPlan(context: KeeperWarRoomContext, rosterId: string): KeeperDraftPlanResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  const totalRounds = Math.max(1, context.keeper.draftRounds)
  if (!team) {
    return {
      rosterId,
      totalRounds,
      consumedRounds: [],
      remainingRounds: [],
      priorityPositions: [],
      roundPlan: [],
      costSystem: context.keeper.costSystem,
      explanationFacts: ['Roster not found in this season.'],
      missingDataFlags,
    }
  }

  // Which players are kept (declared, else recommended).
  const declared = team.players.filter((p) => p.isKept)
  const kept =
    declared.length > 0
      ? declared
      : team.players.filter((p) => recommendKeepers(context, rosterId).recommended.some((r) => r.playerId === p.playerId))

  const facts: string[] = []
  const isRoundBased = context.keeper.costSystem === 'round_based' || context.keeper.costSystem === 'inflation'

  const consumedRounds: number[] = []
  if (isRoundBased) {
    for (const p of kept) {
      if (p.keeperCostRound != null) consumedRounds.push(p.keeperCostRound)
    }
    consumedRounds.sort((a, b) => a - b)
    if (kept.length > 0 && consumedRounds.length < kept.length) {
      missingDataFlags.push('Some kept players have no cost round recorded — consumed-round plan is partial.')
    }
  } else {
    facts.push(`Cost system is ${context.keeper.costSystem} — keeper cost is budget-based, not round-based; draft rounds are not consumed by keepers.`)
  }

  const consumedSet = new Set(consumedRounds)
  const remainingRounds: number[] = []
  for (let r = 1; r <= totalRounds; r++) if (!consumedSet.has(r)) remainingRounds.push(r)

  const needs = evaluateKeeperRosterNeeds(context, rosterId)
  const priorityPositions = needs.draftTargetPositions

  // Map the earliest remaining rounds onto priority positions.
  const roundPlan: Array<{ round: number; focus: string; note: string }> = []
  const focusQueue = [...priorityPositions]
  for (const round of remainingRounds.slice(0, Math.min(6, remainingRounds.length))) {
    const focus = focusQueue.shift() ?? 'BPA'
    roundPlan.push({
      round,
      focus,
      note: focus === 'BPA' ? 'Best player available — starting needs covered by keepers/earlier picks.' : `Target ${focus} (post-keeper starting need).`,
    })
  }

  if (isRoundBased) facts.push(`Keepers consume rounds ${consumedRounds.join(', ') || 'none'}; ${remainingRounds.length} of ${totalRounds} rounds remain to draft.`)
  if (priorityPositions.length) facts.push(`Post-keeper priority: ${priorityPositions.join(', ')}.`)

  return {
    rosterId,
    totalRounds,
    consumedRounds,
    remainingRounds,
    priorityPositions,
    roundPlan,
    costSystem: context.keeper.costSystem,
    explanationFacts: facts,
    missingDataFlags: [...new Set([...missingDataFlags, ...needs.missingDataFlags])],
  }
}
