/**
 * Fantasy OS Suite — Phase V2.2: User (Manager) OS Executive Analytics Workspace.
 *
 * Provider-agnostic view models for the Manager OS flagship (Championship Trajectory) and its supporting
 * graphs, all built purely from the existing `ManagerCommandCenterSnapshot`
 * (`lib/decision-os/managerCommandCenter.ts`) — the real, id-only, cross-league Decision OS composition
 * the Manager Hub already fetches. No new Decision OS logic, no new fetch/contract, no raw provider
 * payloads, no player-level records, no provider identifiers.
 *
 * Honest data-availability note (the Step 1 audit outcome): the manager Decision OS contract carries NO
 * playoff-probability, standings/record, or roster positional-strength data — those live only in the
 * separate AI simulation subsystem, out of scope for this presentation phase. So Championship Trajectory
 * is an executive DECISION snapshot (current cross-team standing + open decision urgency), never a
 * fabricated playoff-odds timeline, and "Playoff Outlook" / "Position Strength" are deferred rather than
 * invented (documented in EXECUTIVE_VISUALIZATION_ENGINE.md §Phase V2.2).
 */
import type { ManagerCommandCenterSnapshot } from '@/lib/decision-os/managerCommandCenter'
import type { AttentionSignalSeverity } from '@/lib/decision-os/attentionSignals'
import type { RecommendationPriority, RecommendationCategory } from '@/lib/decision-os/phase6/recommendations/types'
import type { ExecutiveHealthStatus, ExecutiveBarDatum, ExecutiveSupportingChart } from './commissionerLeagueHealthViewModel'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Attention-signal severity → executive status (presentation mapping, no re-derivation). */
function statusFromSeverity(severity: AttentionSignalSeverity): ExecutiveHealthStatus {
  switch (severity) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'at_risk'
    case 'medium':
      return 'watch'
    case 'low':
      return 'healthy'
    default:
      return 'excellent'
  }
}

/** Recommendation priority → executive status. */
function statusFromPriority(priority: RecommendationPriority): ExecutiveHealthStatus {
  switch (priority) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'at_risk'
    case 'medium':
      return 'watch'
    default:
      return 'healthy'
  }
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 }

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// ─── Flagship: Championship Trajectory ─────────────────────────────────────────

export type ManagerTrajectoryStatus = 'on_track' | 'mixed' | 'needs_attention' | 'unavailable'

export type ManagerDecisionItem = {
  key: string
  label: string
  detail: string
  priorityLabel: string
  status: ExecutiveHealthStatus
  leagueId: string
}

export type ChampionshipTrajectoryViewModel = {
  status: ManagerTrajectoryStatus
  /** Ring status for the hero metric. */
  ringStatus: ExecutiveHealthStatus
  headline: string
  teamsOnTrack: number
  teamsNeedingAttention: number
  trackedTeams: number
  totalTeams: number
  onTrackPct: number
  urgentDecisions: number
  /** Real league-activity trend direction (aggregate of DailyBriefLeagueTrend), or null when no trend
   * data exists. Deliberately labeled as activity, never as a fabricated season/standings trajectory. */
  activityDirection: 'increasing' | 'decreasing' | 'flat' | null
  topDecisions: ManagerDecisionItem[]
  updatedAt: string
  available: boolean
}

function toDecisionItem(entry: ManagerCommandCenterSnapshot['recommendations'][number]): ManagerDecisionItem {
  const rec = entry.recommendation
  const action = rec.recommendedActions[0]?.action
  return {
    key: rec.id,
    label: titleCase(rec.category),
    detail: action || rec.expectedImpact || 'Review this opportunity.',
    priorityLabel: titleCase(rec.priority),
    status: statusFromPriority(rec.priority),
    leagueId: entry.leagueId,
  }
}

export function buildChampionshipTrajectory(
  snapshot: ManagerCommandCenterSnapshot | null | undefined,
): ChampionshipTrajectoryViewModel | null {
  if (!snapshot) return null
  const trackedTeams = Math.max(0, snapshot.totalLeagues - snapshot.unavailableLeagueCount)
  const available = snapshot.totalLeagues > 0 && trackedTeams > 0
  const onTrackPct = trackedTeams > 0 ? Math.round((snapshot.healthyLeagueCount / trackedTeams) * 100) : 0

  const urgentDecisions = snapshot.recommendations.filter(
    (r) => r.recommendation.priority === 'critical' || r.recommendation.priority === 'high',
  ).length

  let status: ManagerTrajectoryStatus
  let ringStatus: ExecutiveHealthStatus
  if (!available) {
    status = 'unavailable'
    ringStatus = 'unavailable'
  } else if (snapshot.atRiskLeagueCount === 0) {
    status = 'on_track'
    ringStatus = onTrackPct >= 80 ? 'excellent' : 'healthy'
  } else if (snapshot.atRiskLeagueCount * 2 < trackedTeams) {
    status = 'mixed'
    ringStatus = 'watch'
  } else {
    status = 'needs_attention'
    ringStatus = 'at_risk'
  }

  // Aggregate real activity-trend direction (never a fabricated season line).
  let activityDirection: ChampionshipTrajectoryViewModel['activityDirection'] = null
  if (snapshot.leagueTrends.length > 0) {
    const inc = snapshot.leagueTrends.filter((t) => t.direction === 'increasing').length
    const dec = snapshot.leagueTrends.filter((t) => t.direction === 'decreasing').length
    activityDirection = inc > dec ? 'increasing' : dec > inc ? 'decreasing' : 'flat'
  }

  const topDecisions = [...snapshot.recommendations]
    .sort((a, b) => PRIORITY_RANK[b.recommendation.priority] - PRIORITY_RANK[a.recommendation.priority])
    .slice(0, 3)
    .map(toDecisionItem)

  const teamsPart = `${snapshot.healthyLeagueCount} of ${trackedTeams} ${trackedTeams === 1 ? 'team' : 'teams'} on track`
  const decisionsPart =
    urgentDecisions > 0
      ? `${urgentDecisions} ${urgentDecisions === 1 ? 'decision needs' : 'decisions need'} you this week`
      : 'nothing urgent needs you this week'
  const headline = available
    ? `${teamsPart}; ${decisionsPart}.`
    : 'Your season overview appears once a league is connected and synced.'

  return {
    status,
    ringStatus,
    headline,
    teamsOnTrack: snapshot.healthyLeagueCount,
    teamsNeedingAttention: snapshot.atRiskLeagueCount,
    trackedTeams,
    totalTeams: snapshot.totalLeagues,
    onTrackPct,
    urgentDecisions,
    activityDirection,
    topDecisions,
    updatedAt: snapshot.generatedAt,
    available,
  }
}

// ─── Supporting: Weekly Decision Timeline ──────────────────────────────────────

export function buildWeeklyDecisionTimeline(
  snapshot: ManagerCommandCenterSnapshot | null | undefined,
): ExecutiveSupportingChart<ManagerDecisionItem> {
  if (!snapshot || snapshot.recommendations.length === 0) {
    return { headline: 'No decisions are waiting on you right now.', items: [], available: snapshot ? true : false }
  }
  const items = [...snapshot.recommendations]
    .sort((a, b) => PRIORITY_RANK[b.recommendation.priority] - PRIORITY_RANK[a.recommendation.priority])
    .slice(0, 8)
    .map(toDecisionItem)
  const critical = snapshot.recommendations.filter((r) => r.recommendation.priority === 'critical').length
  const headline =
    critical > 0
      ? `Start with ${critical} critical ${critical === 1 ? 'decision' : 'decisions'}, then work down the list.`
      : `${items.length} ${items.length === 1 ? 'decision' : 'decisions'} in priority order.`
  return { headline, items, available: true }
}

// ─── Supporting: Team Risk Summary ─────────────────────────────────────────────

export function buildTeamRiskSummary(
  snapshot: ManagerCommandCenterSnapshot | null | undefined,
): ExecutiveSupportingChart<ExecutiveBarDatum> {
  if (!snapshot || snapshot.totalLeagues === 0) {
    return { headline: 'Team risk appears once a league is connected and synced.', items: [], available: false }
  }
  const scale = snapshot.totalLeagues
  const criticalSignals = snapshot.attentionQueue.filter((s) => s.severity === 'critical').length
  const highSignals = snapshot.attentionQueue.filter((s) => s.severity === 'high').length
  const inactiveTeams = snapshot.leagueSummaries.filter((l) => l.isInactive).length

  const items: ExecutiveBarDatum[] = [
    {
      key: 'needs_attention',
      label: 'Teams needing attention',
      value: snapshot.atRiskLeagueCount,
      max: scale,
      status: snapshot.atRiskLeagueCount === 0 ? 'excellent' : snapshot.atRiskLeagueCount * 2 >= scale ? 'critical' : 'at_risk',
      valueLabel: `${snapshot.atRiskLeagueCount} of ${scale}`,
    },
    {
      key: 'critical_alerts',
      label: 'Critical alerts',
      value: criticalSignals,
      status: criticalSignals === 0 ? 'excellent' : 'critical',
      valueLabel: `${criticalSignals}`,
    },
    {
      key: 'high_alerts',
      label: 'High-priority alerts',
      value: highSignals,
      status: highSignals === 0 ? 'excellent' : 'at_risk',
      valueLabel: `${highSignals}`,
    },
    {
      key: 'inactive_teams',
      label: 'Inactive teams',
      value: inactiveTeams,
      max: scale,
      status: inactiveTeams === 0 ? 'excellent' : 'watch',
      valueLabel: `${inactiveTeams} of ${scale}`,
    },
  ]
  const severityRank: Record<ExecutiveHealthStatus, number> = {
    critical: 5,
    at_risk: 4,
    watch: 3,
    unavailable: 2,
    healthy: 1,
    excellent: 0,
  }
  items.sort((a, b) => severityRank[b.status] - severityRank[a.status] || b.value - a.value)
  const totalRisk = snapshot.atRiskLeagueCount + criticalSignals + highSignals
  const headline =
    totalRisk > 0
      ? `${totalRisk} risk ${totalRisk === 1 ? 'signal' : 'signals'} across your teams — the top one leads the list.`
      : 'No risk signals across your teams right now.'
  return { headline, items, available: true }
}

// ─── Supporting: Decision Focus (where your attention should go) ────────────────

const MANAGER_FOCUS_CATEGORIES: { category: RecommendationCategory; label: string }[] = [
  { category: 'lineup_discipline', label: 'Lineups' },
  { category: 'waiver_opportunity', label: 'Waivers' },
  { category: 'trade_coaching', label: 'Trades' },
  { category: 'engagement_boost', label: 'Engagement' },
]

export function buildDecisionFocus(
  snapshot: ManagerCommandCenterSnapshot | null | undefined,
): ExecutiveSupportingChart<ExecutiveBarDatum> {
  if (!snapshot || snapshot.recommendations.length === 0) {
    return { headline: 'Decision focus appears once you have active recommendations.', items: [], available: snapshot ? true : false }
  }
  const counts = new Map<RecommendationCategory, number>()
  for (const entry of snapshot.recommendations) {
    counts.set(entry.recommendation.category, (counts.get(entry.recommendation.category) ?? 0) + 1)
  }
  const items: ExecutiveBarDatum[] = MANAGER_FOCUS_CATEGORIES.map(({ category, label }): ExecutiveBarDatum => {
    const value = counts.get(category) ?? 0
    const status: ExecutiveHealthStatus = value === 0 ? 'excellent' : value >= 3 ? 'at_risk' : 'watch'
    return { key: category, label, value, status, valueLabel: `${value}` }
  }).filter((item) => item.value > 0)

  if (items.length === 0) {
    return { headline: 'No lineup, waiver, or trade focus areas right now.', items: [], available: true }
  }
  items.sort((a, b) => b.value - a.value)
  const top = items[0]
  const headline = `${top.label} need the most attention (${top.value} open).`
  return { headline, items, available: true }
}
