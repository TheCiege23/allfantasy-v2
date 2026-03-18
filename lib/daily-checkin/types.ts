/**
 * Daily AI Check-In (PROMPT 305) — types.
 * "Ask Chimmy" daily insight to bring users back daily.
 */

export interface DailyCheckInPrompt {
  /** Short label for the card (e.g. "Today's focus"). */
  label: string
  /** Full prompt to prefill in Chimmy (Ask Chimmy). */
  prompt: string
}

export interface DailyCheckInData {
  /** Today's prompt and label. */
  daily: DailyCheckInPrompt
  /** Chimmy chat href with prompt pre-filled. */
  chimmyHref: string
  /** Whether the user has already been active today (any engagement event). */
  completedToday: boolean
  /** Current streak (consecutive days with activity). */
  currentStreak: number
  /** Longest streak. */
  longestStreak: number
  /** Total distinct active days in last year. */
  activeDaysCount: number
}
