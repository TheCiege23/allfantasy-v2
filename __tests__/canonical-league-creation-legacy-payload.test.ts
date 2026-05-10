import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { buildLegacyManualCanonicalCreatePayload } from '@/lib/league-creation/canonical/legacyManualToCanonicalCreateBody'
import { stripForbiddenCreateLeagueFields, validateCreatePayload } from '@/lib/league-creation/canonical/validateCreateLeague'

describe('canonical league creation legacy payload', () => {
  it('declares rank window inputs before mergedSettings in createCanonicalLeagueInTransaction', () => {
    const path = join(process.cwd(), 'lib/league-creation/canonical/createCanonicalLeagueInTransaction.ts')
    const src = readFileSync(path, 'utf8')
    const iProfile = src.indexOf('const [userProfile')
    const iRank = src.indexOf('const creatorRankLevel')
    const iMerged = src.indexOf('const mergedSettings')
    expect(iProfile).toBeGreaterThan(-1)
    expect(iRank).toBeGreaterThan(-1)
    expect(iMerged).toBeGreaterThan(-1)
    expect(iProfile).toBeLessThan(iRank)
    expect(iRank).toBeLessThan(iMerged)
  })

  it('normalizes Quick Create–style manual payload (name/scoring/variant bug) into a valid canonical body', () => {
    const raw = buildLegacyManualCanonicalCreatePayload({
      sport: 'NFL',
      leagueName: 'Test League',
      teamCount: 12,
      requestedLeagueType: 'redraft',
      requestedDraftType: 'snake',
      scoringPresetIdInput: undefined,
      soccerPipelineInput: undefined,
      settingsWizard: { trade_review_mode: 'commissioner' },
      isIdpRequested: false,
      legacyScoringLabel: 'PPR',
      preferDynastyConcept: false,
    })
    const v = validateCreatePayload(stripForbiddenCreateLeagueFields(raw).body)
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.data.scoringPreset).toBe('fb_full_ppr')
      expect(v.data.concept).toBe('redraft')
    }
  })

  it('maps preferDynastyConcept to dynasty when wizard type is still redraft', () => {
    const raw = buildLegacyManualCanonicalCreatePayload({
      sport: 'NFL',
      leagueName: 'Dynasty League',
      teamCount: 12,
      requestedLeagueType: 'redraft',
      requestedDraftType: 'snake',
      scoringPresetIdInput: undefined,
      soccerPipelineInput: undefined,
      settingsWizard: {},
      isIdpRequested: false,
      legacyScoringLabel: 'HALF_PPR',
      preferDynastyConcept: true,
    })
    const v = validateCreatePayload(stripForbiddenCreateLeagueFields(raw).body)
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.data.concept).toBe('dynasty')
      expect(v.data.scoringPreset).toBe('fb_half_ppr')
    }
  })

  it('accepts explicit redraft wizard payload without dynasty hint', () => {
    const raw = buildLegacyManualCanonicalCreatePayload({
      sport: 'NFL',
      leagueName: 'Redraft',
      teamCount: 10,
      requestedLeagueType: 'redraft',
      requestedDraftType: 'snake',
      scoringPresetIdInput: undefined,
      soccerPipelineInput: undefined,
      settingsWizard: {},
      isIdpRequested: false,
      legacyScoringLabel: 'STANDARD',
      preferDynastyConcept: false,
    })
    const v = validateCreatePayload(stripForbiddenCreateLeagueFields(raw).body)
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.data.concept).toBe('redraft')
    }
  })
})
