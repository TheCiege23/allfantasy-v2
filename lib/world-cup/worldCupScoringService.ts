import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getWorldCupRoundPoints, isWorldCupChallengeLocked } from "./worldCupBracketBuilder"
import type { WorldCupLeaderboardRow, WorldCupRound, WorldCupScoringValues } from "./types"

type DbMatch = {
  id: string
  round: WorldCupRound
  homeSlotKey: string
  awaySlotKey: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeTeamName: string
  awayTeamName: string
  status: string
  winnerTeamId: string | null
  winnerTeamName: string | null
}

type DbPick = {
  id: string
  round: WorldCupRound
  selectedTeamId: string | null
  selectedTeamName: string
  selectedSlotKey: string | null
  match?: DbMatch | null
  pointsAwarded?: number
  isCorrect?: boolean | null
}

type DbEntryForLb = {
  id: string
  participantId: string
  userId: string
  name: string
  createdAt: Date
  championTeamId?: string | null
  championTeamName?: string | null
  updatedAt: Date
  picks: DbPick[]
  participant?: {
    displayName: string
    user?: { username: string; avatarUrl: string | null; displayName: string | null } | null
  }
}

function winnerSlotKey(m: DbMatch) {
  if (m.winnerTeamId && m.winnerTeamId === m.homeTeamId) return m.homeSlotKey
  if (m.winnerTeamId && m.winnerTeamId === m.awayTeamId) return m.awaySlotKey
  if (m.winnerTeamName && m.winnerTeamName === m.homeTeamName) return m.homeSlotKey
  if (m.winnerTeamName && m.winnerTeamName === m.awayTeamName) return m.awaySlotKey
  return null
}

export function evaluateWorldCupPick(
  pickOrMatch: Pick<DbPick, "round" | "selectedTeamId" | "selectedTeamName" | "selectedSlotKey"> | DbMatch,
  matchOrPick: DbMatch | Partial<Pick<DbPick, "round" | "selectedTeamId" | "selectedTeamName" | "selectedSlotKey">>,
  scoring?: Partial<WorldCupScoringValues> | null
) {
  const firstLooksLikeMatch = "status" in pickOrMatch && ("winnerTeamId" in pickOrMatch || "winnerTeamName" in pickOrMatch)
  const match = (firstLooksLikeMatch ? pickOrMatch : matchOrPick) as DbMatch
  const pick = (firstLooksLikeMatch ? matchOrPick : pickOrMatch) as Partial<Pick<DbPick, "round" | "selectedTeamId" | "selectedTeamName" | "selectedSlotKey">>
  if (match.status !== "final" || (!match.winnerTeamId && !match.winnerTeamName)) return { isCorrect: null, pointsAwarded: 0 }
  const slot = winnerSlotKey(match)
  const isCorrect = Boolean(
    (pick.selectedTeamId && match.winnerTeamId && pick.selectedTeamId === match.winnerTeamId) ||
      (pick.selectedTeamName && match.winnerTeamName && pick.selectedTeamName === match.winnerTeamName) ||
      (pick.selectedSlotKey && slot && pick.selectedSlotKey === slot)
  )
  return { isCorrect, pointsAwarded: isCorrect ? getWorldCupRoundPoints((pick.round ?? match.round) as WorldCupRound, scoring) : 0 }
}

export function isChampionStillAlive(
  p:
    | (Pick<DbEntryForLb, "championTeamId" | "championTeamName"> & {
        championPickTeamId?: string | null
        championPickName?: string | null
        matches?: DbMatch[]
      })
    | null
    | undefined,
  matches?: DbMatch[]
) {
  if (!p) return false
  matches = matches ?? p.matches ?? []
  const id = p.championTeamId ?? p.championPickTeamId
  const name = p.championTeamName ?? p.championPickName
  if (!id && !name) return false
  return !matches.some(
    (m) =>
      m.status === "final" &&
      (!m.round || m.round === "final") &&
      (((id && (id === m.homeTeamId || id === m.awayTeamId)) || (name && (name === m.homeTeamName || name === m.awayTeamName))) &&
        !((id && id === m.winnerTeamId) || (name && name === m.winnerTeamName)))
  )
}

/** Leaderboard rows are one per bracket entry (not per participant). */
export function buildWorldCupLeaderboardRows(input: {
  entries: DbEntryForLb[]
  matches: DbMatch[]
  scoring?: Partial<WorldCupScoringValues> | null
}): WorldCupLeaderboardRow[] {
  const rows: WorldCupLeaderboardRow[] = input.entries.map((e) => {
    const picks = e.picks
    const roundBreakdown: Record<string, number> = {}
    let totalScore = 0
    let maxPossibleScore = 0
    let correctPicks = 0
    let incorrectPicks = 0
    for (const pick of picks) {
      const r = pick.match ? evaluateWorldCupPick(pick, pick.match, input.scoring) : { isCorrect: pick.isCorrect ?? null, pointsAwarded: pick.pointsAwarded ?? 0 }
      if (r.isCorrect === true) correctPicks++
      if (r.isCorrect === false) incorrectPicks++
      totalScore += r.pointsAwarded
      if (pick.round) roundBreakdown[pick.round] = (roundBreakdown[pick.round] ?? 0) + r.pointsAwarded
      if (r.isCorrect !== false && pick.round) maxPossibleScore += r.pointsAwarded || getWorldCupRoundPoints(pick.round, input.scoring)
    }
    const joinedAt = e.createdAt instanceof Date ? e.createdAt.toISOString() : new Date(e.createdAt).toISOString()
    const updatedAt = e.updatedAt instanceof Date ? e.updatedAt.toISOString() : new Date(e.updatedAt).toISOString()
    const u = e.participant?.user
    return {
      rank: 0,
      entryId: e.id,
      entryName: e.name,
      participantId: e.participantId,
      userId: e.userId,
      username: u?.username ?? null,
      avatarUrl: u?.avatarUrl ?? null,
      displayName: e.participant?.displayName ?? "Player",
      totalScore,
      maxPossibleScore,
      correctPicks,
      incorrectPicks,
      championPickName: e.championTeamName ?? picks.find((x) => x.round === "final")?.selectedTeamName ?? null,
      championTeamId: e.championTeamId ?? null,
      championStillAlive: isChampionStillAlive(
        { championTeamId: e.championTeamId, championTeamName: e.championTeamName },
        input.matches
      ),
      roundBreakdown,
      joinedAt,
      updatedAt,
    }
  })
  rows.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      Number(b.championStillAlive) - Number(a.championStillAlive) ||
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  )
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

export async function recalculateWorldCupChallenge(challengeId: string) {
  const c = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      scoringProfile: true,
      matches: true,
      entries: { include: { picks: { include: { match: true } } } },
    },
  })
  if (!c) throw new Error("World Cup bracket challenge not found")

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const entry of c.entries) {
      for (const pick of entry.picks) {
        if (!pick.match) continue
        const r = evaluateWorldCupPick(pick, pick.match, c.scoringProfile)
        await tx.worldCupBracketPick.update({
          where: { id: pick.id },
          data: {
            pointsAwarded: r.pointsAwarded,
            isCorrect: r.isCorrect,
            lockedAt: pick.match.status === "final" ? new Date() : undefined,
          },
        })
      }
    }
  })

  const fresh = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      scoringProfile: true,
      matches: true,
      participants: true,
      entries: {
        include: {
          picks: { include: { match: true } },
          participant: {
            include: {
              user: { select: { username: true, avatarUrl: true, displayName: true } },
            },
          },
        },
      },
    },
  })
  if (!fresh) throw new Error("World Cup bracket challenge not found")

  const refreshedRows = buildWorldCupLeaderboardRows({
    entries: fresh.entries as DbEntryForLb[],
    matches: fresh.matches as DbMatch[],
    scoring: fresh.scoringProfile,
  })

  const bracketLocked = isWorldCupChallengeLocked({
    challenge: fresh,
    matches: fresh.matches,
  }).locked

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.worldCupBracketEntry.updateMany({
      where: { challengeId },
      data: { isLocked: bracketLocked },
    })

    for (const row of refreshedRows) {
      await tx.worldCupBracketEntry.update({
        where: { id: row.entryId },
        data: {
          totalScore: row.totalScore,
          maxPossibleScore: row.maxPossibleScore,
          correctPicks: row.correctPicks,
          incorrectPicks: row.incorrectPicks,
          rank: row.rank,
          roundBreakdown: row.roundBreakdown,
        },
      })
    }

    const byParticipant = new Map<string, WorldCupLeaderboardRow[]>()
    for (const row of refreshedRows) {
      const list = byParticipant.get(row.participantId) ?? []
      list.push(row)
      byParticipant.set(row.participantId, list)
    }

    for (const p of fresh.participants) {
      const list = byParticipant.get(p.id) ?? []
      const best = list.reduce<WorldCupLeaderboardRow | null>((acc, row) => (!acc || row.totalScore > acc.totalScore ? row : acc), null)
      await tx.worldCupBracketParticipant.update({
        where: { id: p.id },
        data: {
          totalScore: best?.totalScore ?? 0,
          maxPossibleScore: best?.maxPossibleScore ?? 0,
          correctPicks: best?.correctPicks ?? 0,
          rank: null,
          roundBreakdown: best?.roundBreakdown ?? undefined,
          championPickTeamId: best?.championTeamId ?? null,
          championPickName: best?.championPickName ?? null,
        },
      })
    }
  })

  return refreshedRows
}
