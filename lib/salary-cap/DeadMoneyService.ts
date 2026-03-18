/**
 * Dead money: compute and apply on cut/release (PROMPT 339). Deterministic only.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import type { SalaryCapConfig } from './types'

/**
 * Compute dead money for cutting a player: remaining salary × (percent/100) per remaining year.
 * Returns { capYear: amount } for current and future years.
 */
export function computeDeadMoney(
  config: SalaryCapConfig,
  salary: number,
  yearsRemaining: number,
  fromCapYear: number
): Record<number, number> {
  if (!config.deadMoneyEnabled || yearsRemaining <= 0) return {}
  const pct = config.deadMoneyPercentPerYear / 100
  const perYear = Math.ceil(salary * pct)
  const result: Record<number, number> = {}
  for (let y = 0; y < yearsRemaining; y++) {
    result[fromCapYear + y] = perYear
  }
  return result
}

/**
 * Apply cut: mark contract as cut, set deadMoneyRemaining, create event.
 */
export async function applyCut(
  leagueId: string,
  contractId: string,
  capYear: number
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const contract = await prisma.playerContract.findFirst({
    where: { id: contractId, leagueId, configId: config.configId },
  })
  if (!contract) return { ok: false, error: 'Contract not found' }
  if (contract.status !== 'active' && contract.status !== 'tagged' && contract.status !== 'option_exercised') {
    return { ok: false, error: 'Contract not in cuttable state' }
  }
  const yearsRemaining = contract.yearsTotal - contract.contractYear
  const deadMoney = computeDeadMoney(config, contract.salary, yearsRemaining, capYear)
  await prisma.playerContract.update({
    where: { id: contractId },
    data: {
      status: 'cut',
      cutAt: new Date(),
      deadMoneyRemaining: deadMoney as object,
    },
  })
  await appendEvent(leagueId, config.configId, 'contract_cut', {
    contractId,
    rosterId: contract.rosterId,
    playerId: contract.playerId,
    capYear,
    deadMoney,
  })
  return { ok: true }
}

async function appendEvent(
  leagueId: string,
  configId: string,
  eventType: string,
  metadata: object
): Promise<void> {
  await prisma.salaryCapEventLog.create({
    data: { leagueId, configId, eventType, metadata: metadata as object },
  })
}
