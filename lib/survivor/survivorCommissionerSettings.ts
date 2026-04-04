/**
 * Optional `League.settings` JSON keys read by Survivor automation (no schema migration required).
 *
 * - `survivorTribalVoteWindowHours` (number, 1–168): tribal vote deadline = now + N hours (default 24).
 * - League column `survivorJuryStart === 'manual'`: disables automatic post-merge → jury transition
 *   in `computeAutomaticNextPhase`.
 */
export const SURVIVOR_SETTINGS_TRIBAL_VOTE_WINDOW_HOURS = 'survivorTribalVoteWindowHours' as const
