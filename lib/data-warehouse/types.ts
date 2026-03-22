/**
 * Fantasy Data Warehouse — shared types and sport constants.
 * Supports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.
 */
import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  isSupportedSport,
  normalizeToSupportedSport,
  type SupportedSport,
} from '@/lib/sport-scope'

export const WAREHOUSE_SPORTS: readonly SupportedSport[] = [...SUPPORTED_SPORTS]

export type WarehouseSport = SupportedSport

export function isWarehouseSport(s: string): s is WarehouseSport {
  return isSupportedSport(s)
}

export function normalizeSportForWarehouse(sport: string): WarehouseSport {
  const u = sport?.toUpperCase?.() || DEFAULT_SPORT
  if (isWarehouseSport(u)) return normalizeToSupportedSport(u)
  const map: Record<string, WarehouseSport> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAAB',
    NCAA_BASKETBALL: 'NCAAB',
    NCAAF: 'NCAAF',
    NCAA_FOOTBALL: 'NCAAF',
    SOCCER: 'SOCCER',
  }
  return normalizeToSupportedSport(map[u] ?? u)
}

export interface PlayerGameFactInput {
  playerId: string
  sport: string
  gameId: string
  teamId?: string
  opponentTeamId?: string
  statPayload: Record<string, unknown>
  normalizedStats: Record<string, unknown>
  fantasyPoints: number
  scoringPeriod: number
  season?: number
  weekOrRound?: number
}

export interface TeamGameFactInput {
  teamId: string
  sport: string
  gameId: string
  pointsScored: number
  opponentPoints: number
  result?: string
  season?: number
  weekOrRound?: number
}

export interface RosterSnapshotInput {
  leagueId: string
  teamId: string
  sport: string
  weekOrPeriod: number
  season?: number
  rosterPlayers: unknown[]
  lineupPlayers: unknown[]
  benchPlayers: unknown[]
}

export interface MatchupFactInput {
  leagueId: string
  sport: string
  weekOrPeriod: number
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  winnerTeamId?: string
  season?: number
}

export interface DraftFactInput {
  leagueId: string
  sport: string
  round: number
  pickNumber: number
  playerId: string
  managerId?: string
  season?: number
}

export interface TransactionFactInput {
  leagueId: string
  sport: string
  type: string
  playerId?: string
  managerId?: string
  rosterId?: string
  payload?: Record<string, unknown>
  season?: number
  weekOrPeriod?: number
}

export interface SeasonStandingFactInput {
  leagueId: string
  sport: string
  season: number
  teamId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  rank?: number
}

export type TransactionType = 'add' | 'drop' | 'trade' | 'waiver_add' | 'waiver_drop' | 'free_agent'
