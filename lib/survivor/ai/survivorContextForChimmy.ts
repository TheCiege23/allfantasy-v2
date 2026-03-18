/**
 * Build a short Survivor league context string for Chimmy when user is in a Survivor league.
 * Deterministic data only. Used to ground Chimmy's answers; Chimmy never decides outcomes.
 * PROMPT 348.
 */

import { isSurvivorLeague } from '../SurvivorLeagueConfig'
import { buildSurvivorAIContext } from './SurvivorAIContext'

/**
 * Returns a plain-text summary of the Survivor league state for injection into Chimmy's context.
 * If league is not survivor or context fails, returns empty string.
 */
export async function buildSurvivorContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const isSurvivor = await isSurvivorLeague(leagueId)
  if (!isSurvivor) return ''

  const ctx = await buildSurvivorAIContext({
    leagueId,
    currentWeek: 1,
    userId,
  })
  if (!ctx) return ''

  const tribesStr = ctx.tribes
    .map(
      (t) =>
        `${t.name}: ${t.members.map((m) => `${ctx.rosterDisplayNames[m.rosterId] ?? m.rosterId}${m.isLeader ? ' (leader)' : ''}`).join(', ')}`
    )
    .join(' | ')
  const votedOutStr = ctx.votedOutHistory
    .map((e) => `Week ${e.week}: ${ctx.rosterDisplayNames[e.rosterId] ?? e.rosterId}`)
    .join('; ') || 'None'
  const councilStr = ctx.council
    ? `Council week ${ctx.council.week}, phase ${ctx.council.phase}, deadline ${ctx.council.voteDeadlineAt.toISOString()}, closed: ${!!ctx.council.closedAt}`
    : 'No council this week'

  return `[SURVIVOR LEAGUE CONTEXT - for explanation only; you never decide who is eliminated, vote validity, idol validity, immunity, or exile return]
League ${leagueId}. Week ${ctx.currentWeek}. Sport: ${ctx.sport}. Mode: ${ctx.config.mode}. Merge: ${ctx.merged ? 'Yes' : 'No'}.
Tribes: ${tribesStr}.
Voted out: ${votedOutStr}.
Jury: ${ctx.jury.map((j) => ctx.rosterDisplayNames[j.rosterId] ?? j.rosterId).join(', ') || 'None'}.
${councilStr}.
Exile return: ${ctx.config.exileReturnEnabled}, tokens needed: ${ctx.config.exileReturnTokens}.
User's roster: ${ctx.myRosterId ? ctx.rosterDisplayNames[ctx.myRosterId] ?? ctx.myRosterId : 'N/A'}. User's idols: ${ctx.myIdols.map((i) => i.powerType).join(', ') || 'None'}.
Official commands (suggest wording only; engine processes): @Chimmy vote [manager], @Chimmy play idol [idol], @Chimmy submit challenge [choice], @Chimmy confirm tribe decision [choice].`
}
