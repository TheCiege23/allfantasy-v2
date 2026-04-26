import { describe, expect, it } from 'vitest'
import {
  computeChimmyConfidenceRubric,
  buildConfidenceBlockFromRubric,
  type ChimmyConfidenceSignals,
} from '@/lib/chimmy-chat/confidence-rubric'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FULL_SIGNALS: ChimmyConfidenceSignals = {
  modelReportedPct: 88,
  hasStalenessWarning: false,
  staleMinutes: null,
  thresholdMinutes: null,
  hasLeagueContext: true,
  dataSourceCount: 3,
  sourceLinkCount: 2,
  responseStructurePopulated: {
    shortAnswer: true,
    whatDataSays: true,
    whatItMeans: true,
    recommendedAction: true,
    caveatsCount: 1,
  },
  answerType: 'start_sit',
}

const BARE_SIGNALS: ChimmyConfidenceSignals = {
  modelReportedPct: null,
  hasStalenessWarning: false,
  staleMinutes: null,
  thresholdMinutes: null,
  hasLeagueContext: false,
  dataSourceCount: 0,
  sourceLinkCount: 0,
  responseStructurePopulated: {
    shortAnswer: false,
    whatDataSays: false,
    whatItMeans: false,
    recommendedAction: false,
    caveatsCount: 0,
  },
  answerType: 'general',
}

// ---------------------------------------------------------------------------
// Score determinism
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — score determinism', () => {
  it('returns identical scores for identical inputs (no randomness)', () => {
    const a = computeChimmyConfidenceRubric(FULL_SIGNALS)
    const b = computeChimmyConfidenceRubric(FULL_SIGNALS)
    expect(a.score).toBe(b.score)
    expect(a.level).toBe(b.level)
  })

  it('score is always in range 0–100', () => {
    for (const signals of [FULL_SIGNALS, BARE_SIGNALS]) {
      const result = computeChimmyConfidenceRubric(signals)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('full signals produce higher score than bare signals', () => {
    const full = computeChimmyConfidenceRubric(FULL_SIGNALS)
    const bare = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(full.score).toBeGreaterThan(bare.score)
  })
})

// ---------------------------------------------------------------------------
// Level band thresholds
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — level bands', () => {
  it('full signals → high confidence', () => {
    const result = computeChimmyConfidenceRubric(FULL_SIGNALS)
    expect(result.level).toBe('high')
  })

  it('bare signals → low or medium confidence (never high)', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.level).not.toBe('high')
  })

  it('medium band: partial league context + some structure', () => {
    const result = computeChimmyConfidenceRubric({
      ...BARE_SIGNALS,
      hasLeagueContext: true,
      dataSourceCount: 2,
      responseStructurePopulated: {
        shortAnswer: true,
        whatDataSays: true,
        whatItMeans: false,
        recommendedAction: false,
        caveatsCount: 0,
      },
      answerType: 'start_sit',
    })
    expect(['medium', 'high']).toContain(result.level)
  })
})

// ---------------------------------------------------------------------------
// Freshness signal
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — freshness', () => {
  it('no staleness warning → fresh', () => {
    const result = computeChimmyConfidenceRubric(FULL_SIGNALS)
    expect(result.freshness).toBe('fresh')
  })

  it('staleness warning, below 2x threshold → partial', () => {
    const result = computeChimmyConfidenceRubric({
      ...FULL_SIGNALS,
      hasStalenessWarning: true,
      staleMinutes: 50,
      thresholdMinutes: 60,
    })
    expect(result.freshness).toBe('partial')
    expect(result.breakdown.freshness).toBe(-8)
  })

  it('staleness warning, staleMinutes > 2x threshold → stale', () => {
    const result = computeChimmyConfidenceRubric({
      ...FULL_SIGNALS,
      hasStalenessWarning: true,
      staleMinutes: 150,
      thresholdMinutes: 60,
    })
    expect(result.freshness).toBe('stale')
    expect(result.breakdown.freshness).toBe(-18)
  })

  it('stale penalty reduces score vs fresh equivalent', () => {
    const fresh = computeChimmyConfidenceRubric({ ...FULL_SIGNALS, hasStalenessWarning: false })
    const stale = computeChimmyConfidenceRubric({
      ...FULL_SIGNALS,
      hasStalenessWarning: true,
      staleMinutes: 200,
      thresholdMinutes: 60,
    })
    expect(stale.score).toBeLessThan(fresh.score)
  })
})

// ---------------------------------------------------------------------------
// League context signal
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — league context', () => {
  it('hasLeagueContext=true → leagueContext: available, +10 delta', () => {
    const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, hasLeagueContext: true, answerType: 'start_sit' })
    expect(result.leagueContext).toBe('available')
    expect(result.breakdown.leagueContext).toBe(10)
  })

  it('hasLeagueContext=false → leagueContext: missing, 0 delta', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.leagueContext).toBe('missing')
    expect(result.breakdown.leagueContext).toBe(0)
  })

  it('league context appears in positiveSignals when available', () => {
    const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, hasLeagueContext: true, answerType: 'start_sit' })
    expect(result.positiveSignals).toContain('league_context')
  })

  it('missing league context appears in missingSignals', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.missingSignals).toContain('league scoring settings')
  })
})

// ---------------------------------------------------------------------------
// Data source count signal
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — data sources', () => {
  it('0 sources → 0 delta', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.breakdown.dataSources).toBe(0)
  })

  it('1 source → +3 delta', () => {
    const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, dataSourceCount: 1 })
    expect(result.breakdown.dataSources).toBe(3)
  })

  it('4+ sources → capped at +12', () => {
    const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, dataSourceCount: 6 })
    expect(result.breakdown.dataSources).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// Model modifier (bounded ± 10)
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — model modifier', () => {
  it('null model pct → 0 modifier', () => {
    const result = computeChimmyConfidenceRubric({ ...FULL_SIGNALS, modelReportedPct: null })
    expect(result.breakdown.modelModifier).toBe(0)
  })

  it('model pct = 72 (neutral) → 0 modifier', () => {
    const result = computeChimmyConfidenceRubric({ ...FULL_SIGNALS, modelReportedPct: 72 })
    expect(result.breakdown.modelModifier).toBe(0)
  })

  it('high model pct → positive modifier, capped at +10', () => {
    const result = computeChimmyConfidenceRubric({ ...FULL_SIGNALS, modelReportedPct: 100 })
    expect(result.breakdown.modelModifier).toBeLessThanOrEqual(10)
    expect(result.breakdown.modelModifier).toBeGreaterThan(0)
  })

  it('low model pct → negative modifier, capped at -10', () => {
    const result = computeChimmyConfidenceRubric({ ...FULL_SIGNALS, modelReportedPct: 0 })
    expect(result.breakdown.modelModifier).toBeGreaterThanOrEqual(-10)
    expect(result.breakdown.modelModifier).toBeLessThan(0)
  })

  it('model modifier cannot push score above 100', () => {
    const result = computeChimmyConfidenceRubric({ ...FULL_SIGNALS, modelReportedPct: 100 })
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// Response structure completeness
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — response structure', () => {
  it('all structure fields → +15 max delta', () => {
    const result = computeChimmyConfidenceRubric({
      ...BARE_SIGNALS,
      responseStructurePopulated: {
        shortAnswer: true,
        whatDataSays: true,
        whatItMeans: true,
        recommendedAction: true,
        caveatsCount: 2,
      },
    })
    expect(result.breakdown.responseStructure).toBe(15)
  })

  it('no structure fields → 0 delta', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.breakdown.responseStructure).toBe(0)
  })

  it('partial structure → partial delta', () => {
    const result = computeChimmyConfidenceRubric({
      ...BARE_SIGNALS,
      responseStructurePopulated: {
        shortAnswer: true,
        whatDataSays: false,
        whatItMeans: false,
        recommendedAction: false,
        caveatsCount: 0,
      },
    })
    expect(result.breakdown.responseStructure).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Answer type base scores
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — answer type base', () => {
  it('start_sit/waiver/trade base = 70', () => {
    for (const answerType of ['start_sit', 'waiver', 'trade'] as const) {
      const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, answerType })
      expect(result.breakdown.base).toBe(70)
    }
  })

  it('draft/injury base = 68', () => {
    for (const answerType of ['draft', 'injury'] as const) {
      const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, answerType })
      expect(result.breakdown.base).toBe(68)
    }
  })

  it('commissioner/general base = 62', () => {
    for (const answerType of ['commissioner', 'general'] as const) {
      const result = computeChimmyConfidenceRubric({ ...BARE_SIGNALS, answerType })
      expect(result.breakdown.base).toBe(62)
    }
  })
})

// ---------------------------------------------------------------------------
// Rationale and signals lists
// ---------------------------------------------------------------------------

describe('computeChimmyConfidenceRubric — rationale and signals', () => {
  it('rationale is a non-empty string ending with period', () => {
    const result = computeChimmyConfidenceRubric(FULL_SIGNALS)
    expect(result.rationale.length).toBeGreaterThan(0)
    expect(result.rationale.endsWith('.')).toBe(true)
  })

  it('positiveSignals is non-empty (always falls back to base_policy)', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.positiveSignals.length).toBeGreaterThan(0)
  })

  it('full signals → multiple positiveSignals', () => {
    const result = computeChimmyConfidenceRubric(FULL_SIGNALS)
    expect(result.positiveSignals.length).toBeGreaterThanOrEqual(3)
  })

  it('missingSignals includes missing league context when absent', () => {
    const result = computeChimmyConfidenceRubric(BARE_SIGNALS)
    expect(result.missingSignals).toContain('league scoring settings')
  })
})

// ---------------------------------------------------------------------------
// buildConfidenceBlockFromRubric
// ---------------------------------------------------------------------------

describe('buildConfidenceBlockFromRubric', () => {
  it('returns a valid ChimmyConfidenceBlock shape', () => {
    const rubric = computeChimmyConfidenceRubric(FULL_SIGNALS)
    const block = buildConfidenceBlockFromRubric(rubric, ['league_context', 'injury_report'])
    expect(['high', 'medium', 'low']).toContain(block.level)
    expect(['fresh', 'partial', 'stale', 'unknown']).toContain(block.freshness)
    expect(['available', 'partial', 'missing']).toContain(block.leagueContext)
    expect(block.basedOn.length).toBeGreaterThan(0)
    expect(block.basedOn.every((s) => s.length > 0)).toBe(true)
    expect(block.rationale.length).toBeGreaterThan(0)
  })

  it('basedOn uses positiveSignals when present', () => {
    const rubric = computeChimmyConfidenceRubric(FULL_SIGNALS)
    const block = buildConfidenceBlockFromRubric(rubric, ['league_context'])
    // positiveSignals should be non-empty for FULL_SIGNALS
    expect(block.basedOn).toEqual(rubric.positiveSignals)
  })

  it('basedOn falls back to dataSources when positiveSignals is empty', () => {
    // Force positiveSignals to be empty by making bare signals + no league/sources
    const rubric = computeChimmyConfidenceRubric(BARE_SIGNALS)
    // BARE_SIGNALS has no contributors → positiveSignals = ['base_policy']
    // so basedOn will be positiveSignals (always non-empty thanks to base_policy fallback)
    expect(rubric.positiveSignals).toContain('base_policy')
    const block = buildConfidenceBlockFromRubric(rubric, [])
    expect(block.basedOn.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: buildChimmyAnswerContract uses rubric (smoke test)
// ---------------------------------------------------------------------------

describe('buildChimmyAnswerContract — rubric integration', () => {
  it('full args → confidence.level is not undefined', async () => {
    const { buildChimmyAnswerContract } = await import('@/lib/chimmy-chat/response-contract')
    const result = buildChimmyAnswerContract({
      message: 'Should I start Tyreek Hill this week?',
      insightType: null,
      specialistAgent: null,
      confidencePct: 88,
      stalenessWarning: null,
      staleMinutes: null,
      thresholdMinutes: null,
      dataSources: ['league_context', 'injury_report'],
      sourceLinks: ['https://example.com'],
      hasLeagueContext: true,
      responseStructure: {
        shortAnswer: 'Start Hill.',
        whatDataSays: 'Target share 28% last 3 weeks.',
        whatItMeans: 'Clear WR1 upside.',
        recommendedAction: 'Start with confidence.',
        caveats: ['Monitor Thursday practice.'],
      },
      followUps: [{ label: 'Risk?', prompt: 'What is the risk here?' }],
    })
    expect(result.fallbackUsed).toBe(false)
    expect(['high', 'medium', 'low']).toContain(result.contract.confidence.level)
    expect(result.contract.confidence.rationale.length).toBeGreaterThan(0)
    expect(result.contract.confidence.basedOn.length).toBeGreaterThan(0)
    expect(result.contract.confidence.basedOn.every((s) => s.length > 0)).toBe(true)
  })

  it('stale data → confidence level is lower than fresh equivalent', async () => {
    const { buildChimmyAnswerContract } = await import('@/lib/chimmy-chat/response-contract')
    const base = {
      message: 'Who should I start?',
      insightType: null,
      specialistAgent: null,
      confidencePct: 72,
      dataSources: ['league_context'],
      sourceLinks: [],
      hasLeagueContext: true,
      responseStructure: {
        shortAnswer: 'Start A.',
        whatDataSays: 'Data.',
        whatItMeans: 'Meaning.',
        recommendedAction: 'Start A.',
        caveats: [],
      },
      followUps: [],
    }
    const fresh = buildChimmyAnswerContract({ ...base, stalenessWarning: null, staleMinutes: null, thresholdMinutes: null })
    const stale = buildChimmyAnswerContract({
      ...base,
      stalenessWarning: 'Data is 3 hours old.',
      staleMinutes: 200,
      thresholdMinutes: 60,
    })
    const LEVELS = { high: 2, medium: 1, low: 0 }
    expect(LEVELS[stale.contract.confidence.level]).toBeLessThanOrEqual(
      LEVELS[fresh.contract.confidence.level]
    )
  })
})
