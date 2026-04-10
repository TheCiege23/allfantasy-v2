import { describe, expect, it } from 'vitest'

import { deriveImportStatsFromNormalized } from '@/lib/rank/deriveImportStatsFromNormalized'
import type { NormalizedImportResult } from '@/lib/league-import/types'

function baseNormalized(overrides: Partial<NormalizedImportResult> = {}): NormalizedImportResult {
  return {
    source: {
      source_provider: 'espn',
      source_league_id: 'l1',
      imported_at: new Date().toISOString(),
    },
    league: {
      name: 'Test',
      sport: 'NFL',
      season: 2024,
      leagueSize: 12,
      rosterSize: 16,
      scoring: 'ppr',
      isDynasty: false,
      playoff_team_count: 6,
    },
    rosters: [
      {
        source_team_id: 't1',
        source_manager_id: 'm1',
        owner_name: 'You',
        team_name: 'My Team',
        avatar_url: null,
        wins: 8,
        losses: 5,
        ties: 0,
        points_for: 1200,
        points_against: 1100,
        player_ids: [],
        starter_ids: [],
      },
    ],
    scoring: null,
    schedule: [],
    draft_picks: [],
    transactions: [],
    standings: [
      {
        source_team_id: 't1',
        rank: 3,
        wins: 8,
        losses: 5,
        ties: 0,
        points_for: 1200,
        points_against: 1100,
      },
    ],
    player_map: {},
    coverage: {
      leagueSettings: { state: 'full' },
      currentRosters: { state: 'full' },
      historicalRosterSnapshots: { state: 'missing' },
      scoringSettings: { state: 'partial' },
      playoffSettings: { state: 'partial' },
      currentStandings: { state: 'full' },
      currentSchedule: { state: 'missing' },
      draftHistory: { state: 'missing' },
      tradeHistory: { state: 'missing' },
      previousSeasons: { state: 'missing' },
      playerIdentityMap: { state: 'missing' },
    },
    ...overrides,
  }
}

describe('deriveImportStatsFromNormalized', () => {
  it('uses viewer_source_team_id and playoff_team_count', () => {
    const row = baseNormalized().rosters[0]!
    const d = deriveImportStatsFromNormalized(
      baseNormalized({
        viewer_source_team_id: 't1',
        rosters: [
          row,
          {
            ...row,
            source_team_id: 't2',
            source_manager_id: 'm2',
            team_name: 'Other',
          },
        ],
        standings: [
          ...baseNormalized().standings,
          {
            source_team_id: 't2',
            rank: 1,
            wins: 10,
            losses: 2,
            ties: 0,
            points_for: 1300,
          },
        ],
      }),
    )
    expect(d).not.toBeNull()
    expect(d!.importWins).toBe(8)
    expect(d!.importMadePlayoffs).toBe(true)
    expect(d!.importWonChampionship).toBe(false)
    expect(d!.importFinalStanding).toBe(3)
  })

  it('treats rank 1 as championship', () => {
    const n = baseNormalized({
      viewer_source_team_id: 't1',
      standings: [{ ...baseNormalized().standings[0]!, rank: 1 }],
    })
    const d = deriveImportStatsFromNormalized(n)
    expect(d!.importWonChampionship).toBe(true)
  })

  it('resolves fantrax user roster by manager id prefix', () => {
    const base = baseNormalized({
      source: { source_provider: 'fantrax', source_league_id: 'x', imported_at: new Date().toISOString() },
      viewer_source_team_id: null,
      rosters: [
        {
          source_team_id: 'a',
          source_manager_id: 'fantrax-user:bob',
          owner_name: 'bob',
          team_name: 'A',
          avatar_url: null,
          wins: 2,
          losses: 10,
          ties: 0,
          points_for: 100,
          player_ids: [],
          starter_ids: [],
        },
        {
          source_team_id: 'b',
          source_manager_id: 'fantrax-manager:other',
          owner_name: 'x',
          team_name: 'B',
          avatar_url: null,
          wins: 10,
          losses: 2,
          ties: 0,
          points_for: 200,
          player_ids: [],
          starter_ids: [],
        },
      ],
      standings: [
        {
          source_team_id: 'a',
          rank: 12,
          wins: 2,
          losses: 10,
          ties: 0,
          points_for: 100,
        },
      ],
    })
    const d = deriveImportStatsFromNormalized(base)
    expect(d!.importWins).toBe(2)
    expect(d!.importFinalStanding).toBe(12)
  })

  it('returns null when viewer cannot be resolved', () => {
    const n = baseNormalized({
      viewer_source_team_id: null,
      rosters: [
        { ...baseNormalized().rosters[0]!, source_team_id: 'a' },
        { ...baseNormalized().rosters[0]!, source_team_id: 'b' },
      ],
    })
    expect(deriveImportStatsFromNormalized(n)).toBeNull()
  })
})
