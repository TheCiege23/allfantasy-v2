/**
 * KEEPER WAR ROOM → CHIMMY grounding adapter.
 *
 * Mirrors the redraft/dynasty adapters: returns a deterministic, grounded keeper WAR ROOM
 * context block (keeper rules, value surplus, recommendations, cut list, needs, draft plan)
 * — or null when the league is not a native keeper league. Reuses the Keeper War Room
 * context builder + deterministic engines + grounded prompt; NO engine logic is duplicated.
 *
 * Safety:
 * - Only fires for keeper leagues (the context builder returns non-ok for non-keeper).
 *   Returns null otherwise so redraft/dynasty and other formats are unaffected.
 * - Carries the keeper-only + no-invention rules: cost/surplus framing, keeper limit,
 *   NO dynasty future-pick talk, honest provider-limited statements.
 */
import { buildKeeperWarRoomContext } from './keeperWarRoomContext'
import { recommendKeepers } from './keeperRecommendationEngine'
import { buildKeeperCutList } from './keeperCutListEngine'
import { evaluateUserKeeperRosterNeeds } from './keeperRosterNeedsEngine'
import { buildKeeperDraftPlan } from './keeperDraftPlanEngine'
import { KEEPER_WAR_ROOM_SYSTEM_RULES, buildKeeperWarRoomPrompt } from './keeperWarRoomPrompt'

export async function buildKeeperContextForChimmy(leagueId: string, userId: string): Promise<string | null> {
  if (!leagueId || !userId) return null

  const result = await buildKeeperWarRoomContext({ leagueId, userId })
  if (!result.ok) return null
  const context = result.context

  const rosterId = context.userRosterId
  const recommendations = rosterId ? recommendKeepers(context, rosterId) : null
  const cutList = rosterId ? buildKeeperCutList(context, rosterId) : null
  const needs = rosterId ? evaluateUserKeeperRosterNeeds(context) : null
  const draftPlan = rosterId ? buildKeeperDraftPlan(context, rosterId) : null

  const grounded = buildKeeperWarRoomPrompt({ context, recommendations, cutList, needs, draftPlan })

  return [
    '## KEEPER AF WAR ROOM CONTEXT (deterministic, league-specific)',
    'When answering for THIS league, follow these rules and cite the facts below:',
    KEEPER_WAR_ROOM_SYSTEM_RULES,
    '',
    grounded,
  ].join('\n')
}
