import { describe, it, expect } from 'vitest'
import {
  marketEventIdempotencyKey,
  summarizeAssets,
  composeMarketEventPayload,
  REDRAFT_MARKET_EVENT_TYPES,
} from '@/lib/trade-market/redraftTradeMarketEvents'

const assetsFixture = [
  { fromRosterId: 'A', toRosterId: 'B', assetType: 'player', playerId: 'p1', playerName: 'P One', pickSeason: null, pickRound: null, metadata: {} },
  { fromRosterId: 'B', toRosterId: 'A', assetType: 'player', playerId: 'p2', playerName: 'P Two', pickSeason: null, pickRound: null, metadata: {} },
  { fromRosterId: 'A', toRosterId: 'B', assetType: 'faab', playerId: null, playerName: null, pickSeason: null, pickRound: null, metadata: { amount: 25 } },
  { fromRosterId: 'B', toRosterId: 'A', assetType: 'draft_pick', playerId: null, playerName: null, pickSeason: 2027, pickRound: 2, metadata: {} },
]

describe('marketEventIdempotencyKey', () => {
  it('is stable per (proposal,eventType)', () => {
    expect(marketEventIdempotencyKey('prop1', 'proposal_accepted')).toBe('prop1:proposal_accepted')
    expect(marketEventIdempotencyKey('prop1', 'proposal_accepted')).toBe('prop1:proposal_accepted') // deterministic
  })
  it('includes a suffix for per-voter events', () => {
    expect(marketEventIdempotencyKey('prop1', 'league_vote_cast', 'rosterX')).toBe('prop1:league_vote_cast:rosterX')
  })
})

describe('summarizeAssets', () => {
  it('extracts player ids, pick details, and total FAAB', () => {
    const s = summarizeAssets(assetsFixture)
    expect(s.playerAssetIds).toEqual(['p1', 'p2'])
    expect(s.pickAssets).toEqual([{ season: 2027, round: 2 }])
    expect(s.faabAmount).toBe(25)
    expect(s.normalized).toHaveLength(4)
  })
})

describe('composeMarketEventPayload', () => {
  const base = {
    proposal: { status: 'accepted', proposerRosterId: 'A', receiverRosterId: 'B', vetoMode: 'commissioner', vetoThreshold: 4 },
    season: { sport: 'NFL', season: 2026, currentWeek: 6 },
    league: { scoring: 'ppr', tradeReviewHours: 48 },
    teamCount: 5,
    assets: summarizeAssets(assetsFixture),
    snapshot: { grade: 'B+', fairnessScore: 84, confidenceScore: 100, valueDifference: 120 },
    sideTotals: [{ rosterId: 'A', total: 5000 }, { rosterId: 'B', total: 4880 }],
    proposerProfile: { rosterId: 'A', stance: 'contender' as const, winPct: 0.7, pointsFor: 900, weakPositions: [], strongPositions: ['RB'], depthIssues: false },
    receiverProfile: null,
  }

  it('includes context, state, asset summary, and snapshot grade/fairness', () => {
    const p = composeMarketEventPayload(base)
    expect(p.context).toMatchObject({ sport: 'NFL', leagueType: 'redraft', scoring: 'ppr', teamCount: 5, seasonYear: 2026 })
    expect(p.snapshot).toMatchObject({ grade: 'B+', fairnessScore: 84, confidenceScore: 100 })
    expect(p.assets.playerAssetIds).toEqual(['p1', 'p2'])
    expect(p.assets.sideTotals).toHaveLength(2)
    expect(p.profiles.proposer?.stance).toBe('contender')
  })

  it('carries vote direction/counts when present', () => {
    const p = composeMarketEventPayload({ ...base, voteDirection: 'veto', voteCounts: { approve: 1, veto: 4, threshold: 4 } })
    expect(p.state.voteDirection).toBe('veto')
    expect(p.state.voteCounts).toEqual({ approve: 1, veto: 4, threshold: 4 })
  })

  it('contains NO PII (no email/token/session/password keys anywhere)', () => {
    const p = composeMarketEventPayload(base)
    const json = JSON.stringify(p).toLowerCase()
    for (const banned of ['email', 'token', 'session', 'password', '@', 'passwordhash', 'authorization']) {
      expect(json.includes(banned)).toBe(false)
    }
  })
})

describe('event type catalog', () => {
  it('covers the documented lifecycle events', () => {
    for (const t of ['proposal_created', 'value_snapshot_created', 'proposal_accepted', 'trade_processed',
      'proposal_rejected', 'proposal_canceled', 'commissioner_approved', 'commissioner_vetoed',
      'league_vote_cast', 'proposal_vetoed', 'proposal_expired', 'trade_failed']) {
      expect(REDRAFT_MARKET_EVENT_TYPES).toContain(t)
    }
  })
})
