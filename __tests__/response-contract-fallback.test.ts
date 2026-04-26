import { describe, expect, it } from 'vitest'
import {
  buildChimmyAnswerContract,
  buildFallbackChimmyAnswerContract,
} from '@/lib/chimmy-chat/response-contract'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_BASE_ARGS = {
  message: 'Should I start Justin Jefferson this week?',
  insightType: null,
  specialistAgent: null,
  confidencePct: 78,
  stalenessWarning: null,
  dataSources: ['league_context'],
  sourceLinks: [],
  hasLeagueContext: true,
  responseStructure: {
    shortAnswer: 'Start him.',
    whatDataSays: 'Projected for 14 targets.',
    whatItMeans: 'Favorable matchup against the Bears.',
    recommendedAction: 'Start Jefferson with confidence.',
    caveats: ['Monitor injury report Friday.'],
  },
  followUps: [
    { label: 'Who to bench?', prompt: 'Who should I bench instead?' },
  ],
}

// ---------------------------------------------------------------------------
// buildChimmyAnswerContract — happy path
// ---------------------------------------------------------------------------

describe('buildChimmyAnswerContract — happy path', () => {
  it('returns fallbackUsed: false for fully valid args', () => {
    const result = buildChimmyAnswerContract(VALID_BASE_ARGS)
    expect(result.fallbackUsed).toBe(false)
    expect(result.fallbackReason).toBeUndefined()
  })

  it('contract has correct answerType for start/sit keyword', () => {
    const result = buildChimmyAnswerContract(VALID_BASE_ARGS)
    expect(result.contract.answerType).toBe('start_sit')
  })

  it('contract has confidence block with level and freshness', () => {
    const result = buildChimmyAnswerContract(VALID_BASE_ARGS)
    expect(['high', 'medium', 'low']).toContain(result.contract.confidence.level)
    expect(['fresh', 'partial', 'stale', 'unknown']).toContain(result.contract.confidence.freshness)
  })

  it('contract followUps come from args when valid', () => {
    const result = buildChimmyAnswerContract(VALID_BASE_ARGS)
    expect(result.contract.followUps.length).toBeGreaterThan(0)
  })

  it('contract followUps fall back to defaults when args followUps are empty', () => {
    const result = buildChimmyAnswerContract({ ...VALID_BASE_ARGS, followUps: [] })
    expect(result.contract.followUps.length).toBeGreaterThan(0)
  })

  it('answerType is trade when insightType=trade', () => {
    const result = buildChimmyAnswerContract({
      ...VALID_BASE_ARGS,
      message: 'trade offer details',
      insightType: 'trade',
      responseStructure: {
        shortAnswer: 'Accept it.',
        whatDataSays: 'Hill has high target share.',
        whatItMeans: 'Upgrade at WR.',
        recommendedAction: 'Accept the trade.',
        caveats: [],
      },
    })
    expect(result.fallbackUsed).toBe(false)
    expect(result.contract.answerType).toBe('trade')
  })

  it('answerType is waiver when insightType=waiver', () => {
    const result = buildChimmyAnswerContract({
      ...VALID_BASE_ARGS,
      message: 'waiver wire adds',
      insightType: 'waiver',
      responseStructure: {
        shortAnswer: 'Add Bijan.',
        whatDataSays: 'High touch share.',
        whatItMeans: 'RB1 opportunity.',
        recommendedAction: 'Add Bijan, drop Ross.',
        caveats: [],
      },
    })
    expect(result.fallbackUsed).toBe(false)
    expect(result.contract.answerType).toBe('waiver')
  })
})

// ---------------------------------------------------------------------------
// buildChimmyAnswerContract — fallback triggered via invalid dataSources
// ---------------------------------------------------------------------------

describe('buildChimmyAnswerContract — fallback path', () => {
// Trigger: caveats: [''] causes risks = [''] which fails z.string().min(1) in schema
const FALLBACK_TRIGGER_ARGS = {
  ...VALID_BASE_ARGS,
  insightType: 'start_sit', // force start_sit which has risks field
  message: 'start or sit decision',
  responseStructure: {
    ...VALID_BASE_ARGS.responseStructure!,
    caveats: [''], // empty string → risks = [''] → schema violation
  },
}

  it('returns fallbackUsed: true when caveats contain empty string (risks schema violation)', () => {
    const result = buildChimmyAnswerContract(FALLBACK_TRIGGER_ARGS)
    expect(result.fallbackUsed).toBe(true)
  })

  it('fallback contract is always answerType: general', () => {
    const result = buildChimmyAnswerContract(FALLBACK_TRIGGER_ARGS)
    expect(result.contract.answerType).toBe('general')
  })

  it('fallback contract passes its own schema (never returns unvalidated output)', () => {
    const result = buildChimmyAnswerContract(FALLBACK_TRIGGER_ARGS)
    expect(result.contract.confidence.basedOn.length).toBeGreaterThan(0)
    expect(result.contract.confidence.basedOn.every((s: string) => s.length > 0)).toBe(true)
    expect(result.contract.followUps.length).toBeGreaterThan(0)
  })

  it('fallbackReason captures which fields failed', () => {
    const result = buildChimmyAnswerContract(FALLBACK_TRIGGER_ARGS)
    expect(result.fallbackReason).toBeDefined()
    expect(typeof result.fallbackReason).toBe('string')
    expect(result.fallbackReason!.length).toBeGreaterThan(0)
  })

  it('fallback contract leagueContext reflects hasLeagueContext=true', () => {
    const result = buildChimmyAnswerContract({ ...FALLBACK_TRIGGER_ARGS, hasLeagueContext: true })
    expect(['available', 'partial']).toContain(result.contract.confidence.leagueContext)
  })

  it('fallback contract leagueContext reflects hasLeagueContext=false', () => {
    const result = buildChimmyAnswerContract({ ...FALLBACK_TRIGGER_ARGS, hasLeagueContext: false })
    expect(result.contract.confidence.leagueContext).toBe('missing')
  })
})

// ---------------------------------------------------------------------------
// buildFallbackChimmyAnswerContract — standalone
// ---------------------------------------------------------------------------

describe('buildFallbackChimmyAnswerContract', () => {
  it('always returns a valid general contract (hasLeagueContext=true)', () => {
    const contract = buildFallbackChimmyAnswerContract(true)
    expect(contract.answerType).toBe('general')
    expect(contract.confidence.basedOn.length).toBeGreaterThan(0)
    expect(contract.confidence.basedOn.every((s) => s.length > 0)).toBe(true)
    expect(contract.followUps.length).toBeGreaterThan(0)
  })

  it('always returns a valid general contract (hasLeagueContext=false)', () => {
    const contract = buildFallbackChimmyAnswerContract(false)
    expect(contract.answerType).toBe('general')
    expect(contract.confidence.leagueContext).toBe('missing')
  })

  it('recommendation is a non-empty string', () => {
    const contract = buildFallbackChimmyAnswerContract(true)
    if (contract.answerType === 'general') {
      expect(contract.recommendation.length).toBeGreaterThan(0)
      expect(contract.keyPoints.length).toBeGreaterThan(0)
    }
  })

  it('followUps have non-empty label and prompt', () => {
    const contract = buildFallbackChimmyAnswerContract(false)
    for (const fu of contract.followUps) {
      expect(fu.label.length).toBeGreaterThan(0)
      expect(fu.prompt.length).toBeGreaterThan(0)
    }
  })
})
