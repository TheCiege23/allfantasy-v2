/**
 * REDRAFT WAIVER / ADD-DROP ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Produces add/drop recommendations from the available free-agent pool in context.
 * Phase 1 reality: the native free-agent pool route is a placeholder, so
 * `context.freeAgents` is empty and `availability.waiverPool === 'missing'`. In that
 * case this engine returns NO invented add targets — it returns the deterministic
 * DROP-side analysis (weakest rosterable assets, lineup needs the user should target)
 * plus a clear `needsProviderIntegration` flag.
 *
 * When a real pool is wired (Phase 2), the same scoring path ranks adds by value
 * signal and lineup fit. Redraft-only: immediate lineup help + playoff push, never
 * dynasty asset accrual.
 */

import { evaluateTeamNeeds } from './redraftTeamNeedsEngine'
import type { RedraftPlayerFact, RedraftWarRoomContext } from './types'

export interface WaiverAdd {
  playerId: string
  playerName: string
  position: string
  value: number | null
  valueSource: 'projection' | 'season_avg' | 'none'
  reason: string
  faabBidSuggestion: number | null
  prioritySuggestion: number | null
}

export interface WaiverDrop {
  playerId: string
  playerName: string
  position: string
  value: number | null
  reason: string
}

export interface WaiverResult {
  rosterId: string
  recommendedAdds: WaiverAdd[]
  recommendedDrops: WaiverDrop[]
  addDropPairs: Array<{ add: string; drop: string; rationale: string }>
  targetPositions: string[]
  riskFlags: string[]
  missingDataFlags: string[]
  needsProviderIntegration: boolean
}

function valueOf(p: RedraftPlayerFact): { value: number | null; source: 'projection' | 'season_avg' | 'none' } {
  if (p.weekProjection != null) return { value: p.weekProjection, source: 'projection' }
  if (p.seasonAvgActual != null) return { value: p.seasonAvgActual, source: 'season_avg' }
  return { value: null, source: 'none' }
}

export function buildWaiverRecommendations(
  context: RedraftWarRoomContext,
  rosterId: string,
): WaiverResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  const riskFlags: string[] = []
  if (!team) {
    return {
      rosterId,
      recommendedAdds: [],
      recommendedDrops: [],
      addDropPairs: [],
      targetPositions: [],
      riskFlags: [],
      missingDataFlags: ['Roster not found in this season.'],
      needsProviderIntegration: context.availability.waiverPool !== 'available',
    }
  }

  const needs = evaluateTeamNeeds(context, rosterId)
  const targetPositions = needs.tradeTargetPositions

  // DROP side: rank the user's own weakest bench assets (works without a free-agent pool).
  const dropCandidates = team.players
    .filter((p) => !p.isStarterSlot || team.players.length > context.roster.totalStarterSlots)
    .map((p) => ({ p, ...valueOf(p) }))
    .sort((a, b) => (a.value ?? -1) - (b.value ?? -1))

  const recommendedDrops: WaiverDrop[] = dropCandidates.slice(0, 3).map(({ p, value }) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    position: p.position,
    value: value == null ? null : Math.round(value * 100) / 100,
    reason:
      value == null
        ? `Lowest-confidence asset (no projection/stat signal)${p.injuryStatus ? `, listed ${p.injuryStatus}` : ''}.`
        : `Among the weakest rosterable values (${value.toFixed(1)})${p.injuryStatus ? `, listed ${p.injuryStatus}` : ''}.`,
  }))

  // ADD side requires a real free-agent pool.
  const needsProviderIntegration = context.availability.waiverPool !== 'available'
  let recommendedAdds: WaiverAdd[] = []
  if (needsProviderIntegration) {
    missingDataFlags.push(
      'Waiver add targets unavailable: free-agent pool needs provider integration. Drop-side analysis and target positions are still grounded in your roster.',
    )
  } else {
    const faabBudget = context.waivers.type === 'faab' ? (team.faabBalance ?? context.waivers.faabBudget) : null
    recommendedAdds = context.freeAgents
      .map((p) => ({ p, ...valueOf(p) }))
      .filter(({ p }) => targetPositions.length === 0 || targetPositions.includes(p.position))
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
      .slice(0, 5)
      .map(({ p, value, source }) => {
        // FAAB suggestion: scale by value relative to top free agent, capped at 35% of budget.
        const faabBidSuggestion =
          faabBudget != null && value != null
            ? Math.max(1, Math.round(Math.min(faabBudget * 0.35, (value / 20) * faabBudget * 0.35)))
            : null
        const prioritySuggestion =
          context.waivers.type === 'rolling' || context.waivers.type === 'reverse' ? team.waiverPriority : null
        return {
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position,
          value: value == null ? null : Math.round(value * 100) / 100,
          valueSource: source,
          reason:
            value == null
              ? `Fills ${p.position} need (no value signal yet).`
              : `Fills ${p.position} need; ${source === 'projection' ? 'projected' : 'season avg'} ${value.toFixed(1)}.`,
          faabBidSuggestion,
          prioritySuggestion,
        }
      })
  }

  // Add/drop pairs only when we have both sides.
  const addDropPairs = recommendedAdds.slice(0, recommendedDrops.length).map((add, i) => ({
    add: add.playerName,
    drop: recommendedDrops[i].playerName,
    rationale: `Upgrade ${add.position}: add ${add.playerName} for ${recommendedDrops[i].playerName}.`,
  }))

  if (team.faabBalance != null && team.faabBalance <= 5 && context.waivers.type === 'faab') {
    riskFlags.push('FAAB nearly exhausted — bids will be constrained.')
  }
  if (needs.needs.some((n) => n.severity === 'critical')) {
    riskFlags.push('Critical starting-slot hole — prioritize a starter add over depth.')
  }

  return {
    rosterId,
    recommendedAdds,
    recommendedDrops,
    addDropPairs,
    targetPositions,
    riskFlags,
    missingDataFlags: [...new Set(missingDataFlags)],
    needsProviderIntegration,
  }
}
