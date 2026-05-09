import "server-only"
import { prisma } from "@/lib/prisma"
import { isWorldCupChallengeLocked } from "./worldCupBracketBuilder"
import { WORLD_CUP_BRACKET_EVENT_TYPES } from "./worldCupBracketEvents"
import { worldCupIdempotencyKeys } from "./worldCupBracketEventIdempotency"
import {
  emitWorldCupBracketChatEvent,
  fireAndForgetEmit,
} from "./worldCupBracketEventService"
import { evaluateWorldCupPick, isChampionStillAlive } from "./worldCupScoringService"

export async function afterWorldCupRecalculate(challengeId: string) {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: { matches: true, scoringProfile: true },
  })
  if (!challenge) return

  const matches = challenge.matches
  const locked = isWorldCupChallengeLocked({
    challenge,
    matches,
  }).locked

  const entries = await prisma.worldCupBracketEntry.findMany({
    where: { challengeId },
    include: {
      picks: { include: { match: true } },
      participant: true,
    },
  })

  const sorted = [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  })
  const leader = sorted[0]

  let state = await (prisma as any).worldCupBracketEventState.findUnique({
    where: { challengeId },
  })
  if (!state) {
    state = await (prisma as any).worldCupBracketEventState.create({
      data: { challengeId },
    })
  }

  if (leader && leader.id !== state.lastLeaderEntryId) {
    const prevLeaderName =
      sorted.find((e) => e.id === state.lastLeaderEntryId)?.name ?? "previous leader"
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.LEADERBOARD_LEAD_CHANGE,
        eventTitle: "Leaderboard update",
        eventBody: `${leader.name} is now #1 (replacing ${prevLeaderName}).`,
        idempotencyKey: worldCupIdempotencyKeys.leadChange(
          challengeId,
          state.lastLeaderEntryId,
          leader.id
        ),
        bracketEntryId: leader.id,
        userId: leader.userId,
        metadata: { previousLeaderEntryId: state.lastLeaderEntryId },
      })
    )
    await (prisma as any).worldCupBracketEventState.update({
      where: { challengeId },
      data: { lastLeaderEntryId: leader.id },
    })
  }

  if (leader) {
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.TOOK_FIRST_PLACE,
        eventTitle: "Top of the board",
        eventBody: `${leader.name} is in first place.`,
        idempotencyKey: worldCupIdempotencyKeys.firstPlace(
          challengeId,
          leader.id
        ),
        bracketEntryId: leader.id,
        userId: leader.userId,
      })
    )
  }

  if (locked && !state.lastEmittedLockClosed) {
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.BRACKET_LOCKED,
        eventTitle: "Brackets locked",
        eventBody: "Pick locks are on — good luck!",
        idempotencyKey: worldCupIdempotencyKeys.bracketLocked(challengeId),
      })
    )
    await (prisma as any).worldCupBracketEventState.update({
      where: { challengeId },
      data: { lastEmittedLockClosed: true },
    })
  }

  let champAlive = 0
  for (const entry of entries) {
    if (isChampionStillAlive(entry, matches)) champAlive++
  }

  const scoring = challenge.scoringProfile
  const roundKeys = new Set<string>()
  for (const m of matches) {
    if (m.round) roundKeys.add(m.round as string)
  }
  for (const round of roundKeys) {
    const roundMatches = matches.filter((m) => m.round === round)
    if (
      roundMatches.length === 0 ||
      !roundMatches.every(
        (m) => m.status === "final" && (m.winnerTeamId || m.winnerTeamName)
      )
    ) {
      continue
    }
    for (const entry of entries) {
      let allCorrect = true
      for (const m of roundMatches) {
        const pick = entry.picks.find((p) => p.matchId === m.id)
        if (!pick) {
          allCorrect = false
          break
        }
        const ev = evaluateWorldCupPick(pick, m, scoring)
        if (ev.isCorrect !== true) {
          allCorrect = false
          break
        }
      }
      if (allCorrect) {
        fireAndForgetEmit(
          emitWorldCupBracketChatEvent({
            challengeId,
            eventType: WORLD_CUP_BRACKET_EVENT_TYPES.PERFECT_ROUND,
            eventTitle: "Perfect round",
            eventBody: `${entry.name} went clean in ${String(round).replace(/_/g, " ")}.`,
            idempotencyKey: worldCupIdempotencyKeys.perfectRound(
              challengeId,
              entry.id,
              String(round)
            ),
            bracketEntryId: entry.id,
            userId: entry.userId,
            metadata: { round },
          })
        )
      }
    }
  }

  const prevAlive = state.lastPerfectBracketCount
  if (prevAlive != null && prevAlive > 0 && champAlive === 0) {
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.NO_PERFECT_BRACKETS,
        eventTitle: "Champion picks wiped",
        eventBody: "No entries still have a live champion pick.",
        idempotencyKey: worldCupIdempotencyKeys.noPerfect(challengeId, "all_dead"),
      })
    )
  }

  fireAndForgetEmit(
    emitWorldCupBracketChatEvent({
      challengeId,
      eventType: WORLD_CUP_BRACKET_EVENT_TYPES.CHAMPION_ALIVE_COUNT,
      eventTitle: "Champion picks alive",
      eventBody: `${champAlive} entr${champAlive === 1 ? "y" : "ies"} can still win it all.`,
      idempotencyKey: worldCupIdempotencyKeys.championAlive(challengeId, champAlive),
      metadata: { count: champAlive },
    })
  )

  await (prisma as any).worldCupBracketEventState.update({
    where: { challengeId },
    data: { lastPerfectBracketCount: champAlive },
  })

  for (const entry of entries) {
    if (!entry.championTeamId && !entry.championTeamName) continue
    if (isChampionStillAlive(entry, matches)) continue
    fireAndForgetEmit(
      emitWorldCupBracketChatEvent({
        challengeId,
        eventType: WORLD_CUP_BRACKET_EVENT_TYPES.CHAMPION_PICK_ELIMINATED,
        eventTitle: "Champion pick eliminated",
        eventBody: `${entry.name}'s title pick has been eliminated.`,
        idempotencyKey: worldCupIdempotencyKeys.championBust(challengeId, entry.id, "final"),
        bracketEntryId: entry.id,
        userId: entry.userId,
      })
    )
  }
}
