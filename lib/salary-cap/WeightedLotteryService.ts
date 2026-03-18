/**
 * Weighted lottery: deterministic draft order from odds + seed (PROMPT 339). Auditable.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'

export interface LotterySlot {
  slot: number
  rosterId: string
  originalOrder: number
  weight: number
}

/**
 * Run weighted lottery: order rosters by seed and weights to produce draft order.
 * Weights: array per roster (e.g. non-playoff teams get higher weight). Seed for reproducibility.
 */
export async function runWeightedLottery(
  leagueId: string,
  slots: LotterySlot[],
  seed: string
): Promise<{ order: { slot: number; rosterId: string; originalOrder: number }[]; seed: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { order: [], seed }
  const rng = seededRandom(seed)
  const withRandom = slots.map((s) => ({ ...s, r: rng() }))
  const weighted = withRandom.map((s) => ({
    ...s,
    score: s.weight * (0.999 + s.r * 0.002),
  }))
  weighted.sort((a, b) => b.score - a.score)
  const order = weighted.map((s, i) => ({
    slot: i + 1,
    rosterId: s.rosterId,
    originalOrder: s.originalOrder,
  }))
  await prisma.salaryCapLotteryResult.upsert({
    where: {
      configId_capYear: { configId: config.configId, capYear: new Date().getFullYear() },
    },
    create: {
      leagueId: config.leagueId,
      configId: config.configId,
      capYear: new Date().getFullYear(),
      seed,
      order: order as object,
    },
    update: { seed, order: order as object },
  })
  return { order, seed }
}

function seededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state << 5) - state + seed.charCodeAt(i)
    state |= 0
  }
  const s = (state >>> 0) / 0xffffffff
  let n = 0
  return () => {
    n++
    const x = Math.sin(s * 997 + n * 9999) * 10000
    return x - Math.floor(x)
  }
}

export async function getLotteryResult(
  leagueId: string,
  capYear: number
): Promise<{ order: { slot: number; rosterId: string; originalOrder: number }[]; seed: string | null } | null> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return null
  const row = await prisma.salaryCapLotteryResult.findUnique({
    where: { configId_capYear: { configId: config.configId, capYear } },
  })
  if (!row) return null
  return {
    order: (row.order as { slot: number; rosterId: string; originalOrder: number }[]) ?? [],
    seed: row.seed,
  }
}
