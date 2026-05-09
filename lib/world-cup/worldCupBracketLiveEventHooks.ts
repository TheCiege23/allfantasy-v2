import "server-only"
import { getWorldCupSeedStrength } from "./worldCupAiInsights"
import { WORLD_CUP_BRACKET_EVENT_TYPES } from "./worldCupBracketEvents"
import { worldCupIdempotencyKeys } from "./worldCupBracketEventIdempotency"
import {
  emitWorldCupBracketChatEvent,
  fireAndForgetEmit,
} from "./worldCupBracketEventService"

/** Minimum seed-strength gap to treat as chalk vs underdog for upset alerts. */
const UPSET_STRENGTH_GAP = 8

type MatchSnap = {
  id: string
  homeTeamName: string
  awayTeamName: string
  status: string
  apiStatusShort?: string | null
  homeSlotKey?: string | null
  awaySlotKey?: string | null
  homeTeamId?: string | null
  awayTeamId?: string | null
  winnerTeamId?: string | null
}

function isSeedUpset(match: MatchSnap): boolean {
  if (!match.homeSlotKey || !match.awaySlotKey) return false
  if (!match.winnerTeamId || !match.homeTeamId || !match.awayTeamId) return false
  const hs = getWorldCupSeedStrength(match.homeSlotKey)
  const as = getWorldCupSeedStrength(match.awaySlotKey)
  if (Math.abs(hs - as) < UPSET_STRENGTH_GAP) return false
  const favoriteHome = hs >= as
  const winnerHome = match.winnerTeamId === match.homeTeamId
  return favoriteHome !== winnerHome
}

export function emitWorldCupMatchTransitionEvents(input: {
  challengeId: string
  match: MatchSnap
  prev: MatchSnap
}) {
  const { challengeId, match, prev } = input
  const label = `${match.homeTeamName} vs ${match.awayTeamName}`

  const wasLiveish =
    prev.status === "live" ||
    prev.status === "halftime" ||
    prev.apiStatusShort === "1H" ||
    prev.apiStatusShort === "2H"
  const nowLiveish =
    match.status === "live" ||
    match.status === "halftime" ||
    match.apiStatusShort === "1H" ||
    match.apiStatusShort === "2H"

  if (!wasLiveish && nowLiveish && prev.status === "scheduled") {
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.MATCH_STARTING,
        eventTitle: "Match underway",
        eventBody: `${label} has kicked off.`,
        idempotencyKey: worldCupIdempotencyKeys.match(
          challengeId,
          match.id,
          "start"
        ),
        metadata: { matchId: match.id },
      })
    )
  }

  if (prev.apiStatusShort !== "HT" && match.apiStatusShort === "HT") {
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.MATCH_HALFTIME,
        eventTitle: "Halftime",
        eventBody: `${label} — halftime.`,
        idempotencyKey: worldCupIdempotencyKeys.match(
          challengeId,
          match.id,
          "ht"
        ),
        metadata: { matchId: match.id },
      })
    )
  }

  if (prev.status !== "final" && match.status === "final") {
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.MATCH_FINAL,
        eventTitle: "Final",
        eventBody: `${label} is final.`,
        idempotencyKey: worldCupIdempotencyKeys.match(
          challengeId,
          match.id,
          "final"
        ),
        metadata: { matchId: match.id },
      })
    )

    if (isSeedUpset(match)) {
      const upsetSide =
        match.winnerTeamId === match.homeTeamId
          ? match.homeTeamName
          : match.awayTeamName
      fireAndForgetEmit(
        emitWorldCupBracketChatEvent({
          challengeId,
          eventType: WORLD_CUP_BRACKET_EVENT_TYPES.UPSET,
          eventTitle: "Upset alert",
          eventBody: `${upsetSide} wins — bracket chalk takes a hit (${label}).`,
          idempotencyKey: worldCupIdempotencyKeys.upset(
            challengeId,
            match.id,
            "seed"
          ),
          metadata: { matchId: match.id },
        })
      )
    }
  }
}
