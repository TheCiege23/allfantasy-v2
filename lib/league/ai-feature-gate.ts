import { prisma } from '@/lib/prisma'

/**
 * AI Feature Gating for AF Commissioner Subscription.
 *
 * FREE features (available to all):
 * - Auto-generated schedule
 * - Real-time scoring
 * - Waiver processing
 * - Playoff bracket generation
 * - Basic notifications
 * - Standard roster management
 *
 * AI features (require AF Commissioner Subscription):
 * - AI Draft Assistant
 * - AI Lineup Optimizer (start/sit)
 * - AI Waiver Assistant
 * - AI Trade Analyzer
 * - AI Matchup Insights
 * - AI Power Rankings
 * - AI League Storyteller (weekly recaps)
 * - AI Player Insights
 * - AI Commissioner Tools (inactive detection, collusion)
 * - @Chimmy AI Assistant (advanced mode)
 */

export type AIFeatureId =
  | 'ai_draft_assistant'
  | 'ai_lineup_optimizer'
  | 'ai_start_sit'
  | 'ai_waiver_assistant'
  | 'ai_trade_analyzer'
  | 'ai_matchup_insights'
  | 'ai_power_rankings'
  | 'ai_league_storyteller'
  | 'ai_weekly_recap'
  | 'ai_player_insights'
  | 'ai_commissioner_tools'
  | 'ai_chimmy_advanced'
  | 'ai_collusion_detection'
  | 'ai_inactive_detection'
  | 'ai_betrayal_arcs'
  | 'ai_horde_narratives'

const AI_FEATURE_LABELS: Record<AIFeatureId, string> = {
  ai_draft_assistant: 'AI Draft Assistant',
  ai_lineup_optimizer: 'AI Lineup Optimizer',
  ai_start_sit: 'Start/Sit Recommendations',
  ai_waiver_assistant: 'AI Waiver Assistant',
  ai_trade_analyzer: 'AI Trade Analyzer',
  ai_matchup_insights: 'AI Matchup Insights',
  ai_power_rankings: 'AI Power Rankings',
  ai_league_storyteller: 'AI League Storyteller',
  ai_weekly_recap: 'AI Weekly Recaps',
  ai_player_insights: 'AI Player Insights',
  ai_commissioner_tools: 'AI Commissioner Tools',
  ai_chimmy_advanced: '@Chimmy Advanced Mode',
  ai_collusion_detection: 'Collusion Detection',
  ai_inactive_detection: 'Inactive Manager Detection',
  ai_betrayal_arcs: 'Betrayal Arc Narratives',
  ai_horde_narratives: 'Horde Narratives',
}

/**
 * Check if a league has the AF Commissioner Subscription active.
 */
export async function hasAfCommissionerSub(leagueId: string): Promise<boolean> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true, userId: true },
  })
  if (!league) return false

  const settings = (league.settings ?? {}) as Record<string, unknown>
  if (settings.af_commissioner_subscription === true) return true

  // Check user-level subscription
  const user = await prisma.appUser.findUnique({
    where: { id: league.userId },
    select: { settings: true },
  })
  if (!user) return false
  const userSettings = (user.settings ?? {}) as Record<string, unknown>
  return userSettings.af_commissioner_subscription === true
}

/**
 * Check if a specific AI feature is available for a league.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkAIFeatureAccess(
  leagueId: string,
  feature: AIFeatureId,
): Promise<{ allowed: boolean; reason?: string }> {
  const hasSub = await hasAfCommissionerSub(leagueId)
  if (hasSub) return { allowed: true }

  return {
    allowed: false,
    reason: `${AI_FEATURE_LABELS[feature] ?? feature} requires the AF Commissioner Subscription. Upgrade to unlock AI-powered features.`,
  }
}

/**
 * Middleware-style guard for API routes. Returns a NextResponse if denied, or null if allowed.
 */
export async function requireAIFeature(
  leagueId: string,
  feature: AIFeatureId,
): Promise<{ error: string; status: number } | null> {
  const result = await checkAIFeatureAccess(leagueId, feature)
  if (result.allowed) return null
  return {
    error: result.reason ?? 'AI feature requires AF Commissioner Subscription',
    status: 403,
  }
}

/**
 * Get all AI features with their availability status for a league.
 */
export async function getAIFeatureStatus(leagueId: string): Promise<
  Array<{
    id: AIFeatureId
    label: string
    available: boolean
  }>
> {
  const hasSub = await hasAfCommissionerSub(leagueId)
  return (Object.keys(AI_FEATURE_LABELS) as AIFeatureId[]).map((id) => ({
    id,
    label: AI_FEATURE_LABELS[id],
    available: hasSub,
  }))
}
