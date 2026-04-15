/**
 * ChimmyProductServiceRunner — internal dispatcher that routes surface-level
 * service calls into the chimmy-ai-modules registry.
 *
 * Every call goes through the module registry. The runner builds a stub
 * deterministic result when a module is not yet registered, so surfaces
 * always get a typed response even during gradual rollout.
 */

import type { AIContextEnvelope } from '@/lib/unified-ai/types'

export type ChimmySurface =
  | 'dashboard'
  | 'league_home'
  | 'draft'
  | 'roster'
  | 'matchup'
  | 'waiver'
  | 'trade'
  | 'player'
  | 'team'
  | 'commissioner'
  | 'admin'
  | 'discovery'
  | 'chat'

/** Map surface name → feature type used in the module registry. */
const SURFACE_FEATURE_MAP: Record<ChimmySurface, string> = {
  dashboard:   'dashboard_insights',
  league_home: 'league_home_insights',
  draft:       'draft_recommendations',
  roster:      'roster_insights',
  matchup:     'matchup_insights',
  waiver:      'waiver_insights',
  trade:       'trade_analysis',
  player:      'player_analysis',
  team:        'team_direction',
  commissioner:'commissioner_insights',
  admin:       'admin_insights',
  discovery:   'discovery_insights',
  chat:        'chat_context',
}

/**
 * Runs a chimmy product service for a given surface.
 * Delegates to moduleRegistry if available, otherwise returns an empty stub.
 */
export async function runChimmyProductService<T>(
  surface: ChimmySurface,
  envelope: AIContextEnvelope
): Promise<T> {
  try {
    const { moduleRegistry } = await import('@/lib/chimmy-ai-modules')
    const featureType = SURFACE_FEATURE_MAP[surface] ?? surface
    const module = moduleRegistry.getModule(featureType)

    if (module) {
      const result = await (module as any).execute?.({
        envelope,
        deterministic: buildDeterministicStub(envelope),
      })
      return ((result?.output ?? result?.recommendation) ?? buildEmptyStub(surface)) as T
    }

    return buildEmptyStub(surface) as T
  } catch {
    return buildEmptyStub(surface) as T
  }
}

function buildDeterministicStub(envelope: AIContextEnvelope): any {
  return {
    timestamp: new Date(),
    sport: envelope.sport ?? 'NFL',
    leagueId: envelope.leagueId ?? '',
    season: new Date().getFullYear(),
    week: 1,
    fantasyPoints: {},
    projections: {},
    matchupOdds: [],
    rosterStrengths: {},
    positionalScarcity: {},
    scheduleDifficulties: {},
    playoffOdds: {},
    categoryAnalysis: null,
    tradeEquities: new Map(),
    waiverAssets: {},
    completeness: {
      fantasyPoints: 0,
      projections: 0,
      matchupOdds: 0,
      rosterStrengths: 0,
      positionalScarcity: 0,
      scheduleDifficulty: 0,
      playoffOdds: 0,
      tradeEquities: 0,
      waiverAssets: 0,
    },
    missingData: ['stubbed_for_product_service_runner'],
  }
}

/** Returns a safe empty struct so surfaces don't crash when modules are absent. */
function buildEmptyStub(surface: ChimmySurface): Record<string, unknown> {
  switch (surface) {
    case 'dashboard':
      return { insights: [], recommendations: [] }
    case 'league_home':
      return { insights: [], alerts: [], story: null }
    case 'draft':
      return { topPicks: [], insights: [] }
    case 'roster':
      return { insights: [], recommendations: [] }
    case 'matchup':
      return { swingPlayers: [], insights: [] }
    case 'waiver':
      return { topAdds: [], insights: [] }
    case 'trade':
      return { fairnessLabel: 'Analyzing…', fairnessSummary: '', riskLevel: 'medium', sideAValue: '', sideBValue: '', insights: [] }
    case 'player':
      return { verdict: 'hold', verdictRationale: '', confidencePct: 50, riskLevel: 'medium', insights: [] }
    case 'team':
      return { direction: 'undecided', directionRationale: '', insights: [], recommendations: [] }
    case 'commissioner':
      return { alerts: [], banners: [] }
    case 'admin':
      return { anomalies: [], banners: [] }
    default:
      return {}
  }
}
