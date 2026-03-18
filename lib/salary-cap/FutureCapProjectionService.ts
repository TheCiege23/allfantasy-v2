/**
 * Future cap projection: multi-year cap hit and space (PROMPT 339). Deterministic only.
 */

import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import {
  getEffectiveCap,
  getOrCreateLedger,
  getTotalCapHitForRoster,
} from './CapCalculationService'
import { prisma } from '@/lib/prisma'
import type { FutureCapYear } from './types'

export async function getFutureCapProjection(
  leagueId: string,
  rosterId: string,
  capYears: number[]
): Promise<FutureCapYear[]> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return []
  const currentYear = new Date().getFullYear()
  const years = capYears.length ? capYears : [currentYear, currentYear + 1, currentYear + 2]
  const out: FutureCapYear[] = []
  for (const capYear of years) {
    const { totalCapHit, deadMoneyHit } = await getTotalCapHitForRoster(
      config.configId,
      rosterId,
      capYear
    )
    const ledger = await getOrCreateLedger(config, rosterId, capYear)
    const effectiveCap = getEffectiveCap(config, capYear, ledger.rolloverUsed)
    const projectedSpace = effectiveCap - totalCapHit - deadMoneyHit
    const contractCount = await prisma.playerContract.count({
      where: {
        configId: config.configId,
        rosterId,
        status: { in: ['active', 'tagged', 'option_exercised'] },
        yearSigned: { lte: capYear },
      },
    })
    out.push({
      capYear,
      capCeiling: effectiveCap,
      totalCapHit,
      deadMoney: deadMoneyHit,
      projectedSpace,
      contractCount,
    })
  }
  return out
}
