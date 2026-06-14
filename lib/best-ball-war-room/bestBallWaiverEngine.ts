/**
 * BEST BALL WAIVER ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Most best-ball leagues are DRAFT-ONLY (waivers disabled) — in that case this returns a
 * truthful disabled state. When the league DOES enable waivers, it surfaces the weakest
 * roster spots to consider dropping for ceiling/depth upgrades at thin positions. Best ball
 * has no manual lineup, so this is about roster construction, not weekly start/sit.
 */

import { ceilingValue } from './bestBallValue'
import { evaluateDepth } from './bestBallDepthEngine'
import type { BestBallPlayerFact, BestBallWarRoomContext } from './types'

export interface BestBallWaiverResult {
  rosterId: string
  enabled: boolean
  /** Thin positions to target on waivers (depth upgrades). */
  targetPositions: string[]
  /** Weakest rosterable assets to consider dropping. */
  dropCandidates: Array<{ playerId: string; playerName: string; position: string; ceiling: number | null; reason: string }>
  riskFlags: string[]
  missingDataFlags: string[]
}

function ceilOf(p: BestBallPlayerFact): number | null {
  const c = ceilingValue(p)
  return c.source === 'none' ? null : c.value
}

export function buildBestBallWaiverRecommendations(context: BestBallWarRoomContext, rosterId: string): BestBallWaiverResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  if (!team) {
    return { rosterId, enabled: false, targetPositions: [], dropCandidates: [], riskFlags: [], missingDataFlags: ['Roster not found in this league.'] }
  }

  if (!context.bestBall.waiversEnabled) {
    return {
      rosterId,
      enabled: false,
      targetPositions: [],
      dropCandidates: [],
      riskFlags: [],
      missingDataFlags: [...new Set([...missingDataFlags, 'Waivers are disabled in this best-ball league — no add/drop moves are available (draft-only).'])],
    }
  }

  const depth = evaluateDepth(context, rosterId)
  const targetPositions = depth.fragilePositions
  const dropCandidates = team.players
    .map((p) => ({ p, ceiling: ceilOf(p) }))
    .sort((a, b) => (a.ceiling ?? -1) - (b.ceiling ?? -1))
    .slice(0, 3)
    .map(({ p, ceiling }) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      position: p.position,
      ceiling: ceiling == null ? null : Math.round(ceiling * 100) / 100,
      reason: ceiling == null ? 'Lowest-confidence asset (no value signal).' : `Lowest ceiling on the roster (${ceiling.toFixed(1)}).`,
    }))

  return {
    rosterId,
    enabled: true,
    targetPositions,
    dropCandidates,
    riskFlags: depth.riskFlags,
    missingDataFlags: [...new Set(missingDataFlags)],
  }
}
