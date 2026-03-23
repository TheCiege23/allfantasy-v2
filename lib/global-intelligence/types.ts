/**
 * Global Intelligence Engine — unified types for Meta, Simulation, Advisor, Media, Draft.
 */

export type IntelligenceModule = 'meta' | 'simulation' | 'advisor' | 'media' | 'draft'

export interface GlobalIntelligenceInput {
  leagueId: string
  userId?: string | null
  sport?: string | null
  season?: number
  week?: number
  /** Which modules to include; default all. */
  include?: IntelligenceModule[]
}

export interface GlobalIntelligenceResult {
  leagueId: string
  sport: string | null
  meta: MetaIntelligence | null
  simulation: SimulationIntelligence | null
  advisor: AdvisorIntelligence | null
  media: MediaIntelligence | null
  draft: DraftIntelligence | null
  generatedAt: string
}

export interface MetaIntelligence {
  summary: string | null
  topTrends?: string[]
  error?: string
}

export interface SimulationIntelligence {
  playoffOddsSummary: string | null
  matchupSummary: string | null
  dynastySummary: string | null
  warehouseSummary: string | null
  error?: string
}

export interface AdvisorIntelligence {
  lineup: Array<{ summary: string; priority: string }>
  trade: Array<{ summary: string; priority: string }>
  waiver: Array<{ summary: string; priority: string }>
  injury: Array<{ summary: string; priority: string; playerName?: string }>
  error?: string
}

export interface MediaIntelligence {
  articles: Array<{ id: string; headline: string; tags?: string[]; createdAt?: string }>
  error?: string
}

export interface DraftIntelligence {
  context: string | null
  error?: string
}
