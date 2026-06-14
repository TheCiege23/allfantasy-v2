/**
 * DYNASTY PICK-VALUE ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Rookie/future draft pick capital lives in `FutureDraftPick` / `RookieDraftWindow`,
 * which are NOT migrated in this environment (P2021). Per the no-fabrication rule we
 * NEVER invent pick values. This engine therefore reports honestly: if a team carries
 * priced picks in context it summarizes them; otherwise it returns
 * `needsProviderIntegration: true` and an empty, flagged result.
 *
 * When pick data is later migrated, `context.teams[].picks` will carry `estValue` and
 * this engine will summarize/total it without any other change.
 */

import type { DynastyWarRoomContext } from './types'

export interface DynastyPickValueResult {
  rosterId: string
  picks: Array<{ season: number; round: number; estValue: number | null; note: string }>
  totalEstValue: number | null
  missingDataFlags: string[]
  needsProviderIntegration: boolean
}

export function evaluateDynastyPickValue(
  context: DynastyWarRoomContext,
  rosterId: string,
): DynastyPickValueResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  const available = context.availability.futurePicks === 'available'

  if (!team || !available || team.picks.length === 0) {
    if (!available) {
      missingDataFlags.push('Future draft pick data is not available in this environment — pick capital cannot be valued.')
    }
    return {
      rosterId,
      picks: [],
      totalEstValue: null,
      missingDataFlags: [...new Set(missingDataFlags)],
      needsProviderIntegration: !available,
    }
  }

  let total = 0
  let anyValued = false
  const picks = team.picks.map((pk) => {
    if (pk.estValue != null) {
      total += pk.estValue
      anyValued = true
    }
    return {
      season: pk.season,
      round: pk.round,
      estValue: pk.estValue,
      note: pk.estValue != null ? `Round ${pk.round} ${pk.season} (est value ${pk.estValue.toFixed(1)}).` : `Round ${pk.round} ${pk.season} (unpriced).`,
    }
  })

  return {
    rosterId,
    picks,
    totalEstValue: anyValued ? Math.round(total * 10) / 10 : null,
    missingDataFlags: [...new Set(missingDataFlags)],
    needsProviderIntegration: false,
  }
}
