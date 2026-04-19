import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'
import { fetchWaiverDashboard } from '@/lib/dashboard-strip/fetchWaiverDashboard'
import { fetchTradesDashboard } from '@/lib/dashboard-strip/fetchTradesDashboard'
import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { runWarRoomCommandCenter } from '@/lib/war-room-command-center'
import type { WarRoomToggles } from '@/lib/war-room-command-center/types'
import { countLeaguesWithWeeklyMatchupForUserTeams } from './countLeaguesWithWeeklyMatchupForUserTeams'
import { getPrimaryLeagueForUser } from './primaryLeagueForUser'
import { computeWaiverTimingForLeague } from './waiverTimingFromLeague'
import type { TodayActionsEngineResponse } from './types'
import { prisma } from '@/lib/prisma'

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

  const [lineupRaw, waivers, trades, leaguesWithSyncedWeeklyMatchupData, waiverTiming, autoProtectionRows] =
    await Promise.all([
      computeLineupActionsForUser(userId),
      fetchWaiverDashboard(userId),
      fetchTradesDashboard(userId),
      countLeaguesWithWeeklyMatchupForUserTeams(userId),
      computeWaiverTimingForLeague(primaryLeague?.id ?? null, userId),
      (async (): Promise<{ globalEnabled: boolean; autoSwapsLast24h: number }> => {
        try {
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
        } catch {
          return { globalEnabled: true, autoSwapsLast24h: 0 }
        }
      })(),
    ])

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
  if (primaryLeague?.id) {
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
  }
}
