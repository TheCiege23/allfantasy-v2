/**
 * Dynasty Engine — shared types. Sport-aware across NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */
import { DEFAULT_SPORT } from '@/lib/sport-scope'

export const DYNASTY_SPORTS = [
  'NFL',
  'NHL',
  'NBA',
  'MLB',
  'NCAAB',
  'NCAAF',
  'SOCCER',
] as const

export type DynastySport = (typeof DYNASTY_SPORTS)[number]

export function normalizeSportForDynasty(sport: string): DynastySport {
  const u = sport?.toUpperCase?.() || DEFAULT_SPORT
  if (DYNASTY_SPORTS.includes(u as DynastySport)) return u as DynastySport
  const map: Record<string, DynastySport> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAAB',
    NCAAF: 'NCAAF',
    SOCCER: 'SOCCER',
  }
  return map[u] ?? (DEFAULT_SPORT as DynastySport)
}

export interface DynastyProjectionOutput {
  projectionId: string
  teamId: string
  leagueId: string
  sport: string
  championshipWindowScore: number
  rebuildProbability: number
  rosterStrength3Year: number
  rosterStrength5Year: number
  agingRiskScore: number
  futureAssetScore: number
  season?: number
  createdAt: string
}
