/**
 * Startup auction: assign contracts from draft picks (PROMPT 339). Deterministic only.
 * Works with existing DraftSession (draftType=auction); DraftPick.amount = winning bid.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'
import { validateAuctionBid } from './ContractValidationEngine'

/**
 * Initialize ledgers for all rosters at startup cap (before auction).
 * Call when draft starts.
 */
export async function initializeStartupLedgers(leagueId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true },
  })
  const capYear = new Date().getFullYear()
  for (const r of rosters) {
    await prisma.salaryCapTeamLedger.upsert({
      where: {
        configId_rosterId_capYear: { configId: config.configId, rosterId: r.id, capYear },
      },
      create: {
        leagueId: config.leagueId,
        configId: config.configId,
        rosterId: r.id,
        capYear,
        totalCapHit: 0,
        deadMoneyHit: 0,
        rolloverUsed: 0,
        capSpace: config.startupCap,
      },
      update: {},
    })
  }
  return { ok: true }
}

/**
 * Assign contract from startup auction pick: DraftPick.amount = salary; years from session or default.
 */
export async function assignStartupAuctionContract(
  leagueId: string,
  draftPickId: string,
  contractYears: number
): Promise<{ ok: boolean; contractId?: string; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const pick = await prisma.draftPick.findUnique({
    where: { id: draftPickId },
    include: { session: true },
  })
  if (!pick || pick.session.leagueId !== leagueId) {
    return { ok: false, error: 'Draft pick not found' }
  }
  const amount = pick.amount ?? 0
  const rosterId = pick.rosterId
  const validation = await validateAuctionBid(leagueId, rosterId, amount, contractYears)
  if (!validation.valid) return { ok: false, error: validation.errors.join('; ') }
  const capYear = new Date().getFullYear()
  const contract = await prisma.playerContract.create({
    data: {
      leagueId,
      configId: config.configId,
      rosterId,
      playerId: pick.playerId ?? '',
      playerName: pick.playerName,
      position: pick.position,
      salary: amount,
      yearsTotal: contractYears,
      yearSigned: capYear,
      contractYear: 1,
      status: 'active',
      source: 'startup_auction',
    },
  })
  const { getOrCreateLedger } = await import('./CapCalculationService')
  await getOrCreateLedger(config, rosterId, capYear)
  return { ok: true, contractId: contract.id }
}
