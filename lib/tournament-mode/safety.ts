/**
 * PROMPT 5: Tournament safety and rule enforcement.
 * - No trades in tournament leagues.
 * - No draft pick trading.
 * - Round rules apply automatically; eliminated users cannot access competitive actions.
 * - Child leagues cannot exist outside parent tournament mapping (enforced by schema).
 */

import { isTournamentLeague } from './TournamentConfigService'

/** Whether the league is part of a tournament (child league). */
export { isTournamentLeague }

/** Trades are not allowed in tournament mode. Use this before creating or accepting trades. */
export async function areTradesAllowedForLeague(leagueId: string): Promise<boolean> {
  const isTournament = await isTournamentLeague(leagueId)
  return !isTournament
}

/** Draft pick trading is not allowed in tournament mode. */
export async function isDraftPickTradingAllowedForLeague(leagueId: string): Promise<boolean> {
  return areTradesAllowedForLeague(leagueId)
}

/**
 * Returns a reason string if the league disallows trades (e.g. tournament).
 * Use in API responses when rejecting a trade.
 */
export async function getTradeBlockReason(leagueId: string): Promise<string | null> {
  const allowed = await areTradesAllowedForLeague(leagueId)
  if (allowed) return null
  return 'Trades are disabled in Tournament Mode leagues.'
}
