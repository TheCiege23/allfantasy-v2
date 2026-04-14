/**
 * Tournament hub participant pools: 6 / 12 / 18 feeder leagues × 12 managers each.
 */
export const TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED = [72, 144, 216] as const

export type TournamentParticipantPoolSizeExtended = (typeof TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED)[number]
