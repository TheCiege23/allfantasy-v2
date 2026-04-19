/**
 * Configurable thresholds for lineup “action required” — avoids counting
 * low-confidence AI or low-impact swaps (when AI hooks are wired).
 */
export type LineupsActionThresholds = {
  minimumStartSitConfidence: number
  minimumProjectedGain: number
  urgentLockWindowMinutes: number
  nearLockWindowHours: number
  countQuestionableAsAction: boolean
  countDoubtfulAsAction: boolean
  dailyLineupSports: readonly string[]
  bestBallSkipManual: boolean
}

function envNum(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim()?.toLowerCase()
  if (!raw) return fallback
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return fallback
}

export function getLineupActionThresholds(): LineupsActionThresholds {
  return {
    minimumStartSitConfidence: envNum('LINEUP_ACTION_MIN_START_SIT_CONFIDENCE', 0.72),
    minimumProjectedGain: envNum('LINEUP_ACTION_MIN_PROJECTED_GAIN', 0.5),
    urgentLockWindowMinutes: envNum('LINEUP_ACTION_URGENT_LOCK_MINUTES', 60),
    nearLockWindowHours: envNum('LINEUP_ACTION_NEAR_LOCK_HOURS', 24),
    countQuestionableAsAction: envBool('LINEUP_ACTION_COUNT_QUESTIONABLE', false),
    countDoubtfulAsAction: envBool('LINEUP_ACTION_COUNT_DOUBTFUL', true),
    dailyLineupSports: ['NBA', 'MLB', 'NHL', 'NCAAB', 'SOCCER'],
    bestBallSkipManual: envBool('LINEUP_ACTION_BEST_BALL_SKIP_MANUAL', true),
  }
}
