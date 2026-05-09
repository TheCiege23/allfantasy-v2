import "server-only"
import { WORLD_CUP_BRACKET_EVENT_TYPES } from "./worldCupBracketEvents"
import { worldCupIdempotencyKeys } from "./worldCupBracketEventIdempotency"
import {
  emitWorldCupBracketChatEvent,
  fireAndForgetEmit,
} from "./worldCupBracketEventService"

export function emitWorldCupChallengeCreated(challengeId: string, name: string) {
  fireAndForgetEmit(
    emitWorldCupBracketChatEvent({
      challengeId,
      eventType: WORLD_CUP_BRACKET_EVENT_TYPES.CHALLENGE_CREATED,
      eventTitle: "Bracket league ready",
      eventBody: `"${name}" is live — invite friends and fill your bracket.`,
      idempotencyKey: worldCupIdempotencyKeys.challengeCreated(challengeId),
      metadata: { name },
    })
  )
}

export function emitWorldCupUserJoined(
  challengeId: string,
  userId: string,
  displayName: string
) {
  fireAndForgetEmit(
    emitWorldCupBracketChatEvent({
      challengeId,
      eventType: WORLD_CUP_BRACKET_EVENT_TYPES.USER_JOINED,
      eventTitle: "New player joined",
      eventBody: `${displayName} joined the pool.`,
      idempotencyKey: worldCupIdempotencyKeys.userJoined(challengeId, userId),
      userId,
      metadata: { displayName },
    })
  )
}

export function emitWorldCupEntryCreated(
  challengeId: string,
  entryId: string,
  userId: string,
  entryName: string
) {
  fireAndForgetEmit(
    emitWorldCupBracketChatEvent({
      challengeId,
      eventType: WORLD_CUP_BRACKET_EVENT_TYPES.ENTRY_CREATED,
      eventTitle: "New bracket entry",
      eventBody: `${entryName} was created.`,
      idempotencyKey: worldCupIdempotencyKeys.entryCreated(challengeId, entryId),
      bracketEntryId: entryId,
      userId,
      metadata: { entryName },
    })
  )
}

export function emitWorldCupBracketCompleted(
  challengeId: string,
  entryId: string,
  userId: string,
  entryName: string
) {
  fireAndForgetEmit(
    emitWorldCupBracketChatEvent({
      challengeId,
      eventType: WORLD_CUP_BRACKET_EVENT_TYPES.BRACKET_COMPLETED,
      eventTitle: "Bracket submitted",
      eventBody: `${entryName} is completely filled.`,
      idempotencyKey: worldCupIdempotencyKeys.bracketCompleted(challengeId, entryId),
      bracketEntryId: entryId,
      userId,
      metadata: { entryName },
    })
  )
}
