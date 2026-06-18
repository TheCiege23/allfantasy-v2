import { describe, expect, it } from 'vitest'
import {
  analyzeRedraftTradeBuilder,
  estimateRedraftTradeAssetValue,
  type RedraftTradeBuilderAsset,
} from '@/lib/redraft/tradeBuilderAnalysis'

const cmc: RedraftTradeBuilderAsset = {
  assetType: 'player',
  playerName: 'Christian McCaffrey',
  position: 'RB',
  team: 'SF',
}

const breece: RedraftTradeBuilderAsset = {
  assetType: 'player',
  playerName: 'Breece Hall',
  position: 'RB',
  team: 'NYJ',
}

describe('redraft trade builder analysis', () => {
  it('produces pre-submit fairness, risk, positional impact, and Chimmy explanation', () => {
    const result = analyzeRedraftTradeBuilder({
      rosterALabel: 'Team A',
      rosterBLabel: 'Team B',
      rosterASends: [cmc],
      rosterBSends: [breece],
    })

    expect(result.fairnessScore).toBeGreaterThan(0)
    expect(result.fairnessScore).toBeLessThanOrEqual(100)
    expect(result.riskScore).toBeGreaterThanOrEqual(0)
    expect(result.riskScore).toBeLessThanOrEqual(100)
    expect(result.positionalImpact).toContain('Team A receives RB')
    expect(result.positionalImpact).toContain('Team B receives RB')
    expect(result.chimmyExplanation).toContain('Team A')
    expect(result.chimmyExplanation).toContain('Team B')
    expect(result.chimmyExplanation).toContain('Trade is')
  })

  it('keeps redraft analysis free of dynasty value language', () => {
    const result = analyzeRedraftTradeBuilder({
      rosterASends: [cmc],
      rosterBSends: [breece],
    })

    expect(JSON.stringify(result).toLowerCase()).not.toContain('dynasty value')
    expect(JSON.stringify(result).toLowerCase()).not.toContain('dynasty')
  })

  it('values earlier picks above later picks', () => {
    const firstRoundPick = estimateRedraftTradeAssetValue({
      assetType: 'draft_pick',
      pickSeason: 2027,
      pickRound: 1,
    })
    const fourthRoundPick = estimateRedraftTradeAssetValue({
      assetType: 'draft_pick',
      pickSeason: 2027,
      pickRound: 4,
    })

    expect(firstRoundPick).toBeGreaterThan(fourthRoundPick)
  })

  it('adds risk when future picks are included', () => {
    const playerOnly = analyzeRedraftTradeBuilder({
      rosterASends: [cmc],
      rosterBSends: [breece],
    })
    const withPick = analyzeRedraftTradeBuilder({
      rosterASends: [
        cmc,
        {
          assetType: 'draft_pick',
          pickSeason: 2027,
          pickRound: 2,
        },
      ],
      rosterBSends: [breece],
    })

    expect(withPick.riskScore).toBeGreaterThan(playerOnly.riskScore)
  })
})
