/**
 * Rookie contract assignment from draft slot (PROMPT 339). Deterministic only.
 */

import { prisma } from '@/lib/prisma'
import { getSalaryCapConfig } from './SalaryCapLeagueConfig'

/** Default salary by draft slot (1-based). Slot 1 = highest salary. */
const DEFAULT_ROOKIE_SALARY_SCALE: Record<number, number> = {
  1: 30,
  2: 25,
  3: 20,
  4: 18,
  5: 16,
  6: 14,
  7: 12,
  8: 10,
  9: 8,
  10: 6,
  11: 5,
  12: 4,
}

function getRookieSalaryForSlot(slot: number): number {
  return DEFAULT_ROOKIE_SALARY_SCALE[slot] ?? 2
}

/**
 * Assign rookie contract after draft pick: create PlayerContract with league's rookie years and slot salary.
 */
export async function assignRookieContract(
  leagueId: string,
  rosterId: string,
  playerId: string,
  playerName: string | null,
  position: string | null,
  draftSlot: number,
  capYear: number
): Promise<{ ok: boolean; contractId?: string; error?: string }> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a salary cap league' }
  const salary = getRookieSalaryForSlot(draftSlot)
  const years = config.rookieContractYears
  const c = await prisma.playerContract.create({
    data: {
      leagueId,
      configId: config.configId,
      rosterId,
      playerId,
      playerName,
      position,
      salary,
      yearsTotal: years,
      yearSigned: capYear,
      contractYear: 1,
      status: 'active',
      source: 'rookie_draft',
    },
  })
  return { ok: true, contractId: c.id }
}
