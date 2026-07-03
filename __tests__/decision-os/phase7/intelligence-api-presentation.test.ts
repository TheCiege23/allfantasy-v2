/**
 * Phase 7.2 — Intelligence API Presentation View Mode tests.
 *
 * Tests the `view=presentation` path in all three intelligence handlers.
 * Verifies: default raw contract unchanged, presentation mode returns IPM shapes,
 * invalid view rejected, tier permissions enforced before view path, meta contract,
 * no internal field leakage, no frontend-specific code in output.
 *
 * ADR: ADR_F7_2_PRESENTATION_VIEW_MODE.md
 */

import { vi, describe, it, expect, afterEach } from 'vitest'
import type { ManagerBehavioralIntelligence }  from '../../../lib/decision-os/behavioral/manager-intelligence'
import type { LeagueBehavioralIntelligence }   from '../../../lib/decision-os/behavioral/league-intelligence'
import type { PlatformBehavioralIntelligence } from '../../../lib/decision-os/behavioral/platform-intelligence'
import {
  platformIntelligenceHandler,
  leagueIntelligenceHandler,
  managerIntelligenceHandler,
  stubDataProvider,
} from '../../../lib/decision-os/behavioral/api/intelligence-handlers'
import type {
  IntelligenceDataProvider,
  IntelligenceApiContext,
  PresentationApiResponse,
  PresentationApiMeta,
} from '../../../lib/decision-os/behavioral/api/intelligence-handlers'
import type { IntelligenceApiError } from '../../../lib/decision-os/behavioral/api/contracts'
import type {
  LeagueApiPresentation,
  ManagerApiPresentation,
  PlatformApiPresentation,
} from '../../../lib/decision-os/presentation/types'
import { PRESENTATION_VERSION } from '../../../lib/decision-os/presentation/tokens'

// ── Constants ──────────────────────────────────────────────────────────────────

const TEST_KEY_BASIC        = 'afk_test_abcdefghijklmnop1'
const TEST_KEY_COMMISSIONER = 'afk_test_abcdefghijklmnop2'
const TEST_KEY_MANAGER      = 'afk_test_abcdefghijklmnop3'
const TEST_KEY_PLATFORM     = 'afk_test_abcdefghijklmnop4'

const TEST_KEYS_MAP = JSON.stringify({
  [TEST_KEY_COMMISSIONER]: 'commissioner',
  [TEST_KEY_MANAGER]:      'manager',
  [TEST_KEY_PLATFORM]:     'platform',
})

const NOW_ISO = '2026-07-01T00:00:00.000Z'

// ── Env helpers ────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllEnvs()
})

function enableApi() {
  vi.stubEnv('DECISION_OS_INTELLIGENCE_API_ENABLED', 'true')
  vi.stubEnv('INTELLIGENCE_API_TEST_KEYS', TEST_KEYS_MAP)
}

// ── Context builders ───────────────────────────────────────────────────────────

function makeCtx(
  apiKey?: string,
  searchParams: Record<string, string> = {},
): IntelligenceApiContext {
  const headers = new Map<string, string>()
  if (apiKey) headers.set('x-allfantasy-api-key', apiKey)
  return {
    headers:      { get: (k) => headers.get(k.toLowerCase()) ?? null },
    searchParams: new URLSearchParams(searchParams),
  }
}

// ── Fixture factories ──────────────────────────────────────────────────────────

function makeManagerIntel(
  overrides: Partial<ManagerBehavioralIntelligence> = {},
): ManagerBehavioralIntelligence {
  return {
    managerId: 'mgr-001', leagueId: 'lgr-001',
    participationTier: 'active', retentionRisk: 'low',
    retentionRiskReasons: ['Manager has set lineups consistently'],
    lineupEngagement: { score: 80, level: 'high',     eventCount: 8,  lastEventAt: NOW_ISO, warnings: [] },
    waiverEngagement: { score: 55, level: 'moderate', eventCount: 3,  lastEventAt: NOW_ISO, warnings: [] },
    tradeEngagement:  { score: 40, level: 'low',      eventCount: 1,  lastEventAt: null,    warnings: [] },
    draftEngagement:  { score: 75, level: 'high',     eventCount: 12, lastEventAt: NOW_ISO, warnings: [] },
    overallEngagementScore: 67,
    daysSinceLastActivity: 1, isInactive: false, inactivityWarning: null,
    nudges: [],
    completeness: 85, derivedFrom: 12, lookbackDays: 90,
    warnings: [], derivedAt: NOW_ISO,
    ...overrides,
  }
}

function makeLeagueIntel(
  overrides: Partial<LeagueBehavioralIntelligence> = {},
): LeagueBehavioralIntelligence {
  return {
    leagueId: 'lgr-001',
    leagueEngagementScore: 72, leagueEngagementTier: 'active',
    participationDistribution: { totalManagers: 10, activeManagers: 8, inactiveManagers: 2, activePercent: 80, inactivePercent: 20 },
    inactiveManagerCount: 2,
    tradeActivity:  { tier: 'moderate', count: 8,  perManagerRate: 0.8, warnings: [] },
    waiverActivity: { tier: 'high',     count: 25, perManagerRate: 2.5, warnings: [] },
    draftActivity:  { tier: 'high',     count: 90, perManagerRate: 9.0, warnings: [] },
    retentionRisk: 'low', retentionRiskReasons: [],
    commissionerWorkload: 'light', commissionerWorkloadItems: [],
    recommendations: [],
    healthNarrativeInputs: { engagementSummary: 'ok', topConcern: null, standoutSignal: null },
    completeness: 80, derivedFrom: 100, managerCount: 10, lookbackDays: 90,
    warnings: [], derivedAt: NOW_ISO,
    ...overrides,
  }
}

function makePlatformIntel(
  overrides: Partial<PlatformBehavioralIntelligence> = {},
): PlatformBehavioralIntelligence {
  return {
    platformEngagementScore: 65, platformEngagementTier: 'healthy',
    leagueHealthDistribution: { elite: 2, active: 5, moderate: 2, passive: 1, dormant: 0, totalLeagues: 10, healthyPercent: 70, atRiskPercent: 10 },
    retentionDistribution: {
      managersByCriticalRisk: 3, managersByHighRisk: 7, managersByMediumRisk: 15, managersByLowRisk: 75,
      totalManagers: 100, managerCriticalRiskPercent: 3, managerAtRiskPercent: 10,
      leaguesByCriticalRisk: 1, leaguesByHighRisk: 2, leaguesByMediumRisk: 3, leaguesByLowRisk: 4,
      totalLeagues: 10, leagueCriticalRiskPercent: 10, leagueAtRiskPercent: 30,
    },
    commissionerQualityDistribution: { light: 5, moderate: 3, heavy: 1, critical: 1, totalLeagues: 10, managedPercent: 80, overloadedPercent: 20 },
    tradeEcosystem:     { tier: 'moderate', totalEvents: 80,  activeLeagues: 7,  totalLeagues: 10, activeLeaguePercent: 70,  perLeagueRate: 8.0,  perManagerRate: 0.8, warnings: [] },
    waiverEcosystem:    { tier: 'high',     totalEvents: 250, activeLeagues: 10, totalLeagues: 10, activeLeaguePercent: 100, perLeagueRate: 25.0, perManagerRate: 2.5, warnings: [] },
    draftParticipation: { tier: 'high',     totalEvents: 900, activeLeagues: 10, totalLeagues: 10, activeLeaguePercent: 100, perLeagueRate: 90.0, perManagerRate: 9.0, warnings: [] },
    engagementTrends: { sevenDayEventCount: 40, thirtyDayEventCount: 150, recentActivityRatio: 0.27, recentlyActiveManagerPercent: 60, momentumSignal: 'steady', trendConfidence: 'medium', warnings: [] },
    activityHeatmap: { cells: [{ dayOfWeek: 1, hour: 20, count: 12 }], peakCellKey: '1-20', peakDayOfWeek: 1, peakHour: 20, peakCount: 12, totalEventsAnalyzed: 230, warnings: [] },
    interventionOpportunities: [],
    completeness: 75, uncertainty: 'medium',
    warnings: [], provenance: { leagueIntelligenceCount: 10, managerIntelligenceCount: 100, eventCount: 230, avgLeagueLookbackDays: 90, derivedAt: NOW_ISO },
    derivedAt: NOW_ISO,
    ...overrides,
  }
}

function makeProvider(overrides: Partial<IntelligenceDataProvider> = {}): IntelligenceDataProvider {
  return {
    getManagerIntelligence:  async () => makeManagerIntel(),
    getLeagueIntelligence:   async () => makeLeagueIntel(),
    getPlatformIntelligence: async () => makePlatformIntel(),
    getLeagueManagerIntelligences: async () => [makeManagerIntel()],
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default raw contract unchanged
// ─────────────────────────────────────────────────────────────────────────────

describe('default raw contract — no view param', () => {
  it('league: returns 200 with leagueEngagementScore (raw v1 shape)', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }),
      makeProvider(),
    )
    expect(r.status).toBe(200)
    const body = r.body as { data: { leagueEngagementScore: number }; meta: { version: string } }
    expect(body.data.leagueEngagementScore).toBe(72)
    expect(body.meta.version).toBe('v1')
  })

  it('league: meta does not have view or presentationVersion field (raw mode)', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }),
      makeProvider(),
    )
    const meta = (r.body as { meta: Record<string, unknown> }).meta
    expect(meta.view).toBeUndefined()
    expect(meta.presentationVersion).toBeUndefined()
  })

  it('manager: returns 200 with overallEngagementScore (raw v1 shape)', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001' }),
      makeProvider(),
    )
    expect(r.status).toBe(200)
    const body = r.body as { data: { overallEngagementScore: number } }
    expect(body.data.overallEngagementScore).toBe(67)
  })

  it('platform: returns 200 with platformEngagementScore (raw v1 shape)', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM),
      makeProvider(),
    )
    expect(r.status).toBe(200)
    const body = r.body as { data: { platformEngagementScore: number } }
    expect(body.data.platformEngagementScore).toBe(65)
  })
})

describe('view=raw — explicit raw mode equals default', () => {
  it('league view=raw returns same data shape as no-view-param', async () => {
    enableApi()
    const provider = makeProvider()
    const noView  = await leagueIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }),               provider)
    const rawView = await leagueIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'raw' }), provider)
    expect(rawView.status).toBe(200)
    // requestId is per-call unique — compare data only
    expect((rawView.body as { data: unknown }).data).toEqual((noView.body as { data: unknown }).data)
  })

  it('manager view=raw returns same data shape as no-view-param', async () => {
    enableApi()
    const provider = makeProvider()
    const noView  = await managerIntelligenceHandler(makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001' }),               provider)
    const rawView = await managerIntelligenceHandler(makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'raw' }), provider)
    expect(rawView.status).toBe(200)
    expect((rawView.body as { data: unknown }).data).toEqual((noView.body as { data: unknown }).data)
  })

  it('platform view=raw returns same data shape as no-view-param', async () => {
    enableApi()
    const provider = makeProvider()
    const noView  = await platformIntelligenceHandler(makeCtx(TEST_KEY_PLATFORM),               provider)
    const rawView = await platformIntelligenceHandler(makeCtx(TEST_KEY_PLATFORM, { view: 'raw' }), provider)
    expect(rawView.status).toBe(200)
    expect((rawView.body as { data: unknown }).data).toEqual((noView.body as { data: unknown }).data)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// view=presentation — IPM shapes returned
// ─────────────────────────────────────────────────────────────────────────────

describe('view=presentation — league', () => {
  it('returns 200', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(200)
  })

  it('data has entityId and entityType=league', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(data.entityId).toBe('lgr-001')
    expect(data.entityType).toBe('league')
  })

  it('data has healthScore from engagementScore', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(typeof data.healthScore).toBe('number')
    expect(data.healthScore).toBeGreaterThanOrEqual(0)
    expect(data.healthScore).toBeLessThanOrEqual(100)
  })

  it('data has healthSeverity with token and priority', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(data.healthSeverity).toBeDefined()
    expect(typeof data.healthSeverity.token).toBe('string')
    expect(typeof data.healthSeverity.priority).toBe('number')
  })

  it('data has retentionRisk field', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(typeof data.retentionRisk).toBe('string')
  })

  it('data has badges and metrics arrays', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(Array.isArray(data.badges)).toBe(true)
    expect(Array.isArray(data.metrics)).toBe(true)
  })

  it('data has topRecommendations array', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(Array.isArray(data.topRecommendations)).toBe(true)
  })

  it('data has version stamp equal to PRESENTATION_VERSION', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(data.version).toBe(PRESENTATION_VERSION)
  })

  it('data has completeness between 0 and 100', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(data.completeness).toBeGreaterThanOrEqual(0)
    expect(data.completeness).toBeLessThanOrEqual(100)
  })

  it('archetypeCard absent → archetype is unknown placeholder (not null crash)', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(typeof data.archetype).toBe('string')
    expect(typeof data.archetypeLabel).toBe('string')
  })

  it('benchmarkSummary is null when benchmark not available', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(data.benchmarkSummary).toBeNull()
  })

  it('meta has view=presentation', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { meta } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(meta.view).toBe('presentation')
  })

  it('meta has presentationVersion matching PRESENTATION_VERSION', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { meta } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(meta.presentationVersion).toBe(PRESENTATION_VERSION)
  })

  it('meta has requestId, derivedAt, completeness, version=v1, tier', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { meta } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(typeof meta.requestId).toBe('string')
    expect(meta.requestId.length).toBeGreaterThan(0)
    expect(meta.version).toBe('v1')
    expect(typeof meta.completeness).toBe('number')
    expect(typeof meta.derivedAt).toBe('string')
    expect(meta.tier).toBe('commissioner')
  })
})

describe('view=presentation — manager', () => {
  it('returns 200', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(200)
  })

  it('data has entityId=managerId and entityType=manager', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<ManagerApiPresentation>
    expect(data.entityId).toBe('mgr-001')
    expect(data.entityType).toBe('manager')
  })

  it('data has engagementScore and healthScore', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<ManagerApiPresentation>
    expect(typeof data.engagementScore).toBe('number')
    expect(typeof data.healthScore).toBe('number')
  })

  it('data has retentionRisk, badges, metrics, topRecommendations', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<ManagerApiPresentation>
    expect(typeof data.retentionRisk).toBe('string')
    expect(Array.isArray(data.badges)).toBe(true)
    expect(Array.isArray(data.metrics)).toBe(true)
    expect(Array.isArray(data.topRecommendations)).toBe(true)
  })

  // Regression coverage for a fixed presentation-adapters.ts defect: buildManagerCard
  // was previously called with 6 stray positional args instead of the (managerId,
  // leagueId, input, options?) shape cards.ts actually declares. buildManagerApiPresentation's
  // `mc?.overallEngagementScore ?? 0` / `mc?.retentionRisk ?? 'medium'` fallbacks meant the
  // corrupted card silently produced 0/'medium' instead of the fixture's real 67/'low' — and
  // both fallback values still satisfy `typeof === 'number'`/`'string'`, so the tests above
  // never caught it. Asserting exact values closes that gap.
  it('engagementScore, healthScore, and retentionRisk carry the real fixture values (not the undefined-input fallback)', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<ManagerApiPresentation>
    expect(data.engagementScore).toBe(67)
    expect(data.healthScore).toBe(67)
    expect(data.retentionRisk).toBe('low')
  })

  it('data has version=PRESENTATION_VERSION', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<ManagerApiPresentation>
    expect(data.version).toBe(PRESENTATION_VERSION)
  })

  it('meta has view=presentation and presentationVersion', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { meta } = r.body as PresentationApiResponse<ManagerApiPresentation>
    expect(meta.view).toBe('presentation')
    expect(meta.presentationVersion).toBe(PRESENTATION_VERSION)
    expect(meta.tier).toBe('manager')
  })
})

describe('view=presentation — platform', () => {
  it('returns 200', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(200)
  })

  it('data has entityId=platform and entityType=platform', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<PlatformApiPresentation>
    expect(data.entityType).toBe('platform')
    expect(typeof data.entityId).toBe('string')
  })

  it('data has platformHealthScore, platformHealthSeverity, platformEngagementTier', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<PlatformApiPresentation>
    expect(typeof data.platformHealthScore).toBe('number')
    expect(data.platformHealthSeverity).toBeDefined()
    expect(typeof data.platformEngagementTier).toBe('string')
  })

  it('data has badges, metrics, topRecommendations, interventions, archetypeDistribution', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<PlatformApiPresentation>
    expect(Array.isArray(data.badges)).toBe(true)
    expect(Array.isArray(data.metrics)).toBe(true)
    expect(Array.isArray(data.topRecommendations)).toBe(true)
    expect(Array.isArray(data.interventions)).toBe(true)
    expect(Array.isArray(data.archetypeDistribution)).toBe(true)
  })

  it('data has version=PRESENTATION_VERSION', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<PlatformApiPresentation>
    expect(data.version).toBe(PRESENTATION_VERSION)
  })

  it('meta has view=presentation and presentationVersion', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    const { meta } = r.body as PresentationApiResponse<PlatformApiPresentation>
    expect(meta.view).toBe('presentation')
    expect(meta.presentationVersion).toBe(PRESENTATION_VERSION)
  })

  it('basic-tier caller gets presentation response (not full-tier gated)', async () => {
    enableApi()
    vi.stubEnv('INTELLIGENCE_API_TEST_KEYS', JSON.stringify({
      [TEST_KEY_BASIC]: 'basic',
    }))
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_BASIC, { view: 'presentation' }),
      makeProvider(),
    )
    // basic tier has platform:basic scope — presentation path uses same scope check
    expect(r.status).toBe(200)
    const { data } = r.body as PresentationApiResponse<PlatformApiPresentation>
    expect(data.entityType).toBe('platform')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Invalid view values rejected with 400
// ─────────────────────────────────────────────────────────────────────────────

describe('invalid view values → 400 INVALID_REQUEST', () => {
  it('league view=ipm returns 400', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'ipm' }),
      makeProvider(),
    )
    expect(r.status).toBe(400)
    const body = r.body as IntelligenceApiError
    expect(body.code).toBe('INVALID_REQUEST')
    expect(body.message).toContain('view')
  })

  it('league view=dashboard returns 400', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'dashboard' }),
      makeProvider(),
    )
    expect(r.status).toBe(400)
    expect((r.body as IntelligenceApiError).code).toBe('INVALID_REQUEST')
  })

  it('manager view=PRESENTATION (wrong case) returns 400', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'PRESENTATION' }),
      makeProvider(),
    )
    expect(r.status).toBe(400)
    expect((r.body as IntelligenceApiError).code).toBe('INVALID_REQUEST')
  })

  it('platform view=compact returns 400', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'compact' }),
      makeProvider(),
    )
    expect(r.status).toBe(400)
    expect((r.body as IntelligenceApiError).code).toBe('INVALID_REQUEST')
  })

  it('error body contains requestId', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'bad' }),
      makeProvider(),
    )
    const body = r.body as IntelligenceApiError
    expect(typeof body.requestId).toBe('string')
    expect(body.requestId.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tier permissions enforced before view parsing
// ─────────────────────────────────────────────────────────────────────────────

describe('tier permissions enforced before view param', () => {
  it('missing key → 401 even with view=presentation', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(undefined, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(401)
  })

  it('wrong-scope key → 403 even with view=presentation (basic key cannot read league)', async () => {
    enableApi()
    vi.stubEnv('INTELLIGENCE_API_TEST_KEYS', JSON.stringify({
      [TEST_KEY_BASIC]: 'basic',
    }))
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_BASIC, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(403)
    expect((r.body as IntelligenceApiError).code).toBe('FORBIDDEN')
  })

  it('wrong-scope key → 403 before data provider is called', async () => {
    enableApi()
    vi.stubEnv('INTELLIGENCE_API_TEST_KEYS', JSON.stringify({
      [TEST_KEY_BASIC]: 'basic',
    }))
    let providerCalled = false
    const provider = makeProvider({
      getLeagueIntelligence: async () => { providerCalled = true; return makeLeagueIntel() },
    })
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_BASIC, { leagueId: 'lgr-001', view: 'presentation' }),
      provider,
    )
    expect(r.status).toBe(403)
    expect(providerCalled).toBe(false)
  })

  it('manager endpoint requires manager scope — commissioner key returns 403 with view=presentation', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(403)
    expect((r.body as IntelligenceApiError).code).toBe('FORBIDDEN')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Stub provider → 503 regardless of view param
// ─────────────────────────────────────────────────────────────────────────────

describe('stub data provider → 503 regardless of view param', () => {
  it('league view=presentation → 503 when provider returns null', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      stubDataProvider,
    )
    expect(r.status).toBe(503)
    expect((r.body as IntelligenceApiError).code).toBe('INTELLIGENCE_UNAVAILABLE')
  })

  it('manager view=presentation → 503 when provider returns null', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      stubDataProvider,
    )
    expect(r.status).toBe(503)
  })

  it('platform view=presentation → 503 when provider returns null', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      stubDataProvider,
    )
    expect(r.status).toBe(503)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// No internal field leakage in presentation response
// ─────────────────────────────────────────────────────────────────────────────

describe('no internal field leakage in presentation response', () => {
  it('league presentation does not contain derivedFrom', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const src = JSON.stringify(r.body)
    expect(src).not.toContain('"derivedFrom"')
  })

  it('league presentation does not contain warnings from internal intelligence', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider({ getLeagueIntelligence: async () => makeLeagueIntel({ warnings: ['INTERNAL_WARNING'] }) }),
    )
    const src = JSON.stringify(r.body)
    expect(src).not.toContain('INTERNAL_WARNING')
  })

  it('manager presentation does not contain inactivityWarning field', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', managerId: 'mgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const src = JSON.stringify(r.body)
    expect(src).not.toContain('"inactivityWarning"')
    expect(src).not.toContain('"derivedFrom"')
  })

  it('platform presentation does not expose internal provenance counts', async () => {
    enableApi()
    const r = await platformIntelligenceHandler(
      makeCtx(TEST_KEY_PLATFORM, { view: 'presentation' }),
      makeProvider(),
    )
    const src = JSON.stringify(r.body)
    expect(src).not.toContain('"provenance"')
    expect(src).not.toContain('"leagueIntelligenceCount"')
    expect(src).not.toContain('"managerIntelligenceCount"')
  })

  it('no CSS class strings in presentation output', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const src = JSON.stringify(r.body)
    expect(src).not.toContain('text-emerald')
    expect(src).not.toContain('bg-amber')
    expect(src).not.toContain('tailwind')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Missing required params still caught before view=presentation path
// ─────────────────────────────────────────────────────────────────────────────

describe('required params validated before view=presentation path', () => {
  it('league missing leagueId → 400 even with view=presentation', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(400)
    expect((r.body as IntelligenceApiError).code).toBe('INVALID_REQUEST')
    expect((r.body as IntelligenceApiError).message).toContain('leagueId')
  })

  it('manager missing managerId → 400 even with view=presentation', async () => {
    enableApi()
    const r = await managerIntelligenceHandler(
      makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    expect(r.status).toBe(400)
    expect((r.body as IntelligenceApiError).message).toContain('managerId')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// No route business logic — handlers remain thin
// ─────────────────────────────────────────────────────────────────────────────

describe('handler thinness — no route business logic', () => {
  it('league presentation data metrics are non-empty arrays', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    expect(data.metrics.length).toBeGreaterThan(0)
    for (const m of data.metrics) {
      expect(typeof m.label).toBe('string')
      expect(typeof m.displayValue).toBe('string')
      expect(typeof m.colorToken).toBe('string')
    }
  })

  it('each metric has metricId starting with "metric_"', async () => {
    enableApi()
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    for (const m of data.metrics) {
      expect(m.metricId).toMatch(/^metric_/)
    }
  })

  it('healthSeverity follows IPM score thresholds', async () => {
    enableApi()
    // engagementScore=72 → standard (50–84 range → standard or advisory)
    const r = await leagueIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' }),
      makeProvider(),
    )
    const { data } = r.body as PresentationApiResponse<LeagueApiPresentation>
    // healthScore 72 → advisory (≥70 but <85) per IPM thresholds
    expect(['advisory', 'standard', 'positive']).toContain(data.healthSeverity.token)
  })

  it('determinism: same input produces same output', async () => {
    enableApi()
    const ctx = makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001', view: 'presentation' })
    const provider = makeProvider()
    const r1 = await leagueIntelligenceHandler(ctx, provider)
    const r2 = await leagueIntelligenceHandler(ctx, provider)
    const d1 = (r1.body as PresentationApiResponse<LeagueApiPresentation>).data
    const d2 = (r2.body as PresentationApiResponse<LeagueApiPresentation>).data
    expect(d1.healthScore).toBe(d2.healthScore)
    expect(d1.retentionRisk).toBe(d2.retentionRisk)
    expect(d1.version).toBe(d2.version)
  })
})
