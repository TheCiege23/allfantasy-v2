/**
 * Compensatory pick formulas (PROMPT 339). Optional; stub for future support.
 */

import { getSalaryCapConfig } from './SalaryCapLeagueConfig'

export interface CompPickResult {
  rosterId: string
  round: number
  slot: number
  reason: string
}

/**
 * Compute compensatory picks from formula (e.g. lost FA by salary tier).
 * Returns list of extra picks. Stub: returns empty unless league has formula configured.
 */
export async function computeCompensatoryPicks(
  leagueId: string,
  capYear: number
): Promise<CompPickResult[]> {
  const config = await getSalaryCapConfig(leagueId)
  if (!config || !config.compPickEnabled || !config.compPickFormula) return []
  // TODO: parse compPickFormula and apply (e.g. net FA lost -> pick round/slot)
  return []
}
