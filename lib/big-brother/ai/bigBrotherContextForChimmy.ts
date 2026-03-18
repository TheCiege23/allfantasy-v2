/**
 * [NEW] Build Big Brother league context string for Chimmy. Deterministic data only.
 * Chimmy never decides outcomes; explains schedule, eligibility, tie-breaks, jury. PROMPT 4.
 */

import { isBigBrotherLeague } from '../BigBrotherLeagueConfig'
import { buildBigBrotherAIContext } from './BigBrotherAIContext'
import { getRosterDisplayNamesForLeague } from './getRosterDisplayNames'

const DETERMINISM_RULES = `
CRITICAL — You never decide or assert: who wins HOH or Veto, who is nominated, who is evicted, vote counts, or jury/finale winner. The game engine does. You only explain rules, schedule, eligibility, and suggest strategy. Never reveal secret votes.`

/**
 * Returns plain-text Big Brother context for Chimmy when user is in a Big Brother league.
 */
export async function buildBigBrotherContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return ''

  const ctx = await buildBigBrotherAIContext(leagueId, 'chimmy_host')
  if (!ctx) return ''

  const rosterIds = [
    ctx.hohRosterId,
    ctx.nominee1RosterId,
    ctx.nominee2RosterId,
    ctx.vetoWinnerRosterId,
    ctx.vetoSavedRosterId,
    ctx.replacementNomineeRosterId,
    ctx.evictedRosterId,
    ...ctx.finalNomineeRosterIds,
    ...ctx.juryRosterIds,
    ...ctx.eliminatedRosterIds,
  ].filter(Boolean) as string[]
  const names = await getRosterDisplayNamesForLeague(leagueId, rosterIds.length ? rosterIds : undefined)

  const hoh = ctx.hohRosterId ? names[ctx.hohRosterId] ?? ctx.hohRosterId : 'Not yet'
  const noms = ctx.finalNomineeRosterIds.map((id) => names[id] ?? id).join(', ') || 'None'
  const vetoWinner = ctx.vetoWinnerRosterId ? names[ctx.vetoWinnerRosterId] ?? ctx.vetoWinnerRosterId : 'Not yet'
  const juryStr = ctx.juryRosterIds.map((id) => names[id] ?? id).join(', ') || 'None'
  const eliminatedStr = ctx.eliminatedRosterIds.map((id) => names[id] ?? id).join(', ') || 'None'

  return `[BIG BROTHER LEAGUE CONTEXT - for explanation only; you never decide HOH, noms, veto winner, eviction, or vote counts]
League ${leagueId}. Week ${ctx.week}. Phase: ${ctx.phase}. Challenge mode: ${ctx.challengeMode}.
HOH: ${hoh}. On the block: ${noms}. Veto winner: ${vetoWinner}. Veto used: ${ctx.vetoUsed}. Replacement nominee: ${ctx.replacementNomineeRosterId ? names[ctx.replacementNomineeRosterId] ?? ctx.replacementNomineeRosterId : 'N/A'}.
Eliminated so far: ${eliminatedStr}. Jury: ${juryStr}.
Who can vote: eligible houseguests (not evicted, not on block; HOH votes only in tie if configured). Tie-break: lowest season points evicted. Jury starts per league config (after X eliminations / when X remain / fixed week).
${ctx.nextActionHint ? `Next: ${ctx.nextActionHint}` : ''}
${DETERMINISM_RULES}
Suggest command phrasing only; engine processes: submit vote via Private Voting or /vote, HOH nominations via commissioner/UI.`
}
