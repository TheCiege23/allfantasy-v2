/**
 * BracketPickController — pick lock check and cascade-clear invalid picks.
 * Shared by BracketTreeView, BracketProView, PickWizard so lock/cascade logic is single source.
 */

import type { BracketNodeLike } from './types'

/**
 * Whether a node/game is locked (game started or tournament locked).
 * Uses node.game.startTime; callers may also check entry/tournament lock separately.
 */
export function isPickLocked(node: BracketNodeLike): boolean {
  if (!node.game?.startTime) return false
  return new Date(node.game.startTime) <= new Date()
}

/**
 * Compute effective home/away for each node from picks (winners advancing).
 */
export function computeEffectiveTeams(
  nodes: BracketNodeLike[],
  picks: Record<string, string | null>
): Map<string, { home: string | null; away: string | null }> {
  const effective = new Map<string, { home: string | null; away: string | null }>()
  for (const n of nodes) {
    effective.set(n.id, { home: n.homeTeamName, away: n.awayTeamName })
  }
  const sorted = [...nodes].sort((a, b) => a.round - b.round)
  for (const n of sorted) {
    const picked = picks[n.id]
    if (!picked || !n.nextNodeId || !n.nextNodeSide) continue
    const current = effective.get(n.nextNodeId)
    if (!current) continue
    if (n.nextNodeSide === 'home') {
      effective.set(n.nextNodeId, { ...current, home: picked })
    } else {
      effective.set(n.nextNodeId, { ...current, away: picked })
    }
  }
  return effective
}

/**
 * After changing one pick, clear any downstream picks that are no longer valid
 * (winner no longer in the matchup).
 */
export function cascadeClearInvalidPicks(
  nodes: BracketNodeLike[],
  basePicks: Record<string, string | null>
): Record<string, string | null> {
  let current = { ...basePicks }
  let maxIter = 10
  while (maxIter-- > 0) {
    const recomputed = computeEffectiveTeams(nodes, current)
    let changed = false
    for (const n of nodes) {
      const pick = current[n.id]
      if (!pick) continue
      const eff = recomputed.get(n.id)
      if (!eff) continue
      if (pick !== eff.home && pick !== eff.away) {
        current[n.id] = null
        changed = true
      }
    }
    if (!changed) break
  }
  return current
}
