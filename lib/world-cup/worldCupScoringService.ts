import "server-only"
import { prisma } from "@/lib/prisma"
import { getWorldCupRoundPoints } from "./worldCupBracketBuilder"
import type { WorldCupLeaderboardRow, WorldCupRound, WorldCupScoringValues } from "./types"
type DbMatch = { id: string; round: WorldCupRound; homeSlotKey: string; awaySlotKey: string; homeTeamId: string | null; awayTeamId: string | null; homeTeamName: string; awayTeamName: string; status: string; winnerTeamId: string | null; winnerTeamName: string | null }
type DbPick = {
  id: string
  round: WorldCupRound
  selectedTeamId: string | null
  selectedTeamName: string
  selectedSlotKey: string | null
  match?: DbMatch | null
  participantId?: string
  pointsAwarded?: number
  isCorrect?: boolean | null
}
type DbParticipant = { id: string; userId: string; displayName: string; joinedAt: Date; championPickTeamId?: string | null; championPickName?: string | null; picks: DbPick[] }
function winnerSlotKey(m: DbMatch) { if (m.winnerTeamId && m.winnerTeamId === m.homeTeamId) return m.homeSlotKey; if (m.winnerTeamId && m.winnerTeamId === m.awayTeamId) return m.awaySlotKey; if (m.winnerTeamName && m.winnerTeamName === m.homeTeamName) return m.homeSlotKey; if (m.winnerTeamName && m.winnerTeamName === m.awayTeamName) return m.awaySlotKey; return null }
export function evaluateWorldCupPick(pickOrMatch: Pick<DbPick, "round" | "selectedTeamId" | "selectedTeamName" | "selectedSlotKey"> | DbMatch, matchOrPick: DbMatch | Partial<Pick<DbPick, "round" | "selectedTeamId" | "selectedTeamName" | "selectedSlotKey">>, scoring?: Partial<WorldCupScoringValues> | null) {
  const firstLooksLikeMatch = "status" in pickOrMatch && ("winnerTeamId" in pickOrMatch || "winnerTeamName" in pickOrMatch)
  const match = (firstLooksLikeMatch ? pickOrMatch : matchOrPick) as DbMatch
  const pick = (firstLooksLikeMatch ? matchOrPick : pickOrMatch) as Partial<Pick<DbPick, "round" | "selectedTeamId" | "selectedTeamName" | "selectedSlotKey">>
  if (match.status !== "final" || (!match.winnerTeamId && !match.winnerTeamName)) return { isCorrect: null, pointsAwarded: 0 }
  const slot = winnerSlotKey(match)
  const isCorrect = Boolean((pick.selectedTeamId && match.winnerTeamId && pick.selectedTeamId === match.winnerTeamId) || (pick.selectedTeamName && match.winnerTeamName && pick.selectedTeamName === match.winnerTeamName) || (pick.selectedSlotKey && slot && pick.selectedSlotKey === slot))
  return { isCorrect, pointsAwarded: isCorrect ? getWorldCupRoundPoints((pick.round ?? match.round) as WorldCupRound, scoring) : 0 }
}
export function isChampionStillAlive(p: (Pick<DbParticipant, "championPickTeamId" | "championPickName"> & { matches?: DbMatch[] }) | null | undefined, matches?: DbMatch[]) {
  if (!p) return false
  matches = matches ?? p.matches ?? []
  const id = p.championPickTeamId, name = p.championPickName; if (!id && !name) return false
  return !matches.some((m) => m.status === "final" && (!m.round || m.round === "final") && (((id && (id === m.homeTeamId || id === m.awayTeamId)) || (name && (name === m.homeTeamName || name === m.awayTeamName))) && !((id && id === m.winnerTeamId) || (name && name === m.winnerTeamName))))
}
export function buildWorldCupLeaderboardRows(input: { participants: Array<Partial<DbParticipant> & Pick<DbParticipant, "id" | "userId" | "displayName" | "joinedAt">>; picks?: Array<Partial<DbPick> & { participantId: string; pointsAwarded?: number; isCorrect?: boolean | null }>; matches: DbMatch[]; scoring?: Partial<WorldCupScoringValues> | null }): Array<WorldCupLeaderboardRow & { id: string }> {
  const rows = input.participants.map((p) => {
    const picks = p.picks ?? (input.picks ?? []).filter((pick) => pick.participantId === p.id) as DbPick[]
    const roundBreakdown: Record<string, number> = {}; let totalScore = 0, maxPossibleScore = 0, correctPicks = 0
    for (const pick of picks) { const r = pick.match ? evaluateWorldCupPick(pick, pick.match, input.scoring) : { isCorrect: pick.isCorrect ?? null, pointsAwarded: pick.pointsAwarded ?? 0 }; if (r.isCorrect === true) correctPicks++; totalScore += r.pointsAwarded; if (pick.round) roundBreakdown[pick.round] = (roundBreakdown[pick.round] ?? 0) + r.pointsAwarded; if (r.isCorrect !== false && pick.round) maxPossibleScore += r.pointsAwarded || getWorldCupRoundPoints(pick.round, input.scoring) }
    maxPossibleScore = Math.max(maxPossibleScore, Number((p as any).maxPossibleScore ?? 0))
    const joinedAt = p.joinedAt instanceof Date ? p.joinedAt.toISOString() : new Date(p.joinedAt).toISOString()
    return { id: p.id, participantId: p.id, userId: p.userId, displayName: p.displayName, rank: 0, totalScore, maxPossibleScore, correctPicks, championPickName: p.championPickName ?? picks.find((x) => x.round === "final")?.selectedTeamName ?? null, championStillAlive: isChampionStillAlive(p, input.matches), roundBreakdown, joinedAt }
  })
  rows.sort((a, b) => b.totalScore - a.totalScore || Number(b.championStillAlive) - Number(a.championStillAlive) || new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}
export async function recalculateWorldCupChallenge(challengeId: string) {
  const db = prisma as any
  const c = await db.worldCupBracketChallenge.findUnique({ where: { id: challengeId }, include: { scoringProfile: true, matches: true, participants: { include: { picks: { include: { match: true } } } } } })
  if (!c) throw new Error("World Cup bracket challenge not found")
  const rows = buildWorldCupLeaderboardRows({ participants: c.participants, matches: c.matches, scoring: c.scoringProfile })
  await db.$transaction(async (tx: any) => {
    for (const p of c.participants as DbParticipant[]) {
      for (const pick of p.picks) {
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
    for (const row of rows) {
      await tx.worldCupBracketParticipant.update({
        where: { id: row.participantId },
        data: {
          totalScore: row.totalScore,
          maxPossibleScore: row.maxPossibleScore,
          correctPicks: row.correctPicks,
          rank: row.rank,
          roundBreakdown: row.roundBreakdown,
        },
      })
    }
  })
  return rows
}
