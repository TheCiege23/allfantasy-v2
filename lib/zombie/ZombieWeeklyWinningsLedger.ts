/**
 * Zombie weekly winnings ledger (PROMPT 353). Deterministic.
 */

import { prisma } from '@/lib/prisma'

export async function recordWinnings(
  leagueId: string,
  rosterId: string,
  week: number,
  amount: number,
  source: string,
  zombieLeagueId?: string | null
): Promise<void> {
  await prisma.zombieWeeklyWinnings.upsert({
    where: {
      leagueId_rosterId_week: { leagueId, rosterId, week },
    },
    create: {
      leagueId,
      zombieLeagueId: zombieLeagueId ?? null,
      rosterId,
      week,
      amount,
      source,
    },
    update: { amount, source },
  })
}

export async function getWinningsForWeek(
  leagueId: string,
  week: number
): Promise<{ rosterId: string; amount: number; source: string | null }[]> {
  const rows = await prisma.zombieWeeklyWinnings.findMany({
    where: { leagueId, week },
    select: { rosterId: true, amount: true, source: true },
  })
  return rows.map((r) => ({ rosterId: r.rosterId, amount: r.amount, source: r.source }))
}

export async function getTotalWinningsByRoster(leagueId: string): Promise<Record<string, number>> {
  const rows = await prisma.zombieWeeklyWinnings.findMany({
    where: { leagueId },
    select: { rosterId: true, amount: true },
  })
  const out: Record<string, number> = {}
  for (const r of rows) {
    out[r.rosterId] = (out[r.rosterId] ?? 0) + r.amount
  }
  return out
}
