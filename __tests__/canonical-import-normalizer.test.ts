import { describe, expect, it } from 'vitest'

import { buildCanonicalImportBundle } from '@/lib/league-import/canonicalImportNormalizer'
import type { NormalizedImportResult } from '@/lib/league-import/types'

function baseNormalized(overrides: Partial<NormalizedImportResult> = {}): NormalizedImportResult {
  return {
    source: {
      source_provider: 'sleeper',
      source_league_id: 'abc',
      imported_at: new Date().toISOString(),
    },
    league: {
      name: 'Test League',
      sport: 'NFL',
      season: 2026,
      leagueSize: 12,
      rosterSize: 16,
      scoring: 'half ppr',
      isDynasty: false,
      league_type: 'redraft',
    },
    rosters: [],
    scoring: { scoring_format: 'half ppr', rules: [] },
    schedule: [],
    draft_picks: [],
    transactions: [],
    standings: [],
    player_map: {},
    coverage: {
      leagueSettings: { state: 'full' },
      currentRosters: { state: 'full' },
      historicalRosterSnapshots: { state: 'missing' },
      scoringSettings: { state: 'full' },
      playoffSettings: { state: 'partial' },
      currentStandings: { state: 'full' },
      currentSchedule: { state: 'full' },
      draftHistory: { state: 'missing' },
      tradeHistory: { state: 'missing' },
      previousSeasons: { state: 'missing' },
      playerIdentityMap: { state: 'full' },
    },
    ...overrides,
  }
}

describe('buildCanonicalImportBundle', () => {
  it('includes derivedFlags and importMetadata', () => {
    const b = buildCanonicalImportBundle(baseNormalized())
    expect(b.importMetadata.importSource).toBe('sleeper')
    expect(b.importMetadata.externalLeagueId).toBe('abc')
    expect(b.derivedFlags.dynasty).toBe(false)
    expect(b.settingsSnapshot.metadata?.importMetadata).toBeDefined()
  })

  it('detects devy signal from taxi rosters', () => {
    const b = buildCanonicalImportBundle(
      baseNormalized({
        rosters: [
          {
            source_team_id: 't1',
            source_manager_id: 'm1',
            owner_name: 'A',
            team_name: 'Team A',
            avatar_url: null,
            wins: 0,
            losses: 0,
            ties: 0,
            points_for: 0,
            player_ids: [],
            starter_ids: [],
            taxi_ids: ['p1'],
          },
        ],
      }),
    )
    expect(b.derivedFlags.devy).toBe(true)
  })
})
