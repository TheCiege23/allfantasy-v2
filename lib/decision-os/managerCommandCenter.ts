/**
 * Fantasy OS Suite — Phase OS-C1: Manager Operating System Foundation.
 *
 * Aggregates the already-real, single-league `resolveUserOsSnapshot` (`userOs.ts`) across every
 * league one signed-in user belongs to — commissioner AND member AND imported, unlike Commissioner
 * OS's own command center (`commissionerCommandCenter.ts`), which filters to commissioned leagues
 * only. This is Manager OS's own "Multi-League Overview": the first genuinely cross-league Decision
 * OS composition built for the person PLAYING in leagues, not running them.
 *
 * Sibling, not wrapper, matching every other Decision OS multi-league composition's own precedent
 * (`commissionerCommandCenter.ts`, `platformOs.ts`): this calls `resolveUserOsSnapshot` directly per
 * league rather than wrapping a sibling composition. Zero new derivation — every field below is
 * either a direct pass-through of `UserOsSnapshot`'s own already-real output or a signal produced by
 * `deriveManagerAttentionSignals` (`attentionSignals.ts`), which itself only relabels
 * `UserOsSnapshot` fields, never recomputes them.
 *
 * Provider-agnostic and id-only — never accepts/returns a league display name, matching every other
 * Decision OS composition's own contract; that's ordinary AF/dashboard data zipped on by the caller.
 */
import { resolveUserOsSnapshot } from './userOs'
import type { UserOsSnapshot } from './userOs'
import type { ManagerRetentionRisk, ParticipationTier } from './behavioral/manager-intelligence'
import {
  ATTENTION_QUEUE_CAP,
  deriveManagerAttentionSignals,
  sortAttentionSignals,
  type DecisionOsAttentionSignal,
} from './attentionSignals'
import type { DailyBriefLeagueTrend } from './dailyBrief'

/** `'low'` retention risk + active participation is the only "healthy" bucket — mirrors
 * `commissionerCommandCenter.ts`'s own `HEALTHY_STATUSES`/`AT_RISK_STATUSES` bucketing pattern, just
 * over `ManagerRetentionRisk` instead of the league-health engine's `overallStatus`. */
const AT_RISK_RETENTION = new Set<ManagerRetentionRisk>(['high', 'critical'])

export interface ManagerCommandCenterLeagueSummary {
  leagueId: string
  available: boolean
  participationTier: ParticipationTier | null
  engagementScore: number | null
  retentionRisk: ManagerRetentionRisk | null
  isInactive: boolean
  recommendationCount: number
}

export interface ManagerCommandCenterSnapshot {
  generatedAt: string
  totalLeagues: number
  healthyLeagueCount: number
  atRiskLeagueCount: number
  unavailableLeagueCount: number
  leagueSummaries: ManagerCommandCenterLeagueSummary[]
  attentionQueue: DecisionOsAttentionSignal[]
  leagueTrends: DailyBriefLeagueTrend[]
  warnings: string[]
}

function emptySnapshot(now: Date, warnings: string[]): ManagerCommandCenterSnapshot {
  return {
    generatedAt: now.toISOString(),
    totalLeagues: 0,
    healthyLeagueCount: 0,
    atRiskLeagueCount: 0,
    unavailableLeagueCount: 0,
    leagueSummaries: [],
    attentionQueue: [],
    leagueTrends: [],
    warnings,
  }
}

/** Defense-in-depth — `resolveUserOsSnapshot` already never throws on its own (it degrades to
 * `available: false` internally), matching every other Decision OS composition's identical
 * precedent (`commissionerCommandCenter.ts`'s own `resolveLeagueSafely`). */
async function resolveManagerLeagueSafely(
  leagueId: string,
  userId: string,
  now: Date,
): Promise<UserOsSnapshot | null> {
  try {
    return await resolveUserOsSnapshot(leagueId, userId, now)
  } catch {
    return null
  }
}

/**
 * Resolves the manager command-center snapshot for an EXPLICIT set of league IDs the caller has
 * already confirmed the user belongs to. Never throws — a failure for one league marks it
 * unavailable and excludes it from aggregate counts; it never fails the whole snapshot. An empty
 * `leagueIds` list degrades to an honest all-zero snapshot with `warnings: ['no_leagues_specified']`.
 */
export async function resolveManagerCommandCenterSnapshot(
  userId: string,
  leagueIds: readonly string[],
  now: Date = new Date(),
): Promise<ManagerCommandCenterSnapshot> {
  if (leagueIds.length === 0) {
    return emptySnapshot(now, ['no_leagues_specified'])
  }

  let healthyLeagueCount = 0
  let atRiskLeagueCount = 0
  let unavailableLeagueCount = 0
  const leagueSummaries: ManagerCommandCenterLeagueSummary[] = []
  const attentionSignals: DecisionOsAttentionSignal[] = []
  const leagueTrends: DailyBriefLeagueTrend[] = []

  for (const leagueId of leagueIds) {
    const snapshot = await resolveManagerLeagueSafely(leagueId, userId, now)

    if (!snapshot || !snapshot.available) {
      unavailableLeagueCount += 1
      leagueSummaries.push({
        leagueId,
        available: false,
        participationTier: null,
        engagementScore: null,
        retentionRisk: null,
        isInactive: false,
        recommendationCount: 0,
      })
      continue
    }

    const { teamHealth, recommendations, leagueTrend } = snapshot
    if (AT_RISK_RETENTION.has(teamHealth.retentionRisk) || teamHealth.isInactive) {
      atRiskLeagueCount += 1
    } else {
      healthyLeagueCount += 1
    }

    const managerRecommendations = (recommendations?.recommendations ?? []).filter(
      (r) => r.tier === 'manager',
    )
    leagueSummaries.push({
      leagueId,
      available: true,
      participationTier: teamHealth.participationTier,
      engagementScore: teamHealth.overallEngagementScore,
      retentionRisk: teamHealth.retentionRisk,
      isInactive: teamHealth.isInactive,
      recommendationCount: managerRecommendations.length,
    })

    attentionSignals.push(
      ...deriveManagerAttentionSignals({
        leagueId,
        now,
        retentionRisk: teamHealth.retentionRisk,
        retentionRiskReasons: teamHealth.retentionRiskReasons,
        isInactive: teamHealth.isInactive,
        recommendations: managerRecommendations,
      }),
    )

    if (leagueTrend.available) {
      leagueTrends.push({
        leagueId,
        direction: leagueTrend.direction,
        eventCountDelta: leagueTrend.eventCountDelta,
      })
    }
  }

  // Highest severity first across ALL leagues together, capped only after the full comparison —
  // matching `commissionerCommandCenter.ts`'s identical rationale (never crowd out a more urgent
  // signal from a later league by capping incrementally).
  const attentionQueue = sortAttentionSignals(attentionSignals).slice(0, ATTENTION_QUEUE_CAP)

  return {
    generatedAt: now.toISOString(),
    totalLeagues: leagueIds.length,
    healthyLeagueCount,
    atRiskLeagueCount,
    unavailableLeagueCount,
    leagueSummaries,
    attentionQueue,
    leagueTrends,
    warnings: [],
  }
}
