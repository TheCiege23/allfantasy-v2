/**
 * Integration-style tests: composed engines without DB (preset → draft plan → validation → import bundle).
 */

import { describe, expect, it } from 'vitest'
import { generateFullPickOrder } from '@/lib/draft-engine/order/generateFullPickOrder'
import { LEAGUE_ENGINE_SCENARIO_FIXTURES } from '@/lib/engine-testing/fixtures/leagueScenarioFixtures'
import { runExtendedLeagueEngineSimulation } from '@/lib/engine-testing/simulation/extendedLeagueSimulation'
import { runPresetEngine } from '@/lib/league-creation/preset-engine/runPresetEngine'
import { validateCreatePayload } from '@/lib/league-creation/canonical/validateCreateLeague'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'
import { buildCanonicalImportBundle } from '@/lib/league-import/canonicalImportNormalizer'
import { buildMinimalNormalizedImport } from '@/lib/engine-testing/fixtures/importNormalizationFixtures'

function slots(n: number): SlotOrderEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    slot: i + 1,
    rosterId: `roster-${i + 1}`,
    displayName: `Team ${i + 1}`,
  }))
}

describe('league engine integration (no DB)', () => {
  it('create payload validates then preset engine accepts same shape', () => {
    const payload = {
      concept: 'dynasty',
      sport: 'NFL' as const,
      teamCount: 12,
      draftType: 'snake',
      scoringPreset: 'dynasty_ppr',
      leagueName: 'Integration',
    }
    const v = validateCreatePayload(payload)
    expect(v.ok).toBe(true)
    if (!v.ok) throw new Error('validation failed')
    const out = runPresetEngine({
      concept: v.data.concept,
      sport: v.data.sport,
      teamCount: v.data.teamCount,
      draftType: v.data.draftType,
      scoringPreset: v.data.scoringPreset,
      leagueName: v.data.leagueName,
      commissionerId: 'comm-1',
    })
    expect(out.formatResolution).toBeTruthy()
  })

  it('weekly scoring path: preset → draft plan length matches invariant', () => {
    const fixture = LEAGUE_ENGINE_SCENARIO_FIXTURES.find((f) => f.id === 'standard_redraft_nfl')!
    const preset = runPresetEngine(fixture.preset)
    const rounds = preset.formatResolution.draftDefaults.rounds_default ?? 16
    const teamCount = fixture.preset.teamCount
    const plan = generateFullPickOrder({
      teamCount,
      rounds,
      draftType: 'snake',
      thirdRoundReversal: false,
      slotOrder: slots(teamCount),
    })
    expect(plan.length).toBe(teamCount * rounds)
  })

  it('import normalization → canonical bundle has snapshot + provider metadata', () => {
    const bundle = buildCanonicalImportBundle(buildMinimalNormalizedImport())
    expect(bundle.settingsSnapshot.snapshotVersion).toBeTruthy()
    expect(bundle.settingsSnapshot.scoringSettings?.source).toBe('sleeper')
    expect(bundle.meta.provider).toBe('sleeper')
  })

  it('extended simulation: all fixtures stay green end-to-end (no DB)', () => {
    for (const fx of LEAGUE_ENGINE_SCENARIO_FIXTURES) {
      const r = runExtendedLeagueEngineSimulation(fx)
      expect(r.ok, fx.id).toBe(true)
      expect(r.extendedOk, fx.id).toBe(true)
    }
  })
})
