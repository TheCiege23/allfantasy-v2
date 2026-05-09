import { isWorldCupBracketChallengePicksLocked } from "./worldCupBracketBuilder"
import { parseWorldCupLeagueSettings } from "./worldCupBracketSettingsService"

export type WorldCupJoinBlockedReason = "full" | "locked_no_late_join"

export type WorldCupJoinGateSnapshot = {
  participantCount: number
  maxParticipants: number
  isFull: boolean
  poolLocked: boolean
  allowLateJoin: boolean
  requiresJoinPassword: boolean
  joinBlockedReason: WorldCupJoinBlockedReason | null
}

export function evaluateWorldCupNewParticipantJoinGate(input: {
  challenge: {
    maxParticipants: number
    status?: string | null
    pickLockStrategy?: string | null
    pickLockAt?: Date | string | null
  }
  matches: Array<{ startsAt?: Date | string | null; status?: string | null }>
  sourcePayload: unknown
  participantCount: number
}): WorldCupJoinGateSnapshot {
  const league = parseWorldCupLeagueSettings(input.sourcePayload)
  const poolLocked = isWorldCupBracketChallengePicksLocked({
    challenge: input.challenge,
    matches: input.matches,
  })
  const isFull = input.participantCount >= input.challenge.maxParticipants

  let joinBlockedReason: WorldCupJoinBlockedReason | null = null
  if (isFull) joinBlockedReason = "full"
  else if (poolLocked && !league.allowLateJoin) joinBlockedReason = "locked_no_late_join"

  return {
    participantCount: input.participantCount,
    maxParticipants: input.challenge.maxParticipants,
    isFull,
    poolLocked,
    allowLateJoin: league.allowLateJoin,
    requiresJoinPassword: league.inviteGateConfigured,
    joinBlockedReason,
  }
}
