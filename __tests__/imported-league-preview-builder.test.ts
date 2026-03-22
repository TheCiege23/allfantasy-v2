import { describe, expect, it } from 'vitest'
import { buildImportedLeaguePreview } from '@/lib/league-import/ImportedLeaguePreviewBuilder'
import type { NormalizedImportResult } from '@/lib/league-import/types'

function buildBaseNormalized(overrides?: Partial<NormalizedImportResult>): NormalizedImportResult {
  return {
    source: {
      source_provider: 'sleeper',
      source_league_id: 'src-lg-1',
      imported_at: new Date('2026-03-21T00:00:00Z').toISOString(),
    },
    league: {
      name: 'Imported League',
      sport: 'NFL',
      season: 2026,
      leagueSize: 12,
      rosterSize: 20,
      scoring: 'ppr',
      isDynasty: true,
      playoff_team_count: 6,
    },
    rosters: [
      {
        source_team_id: 'r1',
        source_manager_id: 'm1',
        owner_name: 'Manager One',
        team_name: 'KC',
        avatar_url: null,
        wins: 8,
        losses: 5,
        ties: 0,
        points_for: 1234.56,
        player_ids: ['p1'],
        starter_ids: ['p1'],
        reserve_ids: [],
        taxi_ids: [],
      },
    ],
    scoring: { scoring_format: 'ppr', rules: [] },
    schedule: [],
    draft_picks: [],
    transactions: [],
    standings: [],
    player_map: {},
    coverage: {
      leagueSettings: { state: 'full', count: 1 },
      currentRosters: { state: 'full', count: 1 },
      historicalRosterSnapshots: { state: 'partial', count: 0 },
      scoringSettings: { state: 'full', count: 1 },
      playoffSettings: { state: 'full', count: 1 },
      currentStandings: { state: 'partial', count: 0 },
      currentSchedule: { state: 'partial', count: 0 },
      draftHistory: { state: 'missing', count: 0 },
      tradeHistory: { state: 'missing', count: 0 },
      previousSeasons: { state: 'missing', count: 0 },
      playerIdentityMap: { state: 'partial', count: 0 },
    },
    ...overrides,
  }
}

describe('buildImportedLeaguePreview manager/team identity', () => {
  it('derives team logo fallback for valid sport abbreviation when provider logo is missing', () => {
    const normalized = buildBaseNormalized()
    const preview = buildImportedLeaguePreview(normalized)

    expect(preview.managers).toHaveLength(1)
    expect(preview.managers[0]).toEqual(
      expect.objectContaining({
        teamName: 'KC',
        teamAbbreviation: 'KC',
        teamLogo: expect.stringContaining('/nfl/500/kc.png'),
        managerAvatar: null,
      })
    )
  })

  it('uses provider team logo when avatar/logo is provided', () => {
    const normalized = buildBaseNormalized({
      league: {
        name: 'Imported League',
        sport: 'NBA',
        season: 2026,
        leagueSize: 10,
        rosterSize: 15,
        scoring: 'points',
        isDynasty: false,
      },
      rosters: [
        {
          source_team_id: 'r1',
          source_manager_id: 'm1',
          owner_name: 'Manager One',
          team_name: 'LAL',
          avatar_url: 'https://cdn.example/team-lal.png',
          wins: 12,
          losses: 3,
          ties: 0,
          points_for: 987.65,
          player_ids: ['p1'],
          starter_ids: ['p1'],
          reserve_ids: [],
          taxi_ids: [],
        },
      ],
    })
    const preview = buildImportedLeaguePreview(normalized)

    expect(preview.managers[0]).toEqual(
      expect.objectContaining({
        teamName: 'LAL',
        teamAbbreviation: 'LAL',
        teamLogo: 'https://cdn.example/team-lal.png',
        managerAvatar: 'https://cdn.example/team-lal.png',
      })
    )
  })
})
