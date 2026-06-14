/**
 * DYNASTY WAR ROOM → CHIMMY grounding adapter.
 *
 * Mirrors the other `build*ContextForChimmy(leagueId, userId)` adapters used by the
 * shared chat route: returns a deterministic, grounded dynasty WAR ROOM context block
 * (value/age/direction/needs/buy-sell-hold) — or null when the league is not a native
 * dynasty league. Reuses the Dynasty War Room context builder + deterministic engines
 * + grounded prompt; NO engine logic is duplicated here.
 *
 * This is SEPARATE from the existing settings-only `dynastyContextForChimmy` (which
 * explains playoff/SF/taxi/rookie-draft rules). Both can fire for a dynasty league —
 * this one adds the asset-intelligence grounding.
 *
 * Safety:
 * - Only fires for dynasty leagues (isDynasty or devy/c2c dynasty variants). Returns
 *   null otherwise so redraft and other formats are completely unaffected.
 * - Carries the dynasty-only + no-invention system rules: multi-year horizon, no
 *   redraft short-season logic, unpriced future picks, honest provider-limited states.
 */
import { buildDynastyWarRoomContext } from './dynastyWarRoomContext'
import { evaluateUserDynastyTeamNeeds } from './dynastyRosterNeedsEngine'
import { evaluateUserDynastyDirection } from './dynastyTeamDirectionEngine'
import { evaluateBuySellHold } from './dynastyBuySellHoldEngine'
import { buildDynastyWaiverRecommendations } from './dynastyWaiverEngine'
import { DYNASTY_WAR_ROOM_SYSTEM_RULES, buildDynastyWarRoomPrompt } from './dynastyWarRoomPrompt'

/**
 * Build the grounded dynasty War Room context block for the shared Chimmy chat, or
 * null when the league is not a native dynasty league or has no roster for the user.
 * The context builder itself enforces dynasty-only (returns 404 for non-dynasty), so
 * we simply propagate null on any non-ok result.
 */
export async function buildDynastyWarRoomContextForChimmy(
  leagueId: string,
  userId: string,
): Promise<string | null> {
  if (!leagueId || !userId) return null

  const result = await buildDynastyWarRoomContext({ leagueId, userId })
  if (!result.ok) return null
  const context = result.context

  const rosterId = context.userRosterId
  const direction = rosterId ? evaluateUserDynastyDirection(context) : null
  const needs = rosterId ? evaluateUserDynastyTeamNeeds(context) : null
  const buySellHold = rosterId ? evaluateBuySellHold(context, rosterId) : null
  const waivers = rosterId ? buildDynastyWaiverRecommendations(context, rosterId) : null

  const grounded = buildDynastyWarRoomPrompt({ context, direction, needs, buySellHold, waivers })

  return [
    '## DYNASTY AF WAR ROOM CONTEXT (deterministic, league-specific)',
    'When answering for THIS league, follow these rules and cite the facts below:',
    DYNASTY_WAR_ROOM_SYSTEM_RULES,
    '',
    grounded,
  ].join('\n')
}
