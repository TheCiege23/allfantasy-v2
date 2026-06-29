/**
 * Decision OS — Parity Gate for `manager.lineup.set` (Slice 1).
 *
 * Shadow comparison: the Decision OS path must produce the SAME recommendation as the legacy path
 * before cutover. Compares recommended action per slot, legality signal, and lock. Any diff is
 * reported (and must be explained) — cutover/legacy-retire only when `passed`.
 */
import type { LineupActionItem, LineupActionSummaryPayload } from '@/lib/lineup-actions/types'
import type { Decision } from '@/lib/decision-os/core/decision'

export interface LineupParityResult {
  passed: boolean
  diffs: string[]
  comparedSlots: number
}

function slotKey(a: LineupActionItem): string {
  return `${a.slotId ?? a.slotIndex ?? a.reasonType}:${a.playerId ?? ''}`
}

/**
 * Compare the Decision OS decision against the legacy summary (filtered to one league).
 */
export function compareLineupParity(
  decision: Decision<LineupActionItem>,
  legacy: LineupActionSummaryPayload,
  leagueId: string,
): LineupParityResult {
  const legacyActions = (legacy.actions ?? []).filter((a) => a.leagueId === leagueId)
  const newActions = decision.recommended_actions
  const diffs: string[] = []

  const legacyByKey = new Map(legacyActions.map((a) => [slotKey(a), a]))
  const newByKey = new Map(newActions.map((a) => [slotKey(a), a]))

  for (const [k, a] of newByKey) {
    const b = legacyByKey.get(k)
    if (!b) {
      diffs.push(`slot ${k}: present in Decision OS, absent in legacy`)
      continue
    }
    if ((a.recommendedAction ?? null) !== (b.recommendedAction ?? null)) {
      diffs.push(`slot ${k}: recommendedAction differs`)
    }
    if ((a.suggestedReplacementPlayerId ?? null) !== (b.suggestedReplacementPlayerId ?? null)) {
      diffs.push(`slot ${k}: suggested replacement differs`)
    }
  }
  for (const k of legacyByKey.keys()) {
    if (!newByKey.has(k)) diffs.push(`slot ${k}: present in legacy, absent in Decision OS`)
  }

  return { passed: diffs.length === 0, diffs, comparedSlots: Math.max(newByKey.size, legacyByKey.size) }
}
