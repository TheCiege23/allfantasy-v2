import { describe, expect, it } from 'vitest'
import { deriveEvidenceRowsFromImport } from '@/lib/legacy-score-engine/importedFactsToEvidence'
import type { NormalizedImportResult } from '@/lib/league-import/types'

function baseNormalized(overrides: Partial<NormalizedImportResult> = {}): NormalizedImportResult {
  return {
    source: {
      source_provider: 'sleeper',
      source_league_id: 'L1',
      source_season_id: '2025',
      import_batch_id: 'batch-1',
      imported_at: new Date().toISOString(),
    },
    league: {
      name: 'Test',
      sport: 'nfl',
      season: 2025,
      leagueSize: 12,
      rosterSize: null,
      scoring: null,
    } as unknown as NormalizedImportResult['league'],
    rosters: [],
    scoring: null,
    schedule: [],
    draft_picks: [],
    transactions: [],
    standings: [],
    player_map: {},
    coverage: {} as NormalizedImportResult['coverage'],
    ...overrides,
  }
}

describe('deriveEvidenceRowsFromImport (Phase 3.1)', () => {
  it('returns [] when there are no standings and no previous seasons', () => {
    expect(deriveEvidenceRowsFromImport(baseNormalized())).toEqual([])
  })

  it('derives win_pct per team (clamped 0..100)', () => {
    const rows = deriveEvidenceRowsFromImport(
      baseNormalized({
        standings: [
          { source_team_id: 't1', rank: 1, wins: 12, losses: 2, ties: 0, points_for: 1600 },
          { source_team_id: 't2', rank: 5, wins: 7, losses: 7, ties: 0, points_for: 1400 },
        ],
      }),
    )
    const winPct = rows.filter((r) => r.evidenceType === 'win_pct')
    expect(winPct).toHaveLength(2)
    const t1 = winPct.find((r) => r.entityId === 't1')!
    expect(Math.round(t1.value)).toBe(86) // 12/14 ≈ 85.7%
    expect(t1.sport).toBe('nfl')
    expect(t1.sourceReference).toBe('sleeper:L1')
  })

  it('marks rank=1 teams with a championships row (value 100)', () => {
    const rows = deriveEvidenceRowsFromImport(
      baseNormalized({
        standings: [
          { source_team_id: 't1', rank: 1, wins: 12, losses: 2, ties: 0, points_for: 1600 },
          { source_team_id: 't2', rank: 2, wins: 10, losses: 4, ties: 0, points_for: 1550 },
        ],
      }),
    )
    const champs = rows.filter((r) => r.evidenceType === 'championships')
    expect(champs).toHaveLength(1)
    expect(champs[0].entityId).toBe('t1')
    expect(champs[0].value).toBe(100)
  })

  it('marks top-N ranks as playoff_appearances when playoffTeamCount is provided', () => {
    const rows = deriveEvidenceRowsFromImport(
      baseNormalized({
        standings: [
          { source_team_id: 't1', rank: 1, wins: 12, losses: 2, ties: 0, points_for: 1600 },
          { source_team_id: 't4', rank: 4, wins: 8, losses: 6, ties: 0, points_for: 1500 },
          { source_team_id: 't7', rank: 7, wins: 6, losses: 8, ties: 0, points_for: 1400 },
        ],
      }),
      { playoffTeamCount: 6 },
    )
    const playoff = rows.filter((r) => r.evidenceType === 'playoff_appearances')
    expect(playoff.map((r) => r.entityId).sort()).toEqual(['t1', 't4'])
  })

  it('emits no playoff_appearances when playoffTeamCount is null/absent', () => {
    const rows = deriveEvidenceRowsFromImport(
      baseNormalized({
        standings: [
          { source_team_id: 't1', rank: 1, wins: 12, losses: 2, ties: 0, points_for: 1600 },
        ],
      }),
    )
    expect(rows.filter((r) => r.evidenceType === 'playoff_appearances')).toHaveLength(0)
  })

  it('emits staying_power scaled by previous-season chain length (10 seasons = 100)', () => {
    const rows = deriveEvidenceRowsFromImport(
      baseNormalized({
        standings: [
          { source_team_id: 't1', rank: 3, wins: 9, losses: 5, ties: 0, points_for: 1500 },
        ],
      }),
      { previousSeasonCount: 4 },
    )
    const sp = rows.filter((r) => r.evidenceType === 'staying_power')
    expect(sp).toHaveLength(1)
    expect(sp[0].value).toBe(40) // 4 * 10
    expect(sp[0].entityId).toBe('t1')
  })
})
