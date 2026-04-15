import type { RequestContext } from './permissions'

export interface LeagueService {
  createLeague(ctx: RequestContext, input: Record<string, unknown>): Promise<Record<string, unknown>>
  updateLeagueState(ctx: RequestContext, leagueId: string, phase: string): Promise<void>
}

export interface SettingsService {
  getSettings(ctx: RequestContext, leagueId: string): Promise<Record<string, unknown>>
  updateSettings(ctx: RequestContext, leagueId: string, domain: string, payload: Record<string, unknown>, reason?: string): Promise<void>
}

export interface RosterService {
  getRoster(ctx: RequestContext, leagueId: string, teamId: string): Promise<Record<string, unknown>>
  submitLineup(ctx: RequestContext, leagueId: string, teamId: string, weekOrPeriod: number, lineup: Record<string, unknown>): Promise<void>
}

export interface DraftService {
  startDraft(ctx: RequestContext, leagueId: string): Promise<void>
  makePick(ctx: RequestContext, draftId: string, payload: Record<string, unknown>): Promise<void>
}

export interface TradeService {
  proposeTrade(ctx: RequestContext, leagueId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>
  resolveTrade(ctx: RequestContext, tradeId: string, action: 'accept' | 'reject' | 'counter' | 'veto'): Promise<void>
}

export interface WaiverService {
  submitClaim(ctx: RequestContext, leagueId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>
  processRun(leagueId: string): Promise<void>
}

export interface ScoringService {
  recalculateLeagueScores(leagueId: string, weekOrPeriod: number): Promise<void>
  finalizeMatchup(leagueId: string, matchupId: string): Promise<void>
}

export interface AIService {
  runTask(ctx: RequestContext, payload: Record<string, unknown>): Promise<Record<string, unknown>>
  saveRecommendation(ctx: RequestContext, payload: Record<string, unknown>): Promise<void>
}

export interface PaymentService {
  recordProviderWebhook(provider: string, payload: Record<string, unknown>): Promise<void>
  requestPayout(ctx: RequestContext, leagueId: string, payload: Record<string, unknown>): Promise<void>
}
