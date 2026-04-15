import { describe, expect, it } from 'vitest'
import { blendCombinedAdp, computeContextAnchorAdp, resolveComparableAdpValues } from '@/lib/live-draft-brain/combined-ai-adp'
import type { CombinedAdpInputs } from '@/lib/live-draft-brain/types'

describe('combined-ai-adp', () => {
  it('uses 55/35/10 when both external and site are present', () => {
    const input: CombinedAdpInputs = {
      externalAdp: 40,
      siteAdp: 20,
      brainContext: {
        sport: 'NFL',
        draftFormat: 'SNAKE',
        round: 3,
        pick: 4,
        totalTeams: 12,
        overallPick: 28,
      },
      playerMeta: { position: 'RB' },
      externalSource: { sport: 'NFL', matchesContext: true },
      siteSource: { sport: 'NFL', matchesContext: true, sampleSize: 50 },
    }
    const ctx = computeContextAnchorAdp(input, 30)
    const r = blendCombinedAdp({ ...input, contextAdjustmentAdp: ctx })
    const expected = 0.55 * 40 + 0.35 * 20 + 0.1 * ctx
    expect(r.combinedAdp).toBeCloseTo(Math.round(expected * 10) / 10, 4)
  })

  it('excludes external ADP when matchesContext is false', () => {
    const input: CombinedAdpInputs = {
      externalAdp: 10,
      siteAdp: 50,
      externalSource: { sport: 'NFL', matchesContext: false },
      siteSource: { sport: 'NFL', matchesContext: true, sampleSize: 30 },
      brainContext: {
        sport: 'NFL',
        draftFormat: 'SNAKE',
        round: 1,
        pick: 1,
        totalTeams: 12,
        overallPick: 1,
      },
      playerMeta: { position: 'WR' },
    }
    const { external, site } = resolveComparableAdpValues(input)
    expect(external).toBeNull()
    expect(site).toBe(50)
    const r = blendCombinedAdp(input)
    expect(r.externalAdp).toBe(10)
    expect(r.siteAdp).toBe(50)
    expect(r.combinedAdp).toBeGreaterThan(40)
  })

  it('returns trend and contextLabel', () => {
    const r = blendCombinedAdp({
      externalAdp: 30,
      siteAdp: 24,
      brainContext: {
        sport: 'NFL',
        draftFormat: 'SNAKE',
        leagueType: 'dynasty',
        isSuperflex: true,
        round: 4,
        pick: 6,
        totalTeams: 12,
        overallPick: 42,
      },
      playerMeta: { position: 'QB' },
      externalSource: { sport: 'NFL', matchesContext: true },
      siteSource: { sport: 'NFL', matchesContext: true, sampleSize: 100, coverageConfidence: 0.9 },
    })
    expect(r.trend.length).toBeGreaterThan(3)
    expect(r.contextLabel).toContain('NFL')
    expect(r.contextLabel).toContain('dynasty')
    expect(r.confidence).toBeGreaterThan(50)
  })
})
