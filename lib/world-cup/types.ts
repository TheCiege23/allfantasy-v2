export const WORLD_CUP_TOURNAMENT_KEY = "fifa_world_cup"
export const WORLD_CUP_ROUNDS = ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "third_place", "final"] as const
export type WorldCupRound = (typeof WORLD_CUP_ROUNDS)[number]
export type WorldCupMatchStatus = "scheduled" | "live" | "halftime" | "final" | "postponed" | "cancelled"
export type WorldCupPickLockStrategy = "per_match" | "tournament_start"
export type WorldCupVisibility = "public" | "private"
export const WORLD_CUP_ROUND_LABELS: Record<WorldCupRound, string> = {
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinals",
  semifinal: "Semifinals",
  third_place: "Third Place",
  final: "Final",
}
export type WorldCupSlotSpec = { slotKey: string; round: WorldCupRound; region?: string | null; sourceGroup?: string | null; sourceRank?: string | null; displayName: string; isPlaceholder: boolean }
export type WorldCupMatchSpec = { matchNumber: number; round: WorldCupRound; roundIndex: number; homeSlotKey: string; awaySlotKey: string; homeTeamName: string; awayTeamName: string; nextMatchNumber?: number | null; nextMatchSlot?: "home" | "away" | null }
export type WorldCupScoringValues = { roundOf32Points: number; roundOf16Points: number; quarterFinalPoints: number; semiFinalPoints: number; finalPoints: number; championBonusPoints: number; thirdPlacePoints?: number | null }
export type WorldCupMatchView = { id: string; apiFixtureId: number | null; round: WorldCupRound; roundIndex: number; matchNumber: number; homeSlotKey: string; awaySlotKey: string; homeTeamId: string | null; awayTeamId: string | null; homeTeamName: string; awayTeamName: string; homeTeamLogo: string | null; awayTeamLogo: string | null; homeScore: number | null; awayScore: number | null; homePenaltyScore: number | null; awayPenaltyScore: number | null; status: WorldCupMatchStatus; startsAt: string | null; winnerTeamId: string | null; winnerTeamName: string | null; nextMatchId: string | null; nextMatchSlot: "home" | "away" | null }
export type WorldCupParticipantView = { id: string; userId: string; displayName: string; joinedAt: string; totalScore: number; maxPossibleScore: number; championPickTeamId: string | null; championPickName: string | null; correctPicks: number; rank: number | null }
export type WorldCupPickView = { id: string; matchId: string; round: WorldCupRound; selectedTeamId: string | null; selectedSlotKey: string | null; selectedTeamName: string; pointsAwarded: number; isCorrect: boolean | null; lockedAt: string | null }
export type WorldCupLeaderboardRow = { participantId: string; userId: string; displayName: string; rank: number; totalScore: number; maxPossibleScore: number; correctPicks: number; championPickName: string | null; championStillAlive: boolean; roundBreakdown: Record<string, number>; joinedAt: string }
export type WorldCupChallengeView = {
  challenge: { id: string; name: string; ownerUserId: string; seasonYear: number; inviteCode: string; inviteUrl: string | null; visibility: WorldCupVisibility; pickLockStrategy: WorldCupPickLockStrategy; pickLockAt: string | null; status: string; includeThirdPlace: boolean; lastSyncedAt: string | null; createdAt: string; updatedAt: string }
  scoring: WorldCupScoringValues
  slots: Array<{ id: string; slotKey: string; round: WorldCupRound; region: string | null; sourceGroup: string | null; sourceRank: string | null; teamId: string | null; displayName: string; isPlaceholder: boolean; lockedAt: string | null }>
  matches: WorldCupMatchView[]
  participant: WorldCupParticipantView | null
  picks: WorldCupPickView[]
  leaderboard: WorldCupLeaderboardRow[]
  isOwner: boolean
  isAdmin: boolean
}
