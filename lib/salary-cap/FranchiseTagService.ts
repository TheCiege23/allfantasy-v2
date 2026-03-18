/**
 * Franchise tag eligibility and application (PROMPT 339). Deterministic only.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import type { FranchiseTagEligibility } from './types'

/** Tag cost = top-5 position average or % of cap; simplified: 120% of current salary. */
const TAG_PREMIUM_MULTIPLIER = 1.2

export async function getFranchiseTagEligibility(
  leagueId: string,
  rosterId: string,
  contractId: string
): Promise<FranchiseTagEligibility | null> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config || !config.franchiseTagEnabled) return null
  const alreadyUsed = await prisma.playerContract.count({
    where: { configId: config.configId, rosterId, status: 'tagged' },
  })
  if (alreadyUsed > 0) {
    return { eligible: false, tagCost: 0, alreadyUsed: true, reason: 'Franchise tag already used' }
  }
  const contract = await prisma.playerContract.findFirst({
    where: { id: contractId, leagueId, configId: config.configId, rosterId },
  })
  if (!contract) return null
  const inFinalYear = contract.contractYear >= contract.yearsTotal
  if (!inFinalYear) {
    return { eligible: false, tagCost: 0, alreadyUsed: false, reason: 'Contract not in final year' }
  }
  const tagCost = Math.ceil(contract.salary * TAG_PREMIUM_MULTIPLIER)
  return { eligible: true, tagCost, alreadyUsed: false, reason: undefined }
}

export async function applyFranchiseTag(
  leagueId: string,
  contractId: string
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const contract = await prisma.playerContract.findFirst({
    where: { id: contractId, leagueId, configId: config.configId },
  })
  if (!contract) return { ok: false, error: 'Contract not found' }
  const elig = await getFranchiseTagEligibility(leagueId, contract.rosterId, contractId)
  if (!elig?.eligible) return { ok: false, error: elig?.reason ?? 'Not eligible' }
  await prisma.playerContract.update({
    where: { id: contractId },
    data: {
      status: 'tagged',
      franchiseTagAt: new Date(),
      salary: elig.tagCost,
      yearsTotal: 1,
      contractYear: 1,
    },
  })
  return { ok: true }
}
