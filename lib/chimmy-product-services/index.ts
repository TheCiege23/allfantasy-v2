/**
 * chimmy-product-services — backend service contracts for each AI surface.
 *
 * These functions build AIContextEnvelopes and route them through the
 * ChimmyOrchestrator / module registry. All callers must use these functions;
 * routes and UI-backed server code must NOT call third-party sports APIs directly.
 *
 * Pattern: each function takes structured inputs, builds an AIContextEnvelope,
 * and delegates to the appropriate chimmy-ai-module.
 */

import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import { runChimmyProductService } from './ChimmyProductServiceRunner'

// ─── Shared helper ────────────────────────────────────────────────────────────

function baseEnvelope(
  featureType: string,
  sport: string,
  leagueId?: string | null,
  userId?: string | null
): AIContextEnvelope {
  return {
    featureType,
    sport: sport || 'NFL',
    leagueId: leagueId ?? null,
    userId: userId ?? null,
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardInsightsInput {
  userId: string
  sport?: string
  leagueIds?: string[]
}

export interface DashboardInsightsOutput {
  insights: Array<{ id: string; title: string; summary: string; tag?: string; severity?: 'info' | 'warning' | 'success' | 'critical'; confidencePct?: number }>
  recommendations: Array<{ id: string; action: string; rationale: string; priority?: 'high' | 'medium' | 'low'; actionType?: string; confidencePct?: number }>
}

export async function getDashboardInsights(input: DashboardInsightsInput): Promise<DashboardInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('dashboard_insights', input.sport ?? 'NFL', null, input.userId),
    promptIntent: 'summarize',
    uiSurface: 'inline',
    statisticsPayload: { leagueIds: input.leagueIds ?? [] },
  }
  // Route to module — the actual AI module is resolved at runtime via moduleRegistry
  return runChimmyProductService<DashboardInsightsOutput>('dashboard', envelope)
}

// ─── League Home ──────────────────────────────────────────────────────────────

export interface LeagueHomeInsightsInput {
  leagueId: string
  userId: string
  sport: string
  currentWeek?: number
}

export interface LeagueHomeInsightsOutput {
  insights: Array<{ id: string; title: string; summary: string; severity?: 'info' | 'warning' | 'success' | 'critical'; tag?: string }>
  story?: { period: string; headline: string; body: string; highlights?: Array<{ label: string; value: string }> }
  alerts: Array<{ id: string; message: string; severity?: 'info' | 'warning' }>
}

export async function getLeagueHomeInsights(input: LeagueHomeInsightsInput): Promise<LeagueHomeInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('league_home_insights', input.sport, input.leagueId, input.userId),
    promptIntent: 'summarize',
    uiSurface: 'inline',
    rankingsPayload: { currentWeek: input.currentWeek },
  }
  return runChimmyProductService<LeagueHomeInsightsOutput>('league_home', envelope)
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export interface DraftRecommendationsInput {
  draftId: string
  userId: string
  sport: string
  leagueId: string
  currentPick: number
  availablePlayers: Array<{ id: string; name: string; position: string; adp?: number }>
  rosterNeeds: string[]
}

export interface DraftRecommendationsOutput {
  topPicks: Array<{ playerId: string; playerName: string; rationale: string; confidence: number }>
  insights: Array<{ id: string; title: string; summary: string; tag?: string }>
}

export async function getDraftRecommendations(input: DraftRecommendationsInput): Promise<DraftRecommendationsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('draft_recommendations', input.sport, input.leagueId, input.userId),
    promptIntent: 'recommend',
    uiSurface: 'inline',
    rankingsPayload: { currentPick: input.currentPick, rosterNeeds: input.rosterNeeds },
    statisticsPayload: { availablePlayers: input.availablePlayers },
  }
  return runChimmyProductService<DraftRecommendationsOutput>('draft', envelope)
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export interface RosterInsightsInput {
  teamId: string
  leagueId: string
  userId: string
  sport: string
  rosterPlayerIds: string[]
}

export interface RosterInsightsOutput {
  insights: Array<{ id: string; title: string; summary: string; tag?: string; severity?: 'info' | 'warning' | 'success' | 'critical' }>
  recommendations: Array<{ id: string; action: string; rationale: string; priority?: 'high' | 'medium' | 'low' }>
}

export async function getRosterInsights(input: RosterInsightsInput): Promise<RosterInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('roster_insights', input.sport, input.leagueId, input.userId),
    promptIntent: 'recommend',
    uiSurface: 'inline',
    statisticsPayload: { rosterPlayerIds: input.rosterPlayerIds, teamId: input.teamId },
  }
  return runChimmyProductService<RosterInsightsOutput>('roster', envelope)
}

// ─── Matchup ──────────────────────────────────────────────────────────────────

export interface MatchupInsightsInput {
  matchupId: string
  teamId: string
  opponentTeamId: string
  leagueId: string
  userId: string
  sport: string
  week: number
}

export interface MatchupInsightsOutput {
  winProbability?: number
  swingPlayers: Array<{ name: string; impact: string }>
  insights: Array<{ id: string; title: string; summary: string; tag?: string }>
  weatherAlert?: string
}

export async function getMatchupInsights(input: MatchupInsightsInput): Promise<MatchupInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('matchup_insights', input.sport, input.leagueId, input.userId),
    promptIntent: 'explain',
    uiSurface: 'inline',
    simulationPayload: { matchupId: input.matchupId, teamId: input.teamId, opponentTeamId: input.opponentTeamId, week: input.week },
  }
  return runChimmyProductService<MatchupInsightsOutput>('matchup', envelope)
}

// ─── Waiver ───────────────────────────────────────────────────────────────────

export interface WaiverInsightsInput {
  leagueId: string
  teamId: string
  userId: string
  sport: string
  rosterNeeds: string[]
  availablePlayerIds: string[]
}

export interface WaiverInsightsOutput {
  topAdds: Array<{ id: string; playerName: string; position: string; addRationale: string; urgency: 'high' | 'medium' | 'low'; faabBid?: string; confidencePct?: number }>
  insights: Array<{ id: string; title: string; summary: string; tag?: string }>
}

export async function getWaiverInsights(input: WaiverInsightsInput): Promise<WaiverInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('waiver_insights', input.sport, input.leagueId, input.userId),
    promptIntent: 'recommend',
    uiSurface: 'inline',
    rankingsPayload: { rosterNeeds: input.rosterNeeds },
    statisticsPayload: { availablePlayerIds: input.availablePlayerIds, teamId: input.teamId },
  }
  return runChimmyProductService<WaiverInsightsOutput>('waiver', envelope)
}

// ─── Trade ────────────────────────────────────────────────────────────────────

export interface TradeAnalysisInput {
  leagueId: string
  userId: string
  sport: string
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
  tradeNote?: string
}

export interface TradeAnalysisOutput {
  fairnessLabel: string
  fairnessSummary: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  sideAValue: string
  sideBValue: string
  counterSuggestion?: string
  insights: Array<{ id: string; title: string; summary: string; tag?: string }>
}

export async function getTradeAnalysis(input: TradeAnalysisInput): Promise<TradeAnalysisOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('trade_analysis', input.sport, input.leagueId, input.userId),
    promptIntent: 'compare',
    uiSurface: 'modal',
    deterministicPayload: {
      teamAPlayerIds: input.teamAPlayerIds,
      teamBPlayerIds: input.teamBPlayerIds,
    },
    userMessage: input.tradeNote,
  }
  return runChimmyProductService<TradeAnalysisOutput>('trade', envelope)
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface PlayerAnalysisInput {
  playerId: string
  playerName: string
  sport: string
  leagueId?: string
  userId: string
}

export interface PlayerAnalysisOutput {
  verdict: 'hold' | 'buy' | 'sell' | 'start' | 'sit'
  verdictRationale: string
  confidencePct: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  insights: Array<{ id: string; title: string; summary: string; tag?: string }>
}

export async function getPlayerAnalysis(input: PlayerAnalysisInput): Promise<PlayerAnalysisOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('player_analysis', input.sport, input.leagueId, input.userId),
    promptIntent: 'recommend',
    uiSurface: 'inline',
    statisticsPayload: { playerId: input.playerId, playerName: input.playerName },
  }
  return runChimmyProductService<PlayerAnalysisOutput>('player', envelope)
}

// ─── Team Direction ───────────────────────────────────────────────────────────

export interface TeamDirectionInput {
  teamId: string
  leagueId: string
  userId: string
  sport: string
}

export interface TeamDirectionOutput {
  direction: 'contend' | 'rebuild' | 'reload' | 'undecided'
  directionRationale: string
  insights: Array<{ id: string; title: string; summary: string; tag?: string; severity?: 'info' | 'warning' | 'success' | 'critical' }>
  recommendations: Array<{ id: string; action: string; rationale: string; priority?: 'high' | 'medium' | 'low' }>
}

export async function getTeamDirection(input: TeamDirectionInput): Promise<TeamDirectionOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('team_direction', input.sport, input.leagueId, input.userId),
    promptIntent: 'recommend',
    uiSurface: 'inline',
    behaviorPayload: { teamId: input.teamId },
  }
  return runChimmyProductService<TeamDirectionOutput>('team', envelope)
}

// ─── Commissioner ─────────────────────────────────────────────────────────────

export interface CommissionerInsightsInput {
  leagueId: string
  userId: string
  sport: string
}

export interface CommissionerInsightsOutput {
  alerts: Array<{ id: string; title: string; body: string; area?: 'health' | 'activity' | 'trade' | 'parity' | 'general'; suggestedAction?: string }>
  banners: Array<{ id: string; message: string; severity?: 'warning' | 'info' }>
}

export async function getCommissionerInsights(input: CommissionerInsightsInput): Promise<CommissionerInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('commissioner_insights', input.sport, input.leagueId, input.userId),
    promptIntent: 'summarize',
    uiSurface: 'inline',
  }
  return runChimmyProductService<CommissionerInsightsOutput>('commissioner', envelope)
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminInsightsInput {
  userId: string
  scope?: 'platform' | 'leagues' | 'users'
}

export interface AdminInsightsOutput {
  anomalies: Array<{ id: string; title: string; summary: string; severity?: 'info' | 'warning' | 'critical' }>
  banners: Array<{ id: string; message: string; severity?: 'info' | 'warning' | 'error' }>
}

export async function getAdminInsights(input: AdminInsightsInput): Promise<AdminInsightsOutput> {
  const envelope: AIContextEnvelope = {
    ...baseEnvelope('admin_insights', 'NFL', null, input.userId),
    promptIntent: 'summarize',
    uiSurface: 'inline',
    statisticsPayload: { scope: input.scope ?? 'platform' },
  }
  return runChimmyProductService<AdminInsightsOutput>('admin', envelope)
}
