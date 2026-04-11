/**
 * Participant pool sizes for fantasy tournament hub creation.
 * Minimum 32 managers per product requirement; larger tiers preserve existing tournament mode behavior.
 */
export const TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED = [
  32, 40, 48, 56, 60, 120, 180, 240,
] as const

export type TournamentParticipantPoolSizeExtended = (typeof TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED)[number]
