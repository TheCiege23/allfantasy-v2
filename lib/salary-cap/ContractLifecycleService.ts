/**
 * Contract lifecycle: expiration, year decrement, status transitions (PROMPT 339). Deterministic only.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'

/** Process contract expirations for a cap year: mark expired contracts. */
export async function processExpirations(leagueId: string, capYear: number): Promise<{ processed: number }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { processed: 0 }
  const contracts = await prisma.playerContract.findMany({
    where: {
      configId: config.configId,
      status: { in: ['active', 'tagged', 'option_exercised'] },
      yearSigned: { lte: capYear },
    },
    select: { id: true, yearsTotal: true, contractYear: true, yearSigned: true },
  })
  let processed = 0
  for (const c of contracts) {
    const endYear = c.yearSigned + c.yearsTotal - 1
    if (capYear > endYear || c.contractYear >= c.yearsTotal) {
      await prisma.playerContract.update({
        where: { id: c.id },
        data: { status: 'expired' },
      })
      processed++
    }
  }
  return { processed }
}

/** Decrement contract years for a new season (advance contractYear where still active). */
export async function decrementContractYears(leagueId: string, newCapYear: number): Promise<{ updated: number }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { updated: 0 }
  const contracts = await prisma.playerContract.findMany({
    where: {
      configId: config.configId,
      status: { in: ['active', 'tagged', 'option_exercised'] },
      yearSigned: { lt: newCapYear },
    },
    select: { id: true, yearSigned: true, yearsTotal: true, contractYear: true },
  })
  let updated = 0
  for (const c of contracts) {
    const endYear = c.yearSigned + c.yearsTotal - 1
    if (newCapYear <= endYear && c.contractYear < c.yearsTotal) {
      await prisma.playerContract.update({
        where: { id: c.id },
        data: { contractYear: c.contractYear + 1 },
      })
      updated++
    }
  }
  return { updated }
}
