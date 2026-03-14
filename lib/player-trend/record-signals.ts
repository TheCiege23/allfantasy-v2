/**
 * Convenience entry points for recording trend signals from waiver, draft, trade, lineup.
 * Use these from integration points so signal types stay consistent.
 */
import { recordTrendSignal } from './PlayerTrendUpdater'

export type SportString = string

/**
 * Record a waiver add (player was added via waiver/FA).
 */
export function recordWaiverAdd(
  playerId: string,
  sport: SportString,
  leagueId?: string
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'waiver_add', { leagueId })
}

/**
 * Record a waiver drop (player was dropped).
 */
export function recordWaiverDrop(
  playerId: string,
  sport: SportString,
  leagueId?: string
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'waiver_drop', { leagueId })
}

/**
 * Record trade interest (player was requested/received in a trade).
 */
export function recordTradeRequest(
  playerId: string,
  sport: SportString,
  leagueId?: string
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'trade_request', { leagueId })
}

/**
 * Record draft pick (player was drafted in a league or mock draft).
 */
export function recordDraftPick(
  playerId: string,
  sport: SportString,
  leagueId?: string
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'draft_pick', { leagueId })
}

/**
 * Record lineup start (player was started in a lineup).
 */
export function recordLineupStart(
  playerId: string,
  sport: SportString,
  leagueId?: string
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'lineup_start', { leagueId })
}

/**
 * Record AI recommendation (player was recommended by AI for add/draft/trade).
 */
export function recordAiRecommendation(
  playerId: string,
  sport: SportString,
  value?: number
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'ai_recommendation', { value })
}

/**
 * Record injury impact (negative signal).
 */
export function recordInjuryImpact(
  playerId: string,
  sport: SportString,
  value?: number
): Promise<void> {
  return recordTrendSignal(playerId, sport, 'injury', { value: value ?? 1 })
}
