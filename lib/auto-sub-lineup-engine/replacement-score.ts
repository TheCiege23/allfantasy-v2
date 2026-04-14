import type {
  EnrichedPlayer,
  LineupDecisionMode,
  UserLineupPreferenceProfileInput,
} from '@/lib/lineup-decision-engine/types'

const CLOSE_DELTA = 3

export function computeReplacementScore(input: {
  weeklyStartScore: number
  roleSecurity: number
  healthAvailability: number
  slotFit: number
  preferenceTieBreaker: number
}): number {
  return (
    input.weeklyStartScore * 0.55 +
    input.roleSecurity * 0.15 +
    input.healthAvailability * 0.15 +
    input.slotFit * 0.1 +
    input.preferenceTieBreaker * 0.05
  )
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Neutral 50 when not in close-call mode; shifts slightly when preferences apply in toss-ups.
 */
export function computePreferenceTieBreaker(input: {
  candidate: EnrichedPlayer
  preference?: UserLineupPreferenceProfileInput
  lineupMode: LineupDecisionMode
  vacatedPositions: string[]
  applyPreference: boolean
}): number {
  if (!input.applyPreference || !input.preference?.preferenceWeight) return 50

  const w = clamp(input.preference.preferenceWeight, 0, 1)
  let score = 50
  const ceiling = input.candidate.breakdown.ceilingScore
  const floor = input.candidate.breakdown.floorScore
  const isSkill = input.vacatedPositions.some((p) => ['WR', 'TE', 'RB'].includes(p))

  if (input.preference.prefersHighCeiling && isSkill && ceiling != null) {
    score += (ceiling - 50) * 0.015 * w * 100
  }
  if (input.preference.prefersConsistency && floor != null) {
    score += (floor - 50) * 0.012 * w * 100
  }
  if (input.preference.prefersStableVeterans && input.candidate.signals.isVeteran) {
    score += 8 * w
  }
  if (input.preference.prefersRookies && input.candidate.signals.isRookie) {
    score += 5 * w
  }
  if (input.lineupMode === 'Safe Lineup' || input.preference.prefersSafeFavoriteLineups) {
    score += (floor != null ? floor - 50 : 0) * 0.01 * w * 80
  }
  if (input.lineupMode === 'Upside Lineup' || input.preference.prefersAggressiveUnderdogLineups) {
    score += (ceiling != null ? ceiling - 50 : 0) * 0.01 * w * 80
  }

  return clamp(score, 0, 100)
}

export function isCloseCall(top: number, second: number): boolean {
  return Math.abs(top - second) < CLOSE_DELTA
}
