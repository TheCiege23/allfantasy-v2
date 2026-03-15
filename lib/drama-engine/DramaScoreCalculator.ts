/**
 * DramaScoreCalculator — scores a drama event 0–100 based on type and context.
 */

import type { DramaType } from './types'

const BASE_SCORES: Record<DramaType, number> = {
  REVENGE_GAME: 75,
  MAJOR_UPSET: 85,
  RIVALRY_CLASH: 80,
  WIN_STREAK: 65,
  LOSING_STREAK: 60,
  PLAYOFF_BUBBLE: 70,
  TITLE_DEFENSE: 80,
  TRADE_FALLOUT: 65,
  REBUILD_PROGRESS: 55,
  DYNASTY_SHIFT: 75,
}

export interface DramaScoreInput {
  dramaType: DramaType
  /** Optional: streak length, upset margin, etc. to boost. */
  intensityFactor?: number
  /** Optional: number of related managers/teams (more = slightly higher). */
  relatedCount?: number
}

/**
 * Compute drama score 0–100 for an event.
 */
export function calculateDramaScore(input: DramaScoreInput): number {
  const base = BASE_SCORES[input.dramaType] ?? 50
  const intensity = Math.min(1.3, 1 + (input.intensityFactor ?? 0) * 0.1)
  const related = input.relatedCount != null && input.relatedCount > 0
    ? Math.min(1.1, 1 + input.relatedCount * 0.02)
    : 1
  const raw = base * intensity * related
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10))
}
