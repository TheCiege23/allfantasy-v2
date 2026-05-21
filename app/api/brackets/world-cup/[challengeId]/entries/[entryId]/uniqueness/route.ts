import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"
import { requireWorldCupApiUser } from "../../../../_utils"

export const runtime = "nodejs"

/**
 * GET /api/brackets/world-cup/[challengeId]/entries/[entryId]/uniqueness
 *
 * Returns:
 *   - Aggregated pool distributions (counts only, no other-user PII)
 *     computed over finalized entries (isComplete + submittedAt:not-null).
 *   - The current user's own picks for client-side comparison.
 *
 * Ownership: only the entry owner can request this. Aggregated counts
 * never include user IDs, emails, or entry names.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { challengeId: string; entryId: string } }
) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const { challengeId, entryId } = params
  if (!challengeId || !entryId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Ownership check — non-owner gets silent 404.
  const ownEntry = await (prisma as any).worldCupBracketEntry.findFirst({
    where: { id: entryId, challengeId, userId: auth.user.id },
    select: {
      id: true,
      championTeamName: true,
      picks: {
        where: { selectedTeamName: { not: "" } },
        select: { round: true, selectedTeamName: true },
      },
    },
  })
  if (!ownEntry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const hasBracketBrainAi = await userHasBracketBrainAi(
    auth.user.id,
    auth.user.email ?? null
  )

  // Finalized-only pool data. Never expose raw other-user picks — only counts.
  const finalizedEntries = await (prisma as any).worldCupBracketEntry.findMany({
    where: {
      challengeId,
      isComplete: true,
      submittedAt: { not: null },
    },
    select: {
      id: true,
      championTeamName: true,
      picks: {
        where: { selectedTeamName: { not: "" } },
        select: { round: true, selectedTeamName: true },
      },
    },
  })

  const finalizedEntryCount = Array.isArray(finalizedEntries)
    ? finalizedEntries.length
    : 0

  // Champion distribution.
  const championCounts = new Map<string, number>()
  for (const e of finalizedEntries) {
    const name = (e as { championTeamName: string | null }).championTeamName
    if (!name) continue
    championCounts.set(name, (championCounts.get(name) ?? 0) + 1)
  }

  // Per-round pick distribution. Dedupe within each (entry, round) so an
  // entry that picked the same team multiple times in a round counts once.
  const distByRound = new Map<string, Map<string, number>>()
  for (const e of finalizedEntries) {
    const seenPerRound = new Map<string, Set<string>>()
    const picks = ((e as { picks?: Array<{ round?: string; selectedTeamName?: string }> })
      .picks ?? [])
    for (const pick of picks) {
      const round = pick.round
      const team = pick.selectedTeamName
      if (!round || !team) continue
      if (!seenPerRound.has(round)) seenPerRound.set(round, new Set())
      const seen = seenPerRound.get(round)!
      if (seen.has(team)) continue
      seen.add(team)
      if (!distByRound.has(round)) distByRound.set(round, new Map())
      const inner = distByRound.get(round)!
      inner.set(team, (inner.get(team) ?? 0) + 1)
    }
  }

  const distributions: Record<string, Array<{ teamName: string; count: number }>> = {
    champion: Array.from(championCounts.entries()).map(([teamName, count]) => ({
      teamName,
      count,
    })),
  }
  for (const [round, inner] of distByRound) {
    distributions[round] = Array.from(inner.entries()).map(([teamName, count]) => ({
      teamName,
      count,
    }))
  }

  // Own picks aggregated by round (dedupe per round).
  const ownPicksByRound: Record<string, string[]> = {}
  for (const pick of ownEntry.picks ?? []) {
    const round = pick.round as string
    const team = pick.selectedTeamName as string
    if (!round || !team) continue
    if (!ownPicksByRound[round]) ownPicksByRound[round] = []
    if (!ownPicksByRound[round].includes(team)) ownPicksByRound[round].push(team)
  }

  return NextResponse.json({
    ok: true,
    finalizedEntryCount,
    distributions,
    ownChampionTeamName: ownEntry.championTeamName ?? null,
    ownPicksByRound,
    hasBracketBrainAi,
  })
}
