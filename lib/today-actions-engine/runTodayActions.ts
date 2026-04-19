import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'
import { emptyLineupActionSummary } from '@/lib/lineup-actions/emptySummary'
import { fetchWaiverDashboard } from '@/lib/dashboard-strip/fetchWaiverDashboard'
import { fetchTradesDashboard } from '@/lib/dashboard-strip/fetchTradesDashboard'
import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { runWarRoomCommandCenter } from '@/lib/war-room-command-center'
import type { WarRoomToggles } from '@/lib/war-room-command-center/types'
import { countLeaguesWithWeeklyMatchupForUserTeams } from './countLeaguesWithWeeklyMatchupForUserTeams'
import { getPrimaryLeagueForUser } from './primaryLeagueForUser'
import { computeWaiverTimingForLeague } from './waiverTimingFromLeague'
import type { TodayActionsEngineResponse, TodayActionsSignalHealth } from './types'
import { prisma } from '@/lib/prisma'

type SignalStatus = 'ok' | 'failed'

function settledValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  failureKey: string,
  failures: Record<string, string>,
): { value: T; status: SignalStatus } {
  if (result.status === 'fulfilled') return { value: result.value, status: 'ok' }
  const reason = result.reason
  const msg = reason instanceof Error ? reason.message : String(reason)
  failures[failureKey] = msg.slice(0, 240)
  console.warn(`[today-actions] ${failureKey} fetch failed`, reason)
  return { value: fallback, status: 'failed' }
}

const INJURY_REASONS = new Set(['injured_starter', 'questionable_starter', 'doubtful_starter'])

const WAR_ROOM_TOGGLES: WarRoomToggles = {
  includeNews: true,
  includeInjuries: true,
  includeWaiverSuggestions: true,
  includeTradeSuggestions: true,
  includeStartSitRecommendations: true,
  includePowerRankings: true,
  includeTrendingPlayers: true,
  includeRookieProspectIntel: false,
  includePlayoffImpact: true,
  includeDynastyWeighting: true,
  includeMatchupPrep: true,
  includeTodayActions: true,
}

export async function runTodayActions(userId: string): Promise<TodayActionsEngineResponse> {
  const serverTimeIso = new Date().toISOString()

  const primaryLeague = await getPrimaryLeagueForUser(userId)

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const failureDetails: Record<string, string> = {}
  const settled = await Promise.allSettled([
    computeLineupActionsForUser(userId),
    fetchWaiverDashboard(userId),
    fetchTradesDashboard(userId),
    countLeaguesWithWeeklyMatchupForUserTeams(userId),
    computeWaiverTimingForLeague(primaryLeague?.id ?? null, userId),
    (async (): Promise<{ globalEnabled: boolean; autoSwapsLast24h: number }> => {
      const [profile, swapCount] = await Promise.all([
        prisma.userProfile.findUnique({
          where: { userId },
          select: { autoCoachGlobalEnabled: true },
        }),
        prisma.autoCoachSwapLog.count({
          where: { userId, swapMadeAt: { gte: since24h } },
        }),
      ])
      return {
        globalEnabled: profile?.autoCoachGlobalEnabled !== false,
        autoSwapsLast24h: swapCount,
      }
    })(),
  ] as const)

  const lineupResolved = settledValue(
    settled[0] as PromiseSettledResult<Awaited<ReturnType<typeof computeLineupActionsForUser>>>,
    emptyLineupActionSummary(),
    'lineup',
    failureDetails,
  )
  const waiversResolved = settledValue(
    settled[1] as PromiseSettledResult<Awaited<ReturnType<typeof fetchWaiverDashboard>>>,
    { totalLeagues: 0, recommendations: [], injuryPulse: [] },
    'waivers',
    failureDetails,
  )
  const tradesResolved = settledValue(
    settled[2] as PromiseSettledResult<Awaited<ReturnType<typeof fetchTradesDashboard>>>,
    { totalPending: 0, trades: [] },
    'trades',
    failureDetails,
  )
  const matchupSyncedResolved = settledValue(
    settled[3] as PromiseSettledResult<number>,
    0,
    'matchupSyncedLeagues',
    failureDetails,
  )
  const waiverTimingResolved = settledValue(
    settled[4] as PromiseSettledResult<Awaited<ReturnType<typeof computeWaiverTimingForLeague>>>,
    { nextWaiverProcessKnown: false, nextWaiverProcessIsoUtc: null, waiverTimingHint: null },
    'waiverTiming',
    failureDetails,
  )
  const autoProtectionResolved = settledValue(
    settled[5] as PromiseSettledResult<{ globalEnabled: boolean; autoSwapsLast24h: number }>,
    { globalEnabled: true, autoSwapsLast24h: 0 },
    'autoProtection',
    failureDetails,
  )

  const lineupRaw = lineupResolved.value
  const waivers = waiversResolved.value
  const trades = tradesResolved.value
  const leaguesWithSyncedWeeklyMatchupData = matchupSyncedResolved.value
  const waiverTiming = waiverTimingResolved.value
  const autoProtectionRows = autoProtectionResolved.value

  const lineup = await attachChimmyAdviceToLineupSummary(lineupRaw, userId)
  const actions = lineup.actions ?? []

  const lineupInjuryDecisionsToReview = actions.filter(
    (a) => INJURY_REASONS.has(a.reasonType) && a.severity !== 'info',
  ).length

  const matchupPrepDecisionsToReview = actions.filter(
    (a) => a.reasonType === 'matchup_prep' || a.sourceModule === 'MatchupPrep',
  ).length

  const warRoomLineupSignals = actions.filter(
    (a) => a.reasonType === 'war_room' || a.sourceModule === 'AFWarRoom',
  ).length

  const startSitReviewActions = actions.filter((a) => a.reasonType === 'ai_start_sit').length
  const waiverUrgentAdds = actions.filter((a) => a.reasonType === 'ai_waiver').length
  const weatherRiskActions = actions.filter((a) => a.reasonType === 'weather_risk').length

  const waiverPickupSuggestions = waivers.recommendations.reduce((n, r) => n + (r.pickups?.length ?? 0), 0)
  const injuryReportRowsInUserSports = waivers.injuryPulse?.length ?? 0

  let warRoomOrchestratedPriorities = 0
  let warRoomStatus: TodayActionsSignalHealth['warRoom'] = 'skipped'
  if (primaryLeague?.id) {
    try {
      const wr = await runWarRoomCommandCenter({
        userId,
        sportFilter: 'ALL',
        leagueId: primaryLeague.id,
        teamContext: 'my_team',
        strategyMode: 'balanced',
        timeHorizon: 'this_week',
        specificTeamExternalId: null,
        opponentTeamExternalId: null,
        toggles: WAR_ROOM_TOGGLES,
        skipAi: true,
        precomputedTodayLineup: lineup,
      })
      if (wr.ok) {
        warRoomOrchestratedPriorities = wr.actions.length
        warRoomStatus = 'ok'
      } else {
        warRoomStatus = 'failed'
        failureDetails.warRoom = wr.error.slice(0, 240)
      }
    } catch (err) {
      warRoomStatus = 'failed'
      const msg = err instanceof Error ? err.message : String(err)
      failureDetails.warRoom = msg.slice(0, 240)
      console.warn('[today-actions] warRoom failed', err)
    }
  }

  const warRoomDecisionsToReview = Math.max(warRoomOrchestratedPriorities, warRoomLineupSignals)

  const aiTimeContext = await buildAiTimeContextPayload(userId, {
    sportHint: primaryLeague?.sport ?? 'NFL',
    waiversProcessAt: waiverTiming.nextWaiverProcessIsoUtc,
  })

  return {
    serverTimeIso,
    aiTimeContext,
    lineup,
    waivers,
    trades,
    primaryLeagueId: primaryLeague?.id ?? null,
    counts: {
      waiverPickupSuggestions,
      injuryReportRowsInUserSports,
      lineupInjuryDecisionsToReview,
      matchupPrepDecisionsToReview,
      warRoomLineupSignals,
      warRoomOrchestratedPriorities,
      warRoomDecisionsToReview,
      startSitReviewActions,
      waiverUrgentAdds,
      weatherRiskActions,
      leaguesWithSyncedWeeklyMatchupData,
      pendingTrades: trades.totalPending,
      unresolvedLineupSlotActions: lineup.totalUnresolvedSlotActions,
      urgentLineupActions: lineup.urgentLineupActions,
    },
    waiverTiming: {
      nextWaiverProcessKnown: waiverTiming.nextWaiverProcessKnown,
      nextWaiverProcessIsoUtc: waiverTiming.nextWaiverProcessIsoUtc,
      waiverTimingHint: waiverTiming.waiverTimingHint,
    },
    autoStartSitProtection: autoProtectionRows,
    signalHealth: {
      lineup: lineupResolved.status,
      waivers: waiversResolved.status,
      trades: tradesResolved.status,
      waiverTiming: waiverTimingResolved.status,
      matchupSyncedLeagues: matchupSyncedResolved.status,
      autoProtection: autoProtectionResolved.status,
      warRoom: warRoomStatus,
      degraded:
        lineupResolved.status !== 'ok' ||
        waiversResolved.status !== 'ok' ||
        tradesResolved.status !== 'ok' ||
        waiverTimingResolved.status !== 'ok' ||
        matchupSyncedResolved.status !== 'ok' ||
        autoProtectionResolved.status !== 'ok' ||
        warRoomStatus === 'failed',
      failureDetails,
    },
  }
}
