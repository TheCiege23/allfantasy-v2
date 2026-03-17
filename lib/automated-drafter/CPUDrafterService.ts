/**
 * CPU Drafter: rules-based, no AI API. Best-available, roster need, position caps.
 * Deterministic and fast. Used for orphan/empty teams when mode is CPU or as fallback for AI.
 */

import { computeDraftRecommendation } from '@/lib/draft-helper/RecommendationEngine'
import type { CPUDrafterInput, DrafterPickResult, OrphanDrafterMode } from './types'

/**
 * Compute a single pick using only deterministic rules: need balancing, ADP/value, position.
 * Queue-aware: if queueFirst is provided and one of those players is available, pick first available from queue.
 */
export function computeCPUPick(input: CPUDrafterInput): DrafterPickResult | null {
  const {
    available,
    teamRoster,
    rosterSlots = [],
    round,
    slot,
    totalTeams,
    sport,
    isDynasty = false,
    isSF = false,
    mode = 'needs',
    queueFirst = [],
    aiAdpByKey,
    byeByKey,
  } = input

  if (available.length === 0) return null

  const availableSet = new Set(available.map((p) => p.name.toLowerCase().trim()))
  const queueAvailable = queueFirst.filter((q) => availableSet.has((q.name || '').toLowerCase().trim()))
  if (queueAvailable.length > 0) {
    const first = queueAvailable[0]!
    return {
      player: {
        name: first.name,
        position: first.position,
        team: first.team ?? null,
        adp: first.adp ?? null,
        byeWeek: first.byeWeek ?? null,
      },
      reason: 'First available from queue (queue-aware autopick).',
      confidence: 85,
      drafterMode: 'cpu',
    }
  }

  const result = computeDraftRecommendation({
    available,
    teamRoster,
    rosterSlots,
    round,
    pick: slot,
    totalTeams,
    sport,
    isDynasty,
    isSF,
    mode,
    aiAdpByKey,
    byeByKey,
  })

  const rec = result.recommendation
  if (!rec) return null

  return {
    player: {
      name: rec.player.name,
      position: rec.player.position,
      team: rec.player.team ?? null,
      adp: rec.player.adp ?? null,
      byeWeek: rec.player.byeWeek ?? null,
    },
    reason: rec.reason,
    confidence: rec.confidence,
    drafterMode: 'cpu' as OrphanDrafterMode,
  }
}
