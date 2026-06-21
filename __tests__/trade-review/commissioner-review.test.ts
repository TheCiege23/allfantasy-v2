import { describe, it, expect } from 'vitest'
import { summarizeMarketContext } from '@/lib/trade-review/marketContext'
import {
  buildCommissionerTradeReview,
  detectRiskFlags,
  detectContextFlags,
  type CommissionerReviewInput,
} from '@/lib/trade-review/redraftCommissionerTradeReview'
import type { TeamProfile } from '@/lib/trade-value/types'

const contender: TeamProfile = { rosterId: 'A', stance: 'contender', winPct: 0.8, pointsFor: 1000, weakPositions: ['WR'], strongPositions: ['RB'], depthIssues: false }
const rebuilder: TeamProfile = { rosterId: 'B', stance: 'rebuilder', winPct: 0.2, pointsFor: 700, weakPositions: ['QB'], strongPositions: [], depthIssues: true }

function baseInput(overrides: Partial<CommissionerReviewInput> = {}): CommissionerReviewInput {
  return {
    proposerRosterId: 'A',
    receiverRosterId: 'B',
    status: 'pending',
    vetoMode: 'commissioner',
    vetoThreshold: 4,
    sport: 'NFL',
    currentWeek: 6,
    settings: { tradeReviewHours: 48, tradeDeadlineWeek: 12, draftPickTrading: false },
    snapshot: { grade: 'B', fairnessScore: 80, confidenceScore: 90, valueDifference: 200, sideTotals: [{ rosterId: 'A', total: 5000 }, { rosterId: 'B', total: 4800 }] },
    assets: [
      { kind: 'player', fromRosterId: 'A', toRosterId: 'B', position: 'RB' },
      { kind: 'player', fromRosterId: 'B', toRosterId: 'A', position: 'WR' },
    ],
    proposerProfile: contender,
    receiverProfile: rebuilder,
    hasMarketEvents: true,
    marketContext: { sampleSize: 5, averageFairness: 82 },
    ...overrides,
  }
}

describe('detectRiskFlags', () => {
  it('flags high value delta + low confidence', () => {
    const flags = detectRiskFlags(baseInput({ snapshot: { grade: 'D', fairnessScore: 45, confidenceScore: 40, valueDifference: 4000, sideTotals: [] } }))
    expect(flags).toContain('VALUE_DELTA_HIGH')
    expect(flags).toContain('LOW_CONFIDENCE_VALUES')
  })
  it('flags one-sided trade', () => {
    const flags = detectRiskFlags(baseInput({ assets: [{ kind: 'player', fromRosterId: 'A', toRosterId: 'B', position: 'RB' }] }))
    expect(flags).toContain('ONE_SIDE_EMPTY')
  })
  it('flags FAAB imbalance + draft pick + deadline near', () => {
    const flags = detectRiskFlags(baseInput({
      currentWeek: 12,
      assets: [
        { kind: 'faab', fromRosterId: 'A', toRosterId: 'B', faabAmount: 40 },
        { kind: 'draft_pick', fromRosterId: 'B', toRosterId: 'A' },
      ],
    }))
    expect(flags).toContain('FAAB_IMBALANCE')
    expect(flags).toContain('DRAFT_PICK_INCLUDED')
    expect(flags).toContain('DEADLINE_NEAR')
  })
  it('flags missing snapshot + missing market history + already-vetoed', () => {
    const flags = detectRiskFlags(baseInput({ snapshot: null, hasMarketEvents: false, status: 'vetoed' }))
    expect(flags).toContain('VALUE_SNAPSHOT_MISSING')
    expect(flags).toContain('MARKET_EVENT_HISTORY_MISSING')
    expect(flags).toContain('TRADE_ALREADY_VETOED')
  })
})

describe('detectContextFlags', () => {
  it('detects contender buying points + rebuilder future value + NCAAF', () => {
    const flags = detectContextFlags(baseInput({
      sport: 'NCAAF',
      assets: [
        { kind: 'player', fromRosterId: 'B', toRosterId: 'A', position: 'RB' }, // contender A receives a player
        { kind: 'draft_pick', fromRosterId: 'A', toRosterId: 'B' }, // rebuilder B receives a pick
      ],
    }))
    expect(flags).toContain('CONTENDER_BUYING_POINTS')
    expect(flags).toContain('REBUILDER_ACQUIRING_FUTURE_VALUE')
    expect(flags).toContain('NCAAF_LIMITED_DATA')
  })
  it('detects position need filled (contender weak at WR receives a WR)', () => {
    const flags = detectContextFlags(baseInput({
      assets: [{ kind: 'player', fromRosterId: 'B', toRosterId: 'A', position: 'WR' }, { kind: 'player', fromRosterId: 'A', toRosterId: 'B', position: 'RB' }],
    }))
    expect(flags).toContain('POSITION_NEED_FILLED')
  })
})

describe('buildCommissionerTradeReview', () => {
  it('recommends review on lopsided low-confidence trades and emits non-accusatory notes', () => {
    const r = buildCommissionerTradeReview(baseInput({ snapshot: { grade: 'F', fairnessScore: 30, confidenceScore: 40, valueDifference: 6000, sideTotals: [] } }))
    expect(r.summary.reviewRecommended).toBe(true)
    expect(r.summary.lopsided).toBe(true)
    const text = r.notes.join(' ').toLowerCase()
    expect(text).not.toMatch(/collusion|cheat|veto this|approve automatically/)
    expect(text).toMatch(/manual review suggested/)
  })
  it('does not recommend review for a fair, confident, accepted trade', () => {
    const r = buildCommissionerTradeReview(baseInput({ status: 'accepted' }))
    expect(r.summary.reviewRecommended).toBe(false)
    expect(r.riskFlags).toContain('TRADE_ALREADY_ACCEPTED')
  })
  it('contains no PII', () => {
    const r = buildCommissionerTradeReview(baseInput())
    const json = JSON.stringify(r).toLowerCase()
    for (const banned of ['email', 'token', 'session', 'password', '@', 'authorization']) {
      expect(json.includes(banned)).toBe(false)
    }
  })
})

describe('summarizeMarketContext', () => {
  it('returns insufficient-history message under the minimum sample', () => {
    const ctx = summarizeMarketContext([
      { eventType: 'proposal_created', fairnessScore: 80, createdAt: new Date().toISOString() },
    ])
    expect(ctx.sampleSize).toBe(1)
    expect(ctx.message).toMatch(/Not enough AllFantasy market history/)
  })
  it('computes averages + counts with enough sample', () => {
    const now = new Date().toISOString()
    const ctx = summarizeMarketContext([
      { eventType: 'proposal_created', fairnessScore: 80, createdAt: now },
      { eventType: 'proposal_created', fairnessScore: 70, createdAt: now },
      { eventType: 'proposal_created', fairnessScore: 90, createdAt: now },
      { eventType: 'proposal_accepted', fairnessScore: null, createdAt: now },
      { eventType: 'commissioner_vetoed', fairnessScore: null, createdAt: now },
    ])
    expect(ctx.sampleSize).toBe(3)
    expect(ctx.averageFairness).toBe(80)
    expect(ctx.medianFairness).toBe(80)
    expect(ctx.acceptedCount).toBe(1)
    expect(ctx.vetoedCount).toBe(1)
  })
})
