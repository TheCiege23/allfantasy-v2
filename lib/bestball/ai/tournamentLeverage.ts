import { prisma } from '@/lib/prisma'

export type LeverageReport = {
  uniquenessScore: number
  chalkyPlayers: { playerId: string; ownershipPct: number }[]
  differentiators: { playerId: string; ownershipPct: number }[]
  stackOpportunities: string[]
  ceilingScenario: string
  antiChalkRating: string
  leverageAlert: string | null
}

export async function generateTournamentLeverageReport(
  entryId: string,
  contestId: string,
  sport: string,
): Promise<LeverageReport> {
  const entries = await prisma.bestBallEntry.findMany({ where: { contestId } })
  const ownership = new Map<string, number>()
  const total = Math.max(1, entries.length)
  for (const e of entries) {
    const roster = (e.roster as { playerId?: string }[] | null) ?? []
    for (const p of roster) {
      if (!p.playerId) continue
      ownership.set(p.playerId, (ownership.get(p.playerId) ?? 0) + 1)
    }
  }
  const chalkyPlayers = [...ownership.entries()]
    .filter(([, c]) => c / total > 0.5)
    .map(([playerId, c]) => ({ playerId, ownershipPct: Math.round((c / total) * 100) }))
    .slice(0, 10)

  const entry = entries.find((x) => x.id === entryId)
  return {
    uniquenessScore: 50,
    chalkyPlayers,
    differentiators: [],
    stackOpportunities: [],
    ceilingScenario: `If your ${sport} core hits spike weeks together, this entry can win the pod.`,
    antiChalkRating: 'B',
    leverageAlert: entry ? null : 'Entry not found',
  }
}
