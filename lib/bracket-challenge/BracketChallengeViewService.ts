/**
 * BracketChallengeViewService — view state and display derivation for bracket UX.
 * Lock state, can-edit, total picks, progress, empty/loading/error.
 */

export type BracketViewState = 'editing' | 'locked' | 'submitted' | 'scored' | 'loading' | 'error'

export type BracketProgressDisplay = {
  totalGames: number
  pickedCount: number
  percentComplete: number
  canSubmit: boolean
}

/**
 * Derive view state from entry/league/tournament.
 */
export function getBracketViewState(
  entryStatus: string | null | undefined,
  tournamentLockAt: Date | string | null | undefined,
  entryLockedAt: Date | string | null | undefined,
  loading: boolean,
  error: string | null
): BracketViewState {
  if (loading) return 'loading'
  if (error) return 'error'
  const status = (entryStatus ?? '').toUpperCase()
  if (status === 'SCORED' || status === 'INVALIDATED') return 'scored'
  if (status === 'LOCKED' || entryLockedAt) return 'locked'
  if (status === 'SUBMITTED') return 'submitted'
  const now = new Date()
  if (tournamentLockAt && new Date(tournamentLockAt) <= now) return 'locked'
  return 'editing'
}

/**
 * Build progress display (picks filled / total games).
 */
export function getBracketProgressDisplay(
  picks: Record<string, string | null>,
  totalGames: number
): BracketProgressDisplay {
  const pickedCount = Object.values(picks).filter(Boolean).length
  const percentComplete = totalGames > 0 ? Math.round((pickedCount / totalGames) * 100) : 0
  const canSubmit = totalGames > 0 && pickedCount >= totalGames
  return {
    totalGames,
    pickedCount,
    percentComplete,
    canSubmit,
  }
}
