/**
 * Extension eligibility and pricing (PROMPT 339). Deterministic only.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import type { ExtensionEligibility } from './types'

const EXTENSION_MULTIPLIER = 1.1
const EXTENSION_MAX_YEARS = 4

/** Check if a contract is extension-eligible and compute extension price. */
export async function getExtensionEligibility(
  leagueId: string,
  contractId: string
): Promise<ExtensionEligibility | null> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config || !config.extensionsEnabled) return null
  const contract = await prisma.playerContract.findFirst({
    where: { id: contractId, leagueId, configId: config.configId },
  })
  if (!contract) return null
  if (contract.status !== 'active' && contract.status !== 'option_exercised') {
    return { eligible: false, contractId, currentSalary: contract.salary, extensionPrice: 0, maxExtensionYears: 0, reason: 'Contract not active' }
  }
  const inFinalYear = contract.contractYear >= contract.yearsTotal
  if (!inFinalYear) {
    return { eligible: false, contractId, currentSalary: contract.salary, extensionPrice: 0, maxExtensionYears: 0, reason: 'Not in final contract year' }
  }
  const extensionPrice = Math.ceil(contract.salary * EXTENSION_MULTIPLIER)
  return {
    eligible: true,
    contractId,
    currentSalary: contract.salary,
    extensionPrice,
    maxExtensionYears: Math.min(EXTENSION_MAX_YEARS, config.contractMaxYears),
    reason: undefined,
  }
}

/** Apply extension: new contract row or update; mark old as replaced. League-specific: here we create new contract. */
export async function applyExtension(
  leagueId: string,
  contractId: string,
  newYears: number,
  newSalary: number
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const elig = await getExtensionEligibility(leagueId, contractId)
  if (!elig?.eligible) return { ok: false, error: elig?.reason ?? 'Not eligible' }
  if (newYears < 1 || newYears > elig.maxExtensionYears) {
    return { ok: false, error: `Years must be 1-${elig.maxExtensionYears}` }
  }
  if (newSalary < elig.extensionPrice) {
    return { ok: false, error: `Salary must be at least ${elig.extensionPrice}` }
  }
  const contract = await prisma.playerContract.findUnique({ where: { id: contractId } })
  if (!contract) return { ok: false, error: 'Contract not found' }
  const capYear = new Date().getFullYear()
  await prisma.playerContract.update({
    where: { id: contractId },
    data: { status: 'expired' },
  })
  await prisma.playerContract.create({
    data: {
      leagueId,
      configId: config.configId,
      rosterId: contract.rosterId,
      playerId: contract.playerId,
      playerName: contract.playerName,
      position: contract.position,
      salary: newSalary,
      yearsTotal: newYears,
      yearSigned: capYear,
      contractYear: 1,
      status: 'active',
      source: 'extension',
    },
  })
  return { ok: true }
}
