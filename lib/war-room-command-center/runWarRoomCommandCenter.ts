import 'server-only'

import { leagueToolAccessUserMessage } from '@/lib/ai-tools/league-tool-access-messages'
import { assertLeagueMemberWithCode } from '@/lib/league/league-access'
import { prisma } from '@/lib/prisma'
import { attachIntelligenceToChimmyPayload, buildAiToolPayload } from '@/lib/intelligence'
import { resolveNormalizedLeagueContext } from '@/lib/league-context-engine'
import type { NormalizedLeagueContext } from '@/lib/league-context-engine/types'
import { openaiChatText } from '@/lib/openai-client'
import { runWaiverIntelligenceAnalysis } from '@/lib/ai-tools-waiver/waiver-intelligence'
import type { WaiverStrategy } from '@/lib/ai-tools-waiver/waiver-intelligence'
import { runStartSitAnalysis } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import type { StartSitMode } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import { runPowerRankingsDashboard } from '@/lib/power-rankings-dashboard/runPowerRankingsDashboard'
import type { RankingModeId, TimeWindowId } from '@/lib/power-rankings-dashboard/types'
import { runTrendingDashboard } from '@/lib/trending-players/runTrendingDashboard'
import type { TimeWindowId as TrendTimeWindowId } from '@/lib/trending-players/types'
import type { ContextModeId } from '@/lib/trending-players/types'
import { runInjuryImpactDashboard } from '@/lib/injury-impact-dashboard/runInjuryImpactDashboard'
import type { InjuryTeamContextId } from '@/lib/injury-impact-dashboard/types'
import { normalizeToSupportedSport, SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'
import type {
  WarRoomCommandCenterInput,
  WarRoomCommandCenterOutput,
  WarRoomModuleSnapshot,
} from './types'
import type { MatchupPrepDashboardResult, MatchupStrategyModeId, MatchupTimeHorizonId } from '@/lib/matchup-prep-dashboard/types'
import { runMatchupPrepDashboard } from '@/lib/matchup-prep-dashboard'
import { computeLineupActionsForUser } from '@/lib/lineup-actions/computeLineupActionsForUser'
import { attachChimmyAdviceToLineupSummary } from '@/lib/lineup-actions/chimmyLineupAdvice'
import type { LineupActionSummaryPayload } from '@/lib/lineup-actions/types'
import { orchestrateWarRoomBrain } from './orchestrateWarRoomBrain'
import {
  aggregateSourceFlags,
  buildWarRoomAiTimeContext,
  buildWarRoomIngestionHealth,
  leagueScoringDigestFromLce,
} from './warRoomOrchestrationContext'
import { loadTradeValueWarRoomContext } from '@/lib/trade-value-console/war-room-trade-context'
import type { InjuryImpactDashboardResult } from '@/lib/injury-impact-dashboard/types'
import type { PowerRankingsDashboardResult } from '@/lib/power-rankings-dashboard/types'
import type { WaiverIntelligenceResult } from '@/lib/ai-tools-waiver/waiver-intelligence'
import type { TrendingDashboardResult } from '@/lib/trending-players/types'
import type { StartSitAnalyzeResult } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function isStartSitOk(v: unknown): v is StartSitAnalyzeResult {
  return typeof v === 'object' && v !== null && 'recommendations' in v
}

function waiverStrategy(s: WarRoomCommandCenterInput['strategyMode']): WaiverStrategy {
  const m: Record<WarRoomCommandCenterInput['strategyMode'], WaiverStrategy> = {
    balanced: 'neutral',
    win_now: 'win_now',
    aggressive: 'upside',
    conservative: 'safe_floor',
    rebuilder: 'rebuilder',
    playoff_push: 'win_now',
    streaming_focus: 'streamers',
    prospect_focus: 'prospect_build',
    dynasty_long_term: 'prospect_build',
    neutral: 'neutral',
  }
  return m[s] ?? 'neutral'
}

function waiverTimeHorizon(h: WarRoomCommandCenterInput['timeHorizon']): 'this_week' | 'two_weeks' | 'month' | 'ros' | 'dynasty' {
  switch (h) {
    case 'today':
    case 'this_week':
      return 'this_week'
    case 'next_2_weeks':
      return 'two_weeks'
    case 'next_month':
      return 'month'
    case 'rest_of_season':
    case 'playoff_window':
      return 'ros'
    case 'dynasty_long':
      return 'dynasty'
    default:
      return 'this_week'
  }
}

function startSitMode(s: WarRoomCommandCenterInput['strategyMode']): StartSitMode {
  switch (s) {
    case 'conservative':
      return 'safe'
    case 'aggressive':
    case 'win_now':
    case 'playoff_push':
      return 'upside'
    default:
      return 'balanced'
  }
}

function powerRankingMode(s: WarRoomCommandCenterInput['strategyMode']): RankingModeId {
  switch (s) {
    case 'rebuilder':
      return 'rebuild_index'
    case 'dynasty_long_term':
    case 'prospect_focus':
      return 'dynasty_power'
    case 'win_now':
    case 'playoff_push':
    case 'aggressive':
      return 'contender_index'
    default:
      return 'current_power'
  }
}

function powerTimeWindow(h: WarRoomCommandCenterInput['timeHorizon']): TimeWindowId {
  switch (h) {
    case 'today':
    case 'this_week':
      return 'this_week'
    case 'next_2_weeks':
      return 'last_2'
    case 'next_month':
      return 'last_4'
    case 'rest_of_season':
    case 'playoff_window':
      return 'season'
    case 'dynasty_long':
      return 'dynasty_long'
    default:
      return 'season'
  }
}

function trendTimeWindow(h: WarRoomCommandCenterInput['timeHorizon']): TrendTimeWindowId {
  switch (h) {
    case 'today':
      return '24h'
    case 'this_week':
      return '7d'
    case 'next_2_weeks':
      return '14d'
    case 'next_month':
      return '30d'
    case 'rest_of_season':
    case 'playoff_window':
      return 'season'
    case 'dynasty_long':
      return 'dynasty_long'
    default:
      return '7d'
  }
}

function trendContext(tc: WarRoomCommandCenterInput['teamContext']): ContextModeId {
  switch (tc) {
    case 'full_portfolio':
      return 'general'
    case 'league_wide':
      return 'league_wide'
    case 'opponent_view':
      return 'opponent_watch'
    default:
      return 'my_team'
  }
}

function waiverTeamContext(tc: WarRoomCommandCenterInput['teamContext']): 'my_team' | 'specific_team' | 'league_wide' | 'neutral' {
  switch (tc) {
    case 'league_wide':
      return 'league_wide'
    case 'specific_team':
      return 'specific_team'
    case 'full_portfolio':
      return 'neutral'
    default:
      return 'my_team'
  }
}

function mapInjuryTeamContext(
  tc: WarRoomCommandCenterInput['teamContext'],
  specificId: string | null,
  oppId: string | null,
): InjuryTeamContextId {
  switch (tc) {
    case 'my_team':
      return 'my_team'
    case 'specific_team':
      return specificId?.trim() ? 'specific_team' : 'my_team'
    case 'league_wide':
      return 'full_league'
    case 'opponent_view':
      return oppId?.trim() ? 'opponent_team' : 'league_wide_risk'
    case 'full_portfolio':
      return 'neutral'
    default:
      return 'my_team'
  }
}

function mapPowerTeamContext(tc: WarRoomCommandCenterInput['teamContext']): 'full_league' | 'my_team' | 'specific_team' {
  if (tc === 'league_wide') return 'full_league'
  if (tc === 'specific_team') return 'specific_team'
  return 'my_team'
}

function sportFilterForWaiver(
  inputSport: string,
  leagueSport: SupportedSport | null,
  portfolio: boolean,
): SupportedSport | 'ALL' {
  if (portfolio || inputSport === 'ALL') return 'ALL'
  if (leagueSport) return leagueSport
  const n = normalizeToSupportedSport(inputSport)
  return n ?? 'ALL'
}

function leagueScoringNoteFrom(
  waiver: WaiverIntelligenceResult | null,
  startSit: StartSitAnalyzeResult | null,
): string | null {
  const raw = waiver?.leagueSettingsSnapshot ?? startSit?.leagueSettingsSnapshot
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.scoring === 'string' && r.scoring.trim()) return r.scoring.trim()
  return null
}

function mapWarRoomStrategyToMatchupStrategy(mode: WarRoomCommandCenterInput['strategyMode']): MatchupStrategyModeId {
  switch (mode) {
    case 'conservative':
      return 'safe_floor'
    case 'aggressive':
    case 'win_now':
    case 'playoff_push':
      return 'high_upside'
    case 'rebuilder':
      return 'injury_protected'
    case 'streaming_focus':
      return 'streaming_focus'
    default:
      return 'balanced'
  }
}

function mapWarRoomTimeToMatchup(h: WarRoomCommandCenterInput['timeHorizon']): MatchupTimeHorizonId {
  switch (h) {
    case 'today':
    case 'this_week':
      return 'this_matchup'
    case 'next_2_weeks':
      return 'next_matchup'
    default:
      return 'this_matchup'
  }
}

function summarizeModulesForAi(m: WarRoomModuleSnapshot): string {
  try {
    return JSON.stringify(m).slice(0, 12000)
  } catch {
    return '{}'
  }
}

export async function runWarRoomCommandCenter(input: WarRoomCommandCenterInput): Promise<WarRoomCommandCenterOutput> {
  const dataGaps: string[] = []
  const computedAt = new Date().toISOString()
  const portfolio = input.teamContext === 'full_portfolio'
  const leagueId = input.leagueId?.trim() || null
  const hasLeague = Boolean(leagueId) && !portfolio

  if (hasLeague && leagueId) {
    const access = await assertLeagueMemberWithCode(leagueId, input.userId)
    if (!access.ok) {
      const code = access.code
      const msg = leagueToolAccessUserMessage(code)
      return { ok: false, error: msg, code, userMessage: msg }
    }
  }

  let leagueContextEngine: NormalizedLeagueContext | null = null
  if (hasLeague && leagueId) {
    const lce = await resolveNormalizedLeagueContext({ userId: input.userId, leagueId })
    if (lce.ok) leagueContextEngine = lce.context
  }

  let leagueName: string | null = null
  let leagueSport: SupportedSport | null = null
  if (leagueId) {
    const row = await prisma.league.findFirst({
      where: { id: leagueId },
      select: { name: true, sport: true },
    })
    leagueName = row?.name ?? null
    if (row?.sport && SUPPORTED_SPORTS.includes(String(row.sport) as SupportedSport)) {
      leagueSport = String(row.sport) as SupportedSport
    } else if (row?.sport) {
      leagueSport = normalizeToSupportedSport(String(row.sport))
    }
  }

  const sportLabel =
    input.sportFilter === 'ALL'
      ? 'All sports'
      : SUPPORTED_SPORTS.includes(input.sportFilter as SupportedSport)
        ? String(input.sportFilter)
        : leagueSport ?? 'Mixed'

  let startSit: StartSitAnalyzeResult | null = null
  let waiver: WaiverIntelligenceResult | null = null
  let injury: InjuryImpactDashboardResult | null = null
  let trending: TrendingDashboardResult | null = null
  let power: PowerRankingsDashboardResult | null = null
  let matchupPrep: MatchupPrepDashboardResult | null = null
  let todayLineup: LineupActionSummaryPayload | null = null

  const wf = sportFilterForWaiver(input.sportFilter, leagueSport, portfolio)
  const specId = input.specificTeamExternalId?.trim() || null
  const oppId = input.opponentTeamExternalId?.trim() || null

  const injuryTeamContext = mapInjuryTeamContext(input.teamContext, specId, oppId)

  const [rs, rw, ri, rt, rp, rmp, rtl] = await Promise.allSettled([
    hasLeague && input.toggles.includeStartSitRecommendations
      ? runStartSitAnalysis({
          userId: input.userId,
          sportFilter: 'ALL',
          leagueId,
          week: 'current',
          mode: startSitMode(input.strategyMode),
          teamExternalId: input.teamContext === 'specific_team' ? specId : null,
        })
      : Promise.resolve(null),
    input.toggles.includeWaiverSuggestions
      ? runWaiverIntelligenceAnalysis({
          userId: input.userId,
          sportFilter: wf,
          leagueId: portfolio ? null : leagueId,
          position: 'ALL',
          rookiesOnly: input.toggles.includeRookieProspectIntel,
          strategy: waiverStrategy(input.strategyMode),
          teamContext: waiverTeamContext(input.teamContext),
          timeHorizon: waiverTimeHorizon(input.timeHorizon),
        })
      : Promise.resolve(null),
    hasLeague && input.toggles.includeInjuries
      ? runInjuryImpactDashboard({
          userId: input.userId,
          sportFilter: (leagueSport ? String(leagueSport).toUpperCase() : 'ALL') as 'ALL' | string,
          leagueId,
          teamContext: injuryTeamContext,
          specificTeamExternalId: specId,
          opponentTeamExternalId: oppId,
          statusFilter: 'all',
          timeHorizon: 'this_week',
          toggles: {
            includePractice: true,
            includeNews: input.toggles.includeNews,
            includeReturnTimelines: true,
            includeHandcuffs: true,
            includePlayoffImpact: input.toggles.includePlayoffImpact,
            includeDynastyImpact: input.toggles.includeDynastyWeighting,
          },
          skipAi: true,
        })
      : Promise.resolve(null),
    input.toggles.includeTrendingPlayers
      ? runTrendingDashboard({
          userId: input.userId,
          sportFilter: wf as 'ALL' | SupportedSport,
          leagueId: portfolio ? null : leagueId,
          trendType: 'all',
          position: 'ALL',
          rookiesOnly: input.toggles.includeRookieProspectIntel,
          timeWindow: trendTimeWindow(input.timeHorizon),
          contextMode: trendContext(input.teamContext),
          limitPerSide: 8,
          skipAi: true,
        })
      : Promise.resolve(null),
    hasLeague && input.toggles.includePowerRankings
      ? runPowerRankingsDashboard({
          userId: input.userId,
          sportFilter: leagueSport ? String(leagueSport).toUpperCase() : 'ALL',
          leagueId,
          rankingMode: powerRankingMode(input.strategyMode),
          timeWindow: powerTimeWindow(input.timeHorizon),
          teamContext: mapPowerTeamContext(input.teamContext),
          specificTeamExternalId: specId,
          week: null,
          toggles: {
            includeProjections: true,
            includeScheduleStrength: true,
            includeInjuries: input.toggles.includeInjuries,
            includeTransactionMomentum: true,
            includeRookies: input.toggles.includeRookieProspectIntel,
            includePlayoffHistory: input.toggles.includePlayoffImpact,
            includeRecentForm: true,
            includeDynastyWeighting: input.toggles.includeDynastyWeighting,
          },
          skipAi: true,
        })
      : Promise.resolve(null),
    hasLeague && leagueId && input.toggles.includeMatchupPrep
      ? runMatchupPrepDashboard({
          userId: input.userId,
          sportFilter: leagueSport ? String(leagueSport).toUpperCase() : 'ALL',
          leagueId,
          teamFocus: 'my_team',
          teamExternalId: specId,
          opponentExternalId: oppId,
          timeHorizon: mapWarRoomTimeToMatchup(input.timeHorizon),
          strategyMode: mapWarRoomStrategyToMatchupStrategy(input.strategyMode),
          toggles: {
            includeLiveNews: input.toggles.includeNews,
            includeInjuries: input.toggles.includeInjuries,
            includeScheduleAdjustments: true,
            includeWeather: true,
            includeStreamingRecommendations: true,
            includeOpponentTrendAnalysis: true,
            includePlayoffContext: input.toggles.includePlayoffImpact,
            includeRookieProspectContext: input.toggles.includeRookieProspectIntel,
          },
          skipAi: true,
        })
      : Promise.resolve(null),
    input.toggles.includeTodayActions
      ? input.precomputedTodayLineup != null
        ? Promise.resolve(input.precomputedTodayLineup)
        : (async () => {
            const s = await computeLineupActionsForUser(input.userId)
            return attachChimmyAdviceToLineupSummary(s, input.userId)
          })()
      : Promise.resolve(null),
  ])

  if (rs.status === 'fulfilled' && rs.value && isStartSitOk(rs.value)) {
    startSit = rs.value
  } else if (rs.status === 'rejected') {
    dataGaps.push('Start/Sit module failed to load.')
  } else if (rs.status === 'fulfilled' && rs.value && !isStartSitOk(rs.value)) {
    dataGaps.push(`Start/Sit: ${(rs.value as { error?: string }).error ?? 'unavailable'}`)
  }

  if (rw.status === 'fulfilled' && rw.value && 'ok' in rw.value && rw.value.ok) {
    waiver = rw.value
  } else if (rw.status === 'rejected') {
    dataGaps.push('Waiver intelligence failed to load.')
  } else if (rw.status === 'fulfilled' && rw.value && 'ok' in rw.value && !rw.value.ok) {
    dataGaps.push(`Waiver: ${(rw.value as { error?: string }).error ?? 'unavailable'}`)
  }

  if (ri.status === 'fulfilled' && ri.value && 'ok' in ri.value && ri.value.ok) {
    injury = ri.value
  } else if (ri.status === 'rejected') {
    dataGaps.push('Injury module failed to load.')
  } else if (ri.status === 'fulfilled' && ri.value && 'ok' in ri.value && !ri.value.ok) {
    dataGaps.push(`Injury: ${(ri.value as { error?: string }).error ?? 'unavailable'}`)
  }

  if (rt.status === 'fulfilled' && rt.value && 'ok' in rt.value && rt.value.ok) {
    trending = rt.value
  } else if (rt.status === 'rejected') {
    dataGaps.push('Trending module failed to load.')
  } else if (rt.status === 'fulfilled' && rt.value && 'ok' in rt.value && !rt.value.ok) {
    dataGaps.push(`Trending: ${(rt.value as { error?: string }).error ?? 'unavailable'}`)
  }

  if (rp.status === 'fulfilled' && rp.value && 'ok' in rp.value && rp.value.ok) {
    power = rp.value
  } else if (rp.status === 'rejected') {
    dataGaps.push('Power rankings failed to load.')
  } else if (rp.status === 'fulfilled' && rp.value && 'ok' in rp.value && !rp.value.ok) {
    dataGaps.push(`Power: ${(rp.value as { error?: string }).error ?? 'unavailable'}`)
  }

  if (rmp.status === 'fulfilled' && rmp.value && typeof rmp.value === 'object' && 'ok' in rmp.value && (rmp.value as { ok: boolean }).ok) {
    matchupPrep = rmp.value as MatchupPrepDashboardResult
  } else if (rmp.status === 'rejected') {
    dataGaps.push('Matchup Prep failed to load.')
  } else if (rmp.status === 'fulfilled' && rmp.value && typeof rmp.value === 'object' && 'ok' in rmp.value && !(rmp.value as { ok: boolean }).ok) {
    dataGaps.push(`Matchup Prep: ${(rmp.value as { error?: string }).error ?? 'unavailable'}`)
  }

  if (rtl.status === 'fulfilled' && rtl.value) {
    todayLineup = rtl.value as LineupActionSummaryPayload
  } else if (rtl.status === 'rejected') {
    dataGaps.push('Today Actions / lineup scan failed to load.')
  }

  let tradeValueModule: Record<string, unknown> | null = null
  let tradeContextOk = false
  let tradeSkipReason: string | null = null
  if (!input.toggles.includeTradeSuggestions) {
    tradeSkipReason = 'toggle off'
  } else if (!hasLeague || !leagueId) {
    tradeSkipReason = 'league required'
  } else {
    const tv = await loadTradeValueWarRoomContext({ userId: input.userId, leagueId })
    if (tv.ok) {
      tradeValueModule = { ...tv } as unknown as Record<string, unknown>
      tradeContextOk = true
    } else {
      dataGaps.push(`Trade Value: ${tv.userMessage}`)
      tradeSkipReason = tv.userMessage
    }
  }

  const leagueScoringDigest = leagueScoringDigestFromLce(leagueContextEngine)
  const leagueNote = leagueScoringDigest ?? leagueScoringNoteFrom(waiver, startSit)

  const { payload: aiTimePayload, summaryLine: timeSummary } = await buildWarRoomAiTimeContext({
    userId: input.userId,
    sportHint: leagueSport,
    injuryUpdatedAt: injury?.computedAt ?? null,
    matchupLockAt: matchupPrep?.timeContext?.matchupLockAt ?? null,
  })

  const ingestionHealth = buildWarRoomIngestionHealth({
    toggles: input.toggles,
    hasLeague,
    rs,
    rw,
    ri,
    rt,
    rp,
    rmp,
    rtl,
    tradeOk: tradeContextOk,
    tradeSkippedReason: tradeContextOk ? null : tradeSkipReason,
  })
  const aggregatedSourceFlags = aggregateSourceFlags(ingestionHealth)

  const { actions, conflicts, meta: orchestrationMeta } = orchestrateWarRoomBrain({
    toggles: input.toggles,
    strategyMode: input.strategyMode,
    startSit,
    waiver,
    injury,
    trending,
    power,
    matchupPrep,
    todayLineup,
    tradeValue: tradeValueModule,
    leagueScoringNote: leagueNote,
    serverTimeIso: computedAt,
    analysisMode: portfolio ? 'portfolio' : 'league',
    timeSummary,
    leagueScoringDigest,
    ingestionHealth,
    aggregatedSourceFlags,
  })

  const degraded =
    Boolean(injury?.degraded) ||
    Boolean(trending?.degraded) ||
    Boolean(matchupPrep?.degraded) ||
    dataGaps.length > 0 ||
    (hasLeague && power?.analysisScope === 'none')

  const myPower = power?.teams?.find((t) => t.isCurrentUser)
  const overviewTeam = startSit?.teamContext?.teamName ?? myPower?.teamName ?? null
  const overviewRecord = startSit?.teamContext?.record ?? null
  const standingRank = startSit?.teamContext?.rank ?? myPower?.rank ?? null

  const modules: WarRoomModuleSnapshot = {
    startSit: startSit ? (JSON.parse(JSON.stringify(startSit)) as Record<string, unknown>) : null,
    waiver: waiver ? (JSON.parse(JSON.stringify(waiver)) as Record<string, unknown>) : null,
    injury: injury ? (JSON.parse(JSON.stringify(injury)) as Record<string, unknown>) : null,
    trending: trending ? (JSON.parse(JSON.stringify(trending)) as Record<string, unknown>) : null,
    power: power ? (JSON.parse(JSON.stringify(power)) as Record<string, unknown>) : null,
    matchupPrep: matchupPrep ? (JSON.parse(JSON.stringify(matchupPrep)) as Record<string, unknown>) : null,
    todayActions: todayLineup ? (JSON.parse(JSON.stringify(todayLineup)) as Record<string, unknown>) : null,
    tradeValue: tradeValueModule,
  }

  const commandPriority =
    actions.length > 0 ? Math.round(actions.reduce((s, a) => s + a.urgency, 0) / actions.length) : 40

  const topActions = actions.slice(0, 3).map((a) => a.title)

  let aiSummary: string | null = null
  let aiStatus: 'ok' | 'skipped' | 'failed' = 'skipped'
  let aiFailureDetail: string | null = null
  if (!input.skipAi) {
    const ai = await openaiChatText({
      messages: [
        {
          role: 'system',
          content:
            'You are Chimmy, AllFantasy’s calm strategist. Respond with 4–6 short sentences. Use ONLY facts present in the JSON payload. If data is missing or modules are null, say what is missing. Never invent players, injuries, trades, or scores. No hype.',
        },
        {
          role: 'user',
          content: `War Room orchestration payload (structured):\n${summarizeModulesForAi(modules)}\nTime context (authoritative): ${JSON.stringify(aiTimePayload).slice(0, 4000)}\nOrchestration meta: ${JSON.stringify(orchestrationMeta).slice(0, 6000)}\nData gaps noted: ${dataGaps.join('; ') || 'none'}\nPrioritized action titles: ${topActions.join(' | ') || 'none'}`,
        },
      ],
      temperature: 0.35,
      maxTokens: 500,
      skipCache: true,
    })
    if (ai.ok) {
      aiSummary = ai.text
      aiStatus = 'ok'
    } else {
      aiStatus = 'failed'
      aiFailureDetail = (ai as { error?: string }).error ?? 'provider error'
      dataGaps.push(`AI summary unavailable: ${aiFailureDetail}.`)
    }
  }
  // Surface AI status alongside module health so UI can distinguish skipped vs failed.
  orchestrationMeta.ingestionHealth.push({
    module: 'ai_summary',
    status: aiStatus,
    detail: aiStatus === 'skipped' ? 'skipAi=true' : aiStatus === 'failed' ? aiFailureDetail ?? 'unknown' : undefined,
  })

  const nextMatchupNote =
    startSit?.opponent?.name != null
      ? `Next / current matchup context: vs ${startSit.opponent.name}`
      : startSit?.opponent?.notes?.[0] ?? null

  const aiEnvelope = await buildAiToolPayload({
    userId: input.userId,
    tool: 'war_room_command_center',
    mode: hasLeague ? 'league' : 'global',
    league:
      hasLeague && leagueId
        ? {
            leagueId,
            leagueName,
            sport: leagueSport ? String(leagueSport) : String(sportLabel),
          }
        : null,
    data: {},
    enrichTimeFromLeagueId: hasLeague && leagueId ? leagueId : null,
    includeStrategicCoaching: hasLeague,
  })

  const chimmyPayload = attachIntelligenceToChimmyPayload(
    {
      tool: 'war_room_command_center',
      leagueContextEngine,
      analysisScope: hasLeague ? 'league' : 'general',
      leagueId,
      leagueName,
      sportLabel,
      teamContext: input.teamContext,
      strategyMode: input.strategyMode,
      timeHorizon: input.timeHorizon,
      toggles: input.toggles,
      timeEngine: aiTimePayload,
      actions: actions.slice(0, 8).map((a) => ({
        title: a.title,
        source: a.source,
        urgency: a.urgency,
        confidence: a.confidence,
        confidenceNote: a.confidenceNote,
        sourceTools: a.sourceTools,
        expectedPayoff: a.expectedPayoff,
        biggestRisk: a.biggestRisk,
        reasoning: a.reasoning,
      })),
      conflicts,
      orchestration: orchestrationMeta,
      dataGaps,
      degraded,
      computedAt,
    },
    aiEnvelope,
    { leagueMode: hasLeague, orchestration: 'war_room_command_center' }
  )

  return {
    ok: true,
    analysisScope: hasLeague ? 'league' : 'general',
    leagueName,
    sportLabel,
    teamContextLabel: input.teamContext.replace(/_/g, ' '),
    strategyMode: input.strategyMode,
    timeHorizon: input.timeHorizon,
    overview: {
      teamName: overviewTeam,
      record: overviewRecord,
      standingRank,
      powerScore: myPower?.powerScore ?? null,
      momentumLabel: myPower?.momentumLabel ?? null,
      injuryRisk: injury?.overallRisk ?? null,
      commandPriority,
      nextMatchupNote,
      topActions,
      dataFreshness: computedAt,
      degraded,
      biggestRisk: actions.find((x) => x.biggestRisk)?.biggestRisk ?? null,
      biggestOpportunity: actions.find((x) => x.biggestOpportunity)?.biggestOpportunity ?? null,
      analysisMode: portfolio ? 'portfolio' : 'league',
      analysisModeLabel: portfolio
        ? 'Portfolio / global'
        : hasLeague
          ? 'League orchestration'
          : 'General',
    },
    scores: {
      commandPriority,
      teamRisk: injury?.overallRisk ?? null,
      waiverOpportunity: waiver?.picks?.[0] ? clamp(waiver.picks[0].waiverScore, 0, 100) : null,
      contenderSignal: myPower?.powerScore ?? null,
      trendSignal: trending?.summary?.biggestGainer ? clamp(trending.summary.biggestGainer.trendScore, 0, 100) : null,
    },
    actions,
    conflicts,
    modules,
    orchestration: orchestrationMeta,
    // Cap at 24 entries so a cascade of module failures can't balloon the payload or AI prompt.
    dataGaps: dataGaps.length > 24 ? [...dataGaps.slice(0, 24), `…and ${dataGaps.length - 24} more gaps truncated.`] : dataGaps,
    aiSummary,
    chimmyPayload,
    computedAt,
  }
}
