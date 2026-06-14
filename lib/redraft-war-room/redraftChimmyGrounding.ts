/**
 * REDRAFT → CHIMMY grounding adapter.
 *
 * Mirrors the other `build*ContextForChimmy(leagueId, userId)` adapters used by
 * the shared chat route: returns a deterministic, grounded redraft context block
 * (or null when the league is not a native redraft league). Reuses the Redraft
 * War Room context builder + deterministic engines + grounded prompt — NO engine
 * logic is duplicated here.
 *
 * Safety:
 * - Only fires for native redraft leagues (leagueType 'redraft', not dynasty, not a
 *   specialty variant which has its own Chimmy adapter). Returns null otherwise so
 *   the shared route is unaffected for other formats.
 * - Carries the redraft-only + no-invention system rules so global Chimmy answers
 *   stay grounded: no dynasty/future picks/taxi/devy/C2C, no fabricated
 *   stats/projections/injuries/news, and honest provider-limited statements.
 */
import { prisma } from '@/lib/prisma'
import { buildRedraftWarRoomContext } from './redraftWarRoomContext'
import { evaluateUserTeamNeeds } from './redraftTeamNeedsEngine'
import { buildLineupRecommendation } from './redraftLineupEngine'
import { buildWaiverRecommendations } from './redraftWaiverEngine'
import { REDRAFT_WAR_ROOM_SYSTEM_RULES, buildRedraftWarRoomPrompt } from './redraftWarRoomPrompt'

const SPECIALTY_VARIANTS = new Set([
  'survivor',
  'zombie',
  'big_brother',
  'idp',
  'dynasty_idp',
  'merged_devy_c2c',
  'devy_dynasty',
  'devy',
  'c2c',
  'guillotine',
])

/** True when the league is a native redraft league (own Chimmy grounding applies). */
async function isNativeRedraftLeague(leagueId: string): Promise<boolean> {
  const league = await prisma.league
    .findUnique({
      where: { id: leagueId },
      select: { leagueType: true, isDynasty: true, leagueVariant: true, bestBallMode: true, guillotineMode: true },
    })
    .catch(() => null)
  if (!league) return false
  if (league.isDynasty) return false
  if (league.guillotineMode) return false
  if (String(league.leagueType ?? '').trim().toLowerCase() !== 'redraft') return false
  const variant = String(league.leagueVariant ?? '').trim().toLowerCase()
  if (variant && SPECIALTY_VARIANTS.has(variant)) return false
  return true
}

/**
 * Build the grounded redraft context block for the shared Chimmy chat, or null
 * when the league is not native redraft or has no redraft season for the user.
 */
export async function buildRedraftContextForChimmy(
  leagueId: string,
  userId: string,
): Promise<string | null> {
  if (!leagueId || !userId) return null
  if (!(await isNativeRedraftLeague(leagueId))) return null

  const result = await buildRedraftWarRoomContext({ leagueId, userId })
  if (!result.ok) return null
  const context = result.context

  const rosterId = context.userRosterId
  const needs = rosterId ? evaluateUserTeamNeeds(context) : null
  const lineup = rosterId ? buildLineupRecommendation(context, rosterId) : null
  const waivers = rosterId ? buildWaiverRecommendations(context, rosterId) : null

  const grounded = buildRedraftWarRoomPrompt({ context, needs, lineup, waivers })

  return [
    '## REDRAFT AF WAR ROOM CONTEXT (deterministic, league-specific)',
    'When answering for THIS league, follow these rules and cite the facts below:',
    REDRAFT_WAR_ROOM_SYSTEM_RULES,
    '',
    grounded,
  ].join('\n')
}
