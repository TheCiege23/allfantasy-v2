/**
 * Contract bid: create contract when waiver/FA bid wins (PROMPT 339). Deterministic only.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import { validateContractBid } from './ContractValidationEngine'
import type { ContractBidInput } from './types'

/**
 * Process winning contract bid: create PlayerContract and update ledger.
 * Call after waiver/FA processing determines winner.
 */
export async function processWinningContractBid(
  leagueId: string,
  bid: ContractBidInput,
  playerName?: string | null,
  position?: string | null
): Promise<{ ok: boolean; contractId?: string; error?: string }> {
  const validation = await validateContractBid(leagueId, bid)
  if (!validation.valid) {
    return { ok: false, error: validation.errors.join('; ') }
  }
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const capYear = new Date().getFullYear()
  const contract = await prisma.playerContract.create({
    data: {
      leagueId,
      configId: config.configId,
      rosterId: bid.rosterId,
      playerId: bid.playerId,
      playerName: playerName ?? null,
      position: position ?? null,
      salary: bid.salary,
      yearsTotal: bid.years,
      yearSigned: capYear,
      contractYear: 1,
      status: 'active',
      source: 'waiver_bid',
    },
  })
  const { getOrCreateLedger } = await import('./CapCalculationService')
  await getOrCreateLedger(config, bid.rosterId, capYear)
  return { ok: true, contractId: contract.id }
}
