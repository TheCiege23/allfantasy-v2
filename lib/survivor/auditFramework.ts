/**
 * Survivor Audit Framework — comprehensive logging for every game action.
 *
 * Every action in the Survivor system must be auditable. This framework
 * defines what gets logged, who can see it, and when it can be revealed.
 */

import { prisma } from '@/lib/prisma'

export type AuditCategory =
  | 'tribal_council'
  | 'challenge'
  | 'idol'
  | 'power'
  | 'tribe'
  | 'exile'
  | 'token'
  | 'jury'
  | 'automation'
  | 'commissioner'
  | 'twist'
  | 'chat'
  | 'scoring'

export type AuditAction =
  // Tribal
  | 'vote_cast' | 'vote_locked' | 'vote_reveal' | 'tribal_opened' | 'tribal_closed'
  | 'elimination' | 'revote' | 'rocks_draw' | 'fire_making' | 'commissioner_tie_resolve'
  // Challenge
  | 'challenge_created' | 'challenge_submission' | 'challenge_locked' | 'challenge_resolved'
  | 'challenge_reward_applied' | 'challenge_penalty_applied'
  // Idol/Power
  | 'idol_assigned' | 'idol_played' | 'idol_expired' | 'idol_transferred' | 'idol_converted'
  | 'power_used' | 'disadvantage_applied' | 'disadvantage_removed'
  // Tribe
  | 'tribe_created' | 'tribe_swap' | 'tribe_merged' | 'tribe_rebalanced'
  // Exile
  | 'player_exiled' | 'exile_score' | 'exile_token_awarded' | 'exile_token_wiped'
  | 'exile_return' | 'boss_win' | 'boss_reset'
  // Token
  | 'token_pool_pick' | 'token_pool_resolved' | 'token_spent' | 'token_converted'
  // Jury
  | 'jury_member_added' | 'jury_vote_cast' | 'jury_session_opened' | 'winner_crowned'
  // Automation
  | 'week_started' | 'week_finalized' | 'scoring_locked' | 'scoring_finalized'
  | 'phase_transition' | 'automation_error'
  // Commissioner
  | 'commissioner_override' | 'settings_changed' | 'manual_elimination'
  | 'manual_idol_assign' | 'manual_tribe_edit'
  // Twist
  | 'twist_executed' | 'twist_blocked' | 'twist_approved'
  // Scoring
  | 'score_correction' | 'score_boost_applied' | 'score_penalty_applied'

export interface AuditVisibility {
  isVisibleToCommissioner: boolean
  isVisibleToPublic: boolean
  isRevealablePostSeason: boolean
}

/**
 * Visibility rules by action type.
 */
const VISIBILITY_RULES: Record<string, AuditVisibility> = {
  // Always commissioner-only during season
  vote_cast: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: true },
  idol_assigned: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: true },
  idol_transferred: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: true },
  rocks_draw: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: true },
  token_pool_pick: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: false },
  commissioner_override: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: true },

  // Public after the event
  idol_played: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  elimination: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  tribe_swap: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  tribe_merged: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  challenge_resolved: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  winner_crowned: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  exile_return: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  twist_executed: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },
  phase_transition: { isVisibleToCommissioner: true, isVisibleToPublic: true, isRevealablePostSeason: true },

  // Commissioner only, never public
  automation_error: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: false },
  settings_changed: { isVisibleToCommissioner: true, isVisibleToPublic: false, isRevealablePostSeason: false },
}

function getVisibility(action: string): AuditVisibility {
  return VISIBILITY_RULES[action] ?? {
    isVisibleToCommissioner: true,
    isVisibleToPublic: false,
    isRevealablePostSeason: true,
  }
}

/**
 * Log an audit entry.
 */
export async function logAuditEntry(params: {
  leagueId: string
  week?: number
  category: AuditCategory
  action: AuditAction
  actorUserId?: string
  targetUserId?: string
  targetTribeId?: string
  relatedEntityId?: string
  relatedEntityType?: string
  data?: Record<string, unknown>
}): Promise<string> {
  const visibility = getVisibility(params.action)

  const entry = await (prisma as any).survivorAuditEntry.create({
    data: {
      leagueId: params.leagueId,
      week: params.week,
      category: params.category,
      action: params.action,
      actorUserId: params.actorUserId,
      targetUserId: params.targetUserId,
      targetTribeId: params.targetTribeId,
      relatedEntityId: params.relatedEntityId,
      relatedEntityType: params.relatedEntityType,
      data: params.data ?? {},
      ...visibility,
    },
  })
  return entry.id
}

/**
 * Query audit entries with visibility filtering.
 */
export async function getAuditEntries(
  leagueId: string,
  options: {
    week?: number
    category?: AuditCategory
    action?: AuditAction
    viewerRole: 'commissioner' | 'player' | 'public' | 'post_season'
    limit?: number
  },
): Promise<unknown[]> {
  const where: Record<string, unknown> = { leagueId }
  if (options.week != null) where.week = options.week
  if (options.category) where.category = options.category
  if (options.action) where.action = options.action

  // Visibility filter
  if (options.viewerRole === 'public') {
    where.isVisibleToPublic = true
  } else if (options.viewerRole === 'player') {
    where.isVisibleToPublic = true
  } else if (options.viewerRole === 'post_season') {
    where.OR = [{ isVisibleToPublic: true }, { isRevealablePostSeason: true }]
  }
  // Commissioner sees everything (no filter)

  return (prisma as any).survivorAuditEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 100,
  })
}

/**
 * Get audit summary for a season (for season snapshot).
 */
export async function getSeasonAuditSummary(leagueId: string): Promise<{
  totalEntries: number
  byCategory: Record<string, number>
  byAction: Record<string, number>
  idolsPlayed: number
  eliminationsTotal: number
  twistsExecuted: number
  commissionerOverrides: number
}> {
  const entries = await (prisma as any).survivorAuditEntry.findMany({
    where: { leagueId },
    select: { category: true, action: true },
  })

  const byCategory: Record<string, number> = {}
  const byAction: Record<string, number> = {}

  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1
    byAction[e.action] = (byAction[e.action] ?? 0) + 1
  }

  return {
    totalEntries: entries.length,
    byCategory,
    byAction,
    idolsPlayed: byAction['idol_played'] ?? 0,
    eliminationsTotal: byAction['elimination'] ?? 0,
    twistsExecuted: byAction['twist_executed'] ?? 0,
    commissionerOverrides: byAction['commissioner_override'] ?? 0,
  }
}
