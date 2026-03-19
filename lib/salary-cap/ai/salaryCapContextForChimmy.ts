/**
 * Build deterministic Salary Cap context for Chimmy.
 * Chimmy can explain: cap room, contracts, extension/tag eligibility, cut/dead-cap tradeoffs.
 * Chimmy NEVER decides: cap legality, extension prices, or any outcome. All are calculated by the backend.
 */

import { getSalaryCapConfig } from '../SalaryCapLeagueConfig'
import { getOrCreateLedger } from '../CapCalculationService'
import { getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'

export async function buildSalaryCapContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return ''
  if (!config.configId) {
    return '[SALARY CAP LEAGUE CONTEXT] This is a salary cap (contract dynasty) league. Config not yet persisted; commissioner should save salary cap settings.'
  }

  const userRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const capYear = new Date().getFullYear()

  let ledgerLine = 'User has no roster in this league.'
  let contractLine = ''
  if (userRosterId) {
    const ledger = await getOrCreateLedger(config, userRosterId, capYear)
    ledgerLine = `Current cap: ${ledger.totalCapHit} hit, ${ledger.deadMoneyHit} dead money, ${ledger.capSpace} cap space.`
    const contracts = await prisma.playerContract.count({
      where: {
        configId: config.configId,
        rosterId: userRosterId,
        status: { in: ['active', 'tagged', 'option_exercised'] },
      },
    })
    contractLine = `Active contracts: ${contracts}.`
  }

  const rules = [
    `Startup cap: ${config.startupCap}; growth: ${config.capGrowthPercent}%.`,
    `Contract years: ${config.contractMinYears}–${config.contractMaxYears}; rookie default: ${config.rookieContractYears}.`,
    config.deadMoneyEnabled ? `Dead money: ${config.deadMoneyPercentPerYear}% per year when cut.` : 'Dead money disabled.',
    config.rolloverEnabled ? `Rollover: up to ${config.rolloverMax}% of cap.` : 'Rollover disabled.',
    config.extensionsEnabled ? 'Extensions enabled.' : 'Extensions disabled.',
    config.franchiseTagEnabled ? 'Franchise tag enabled.' : 'Franchise tag disabled.',
  ].join(' ')

  return `[SALARY CAP LEAGUE CONTEXT - explanation only; you never decide cap legality, extension prices, or outcomes. All are calculated by the backend.]
This is a salary cap (contract dynasty) league. ${rules}
${ledgerLine} ${contractLine}
User may ask: can I afford this move; should I extend this player; why is this trade bad for my cap; who should I cut to get legal; how much dead cap will I take. Always use deterministic cap and contract data; never invent cap space or contract terms.`
}
