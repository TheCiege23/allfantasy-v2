/**
 * DraftRoomViewService — view state and display derivation for draft room UX.
 * Current pick, timer display, draft complete, empty/loading states.
 */

export type DraftViewState = 'pre_draft' | 'live' | 'complete' | 'loading' | 'error'

export const DRAFT_ROOM_MESSAGES = {
  loading: 'Loading draft room…',
  noSession: 'No draft session for this league.',
  queueEmpty: 'Queue is empty. Add players from the player list.',
  playerPoolLoading: 'Loading player pool…',
} as const

export type CurrentPickDisplay = {
  overall: number
  round: number
  slotInRound: number
  managerName: string
  isUserTurn: boolean
  pickLabel: string
}

export type TimerDisplay = {
  secondsRemaining: number
  isUrgent: boolean
  label: string
}

/**
 * Derive view state from draft room props.
 */
export function getDraftViewState(
  draftStartedAt: number | null,
  draftComplete: boolean,
  loading: boolean,
  error: string | null
): DraftViewState {
  if (loading) return 'loading'
  if (error) return 'error'
  if (!draftStartedAt) return 'pre_draft'
  if (draftComplete) return 'complete'
  return 'live'
}

/**
 * Build current pick display for header/timer.
 */
export function getCurrentPickDisplay(
  currentOverall: number,
  teamCount: number,
  managerName: string,
  username: string,
  draftFormat: 'snake' | 'linear' | 'auction',
  enable3RR: boolean
): CurrentPickDisplay | null {
  const round = Math.ceil(currentOverall / teamCount)
  let slotInRound = (currentOverall - 1) % teamCount
  const isSnakeRound = draftFormat === 'snake' && round % 2 === 0
  const is3rrRound = enable3RR && round >= 3 && round % 2 === 1
  if (isSnakeRound || is3rrRound) {
    slotInRound = teamCount - 1 - slotInRound
  }
  const pickInRound = slotInRound + 1
  const pickLabel = `${round}.${pickInRound.toString().padStart(2, '0')}`
  return {
    overall: currentOverall,
    round,
    slotInRound,
    managerName,
    isUserTurn: managerName === username,
    pickLabel,
  }
}

/**
 * Build timer display (seconds remaining, urgent flag, label).
 */
export function getTimerDisplay(
  secondsRemaining: number,
  isDraftStarted: boolean,
  draftComplete: boolean
): TimerDisplay {
  const isUrgent = secondsRemaining <= 10 && secondsRemaining > 0
  let label = `${secondsRemaining}s`
  if (!isDraftStarted || draftComplete) label = '—'
  return {
    secondsRemaining: Math.max(0, secondsRemaining),
    isUrgent,
    label,
  }
}

export function getPickConfirmationLabel(playerName: string, position: string, team?: string | null): string {
  return `${playerName} (${position}${team ? ` · ${team}` : ''})`
}
