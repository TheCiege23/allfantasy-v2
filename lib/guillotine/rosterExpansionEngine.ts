import { prisma } from '@/lib/prisma'

type ExpansionRule = { triggerTeamsRemaining: number; addBenchSlots: number }

export async function checkRosterExpansionTriggers(seasonId: string): Promise<{ applied: string[] }> {
  const g = await prisma.guillotineSeason.findFirst({
    where: { id: seasonId },
    include: { league: true },
  })
  if (!g) return { applied: [] }

  const raw = g.league.guillotineRosterExpansion
  const rules: ExpansionRule[] = Array.isArray(raw) ? (raw as ExpansionRule[]) : []
  const applied: string[] = []
  const active = g.currentTeamsActive

  for (const rule of rules) {
    if (active <= rule.triggerTeamsRemaining) {
      applied.push(`trigger<=${rule.triggerTeamsRemaining}:+${rule.addBenchSlots} bench (wire roster slot mutation)`)
    }
  }
  return { applied }
}
