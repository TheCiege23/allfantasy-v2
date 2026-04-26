import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  parseRollingInsightsStatsJson,
} from '@/lib/players/rolling-insights-stats-display'
import {
  buildNflDraftProjectionSplits,
  emptyNflDraftProjectionSplits,
} from '@/lib/draft/analytics/nfl-draft-pool-projection-splits'

/**
 * E.2.7 — RI player-stats endpoint normalization + backfill wiring.
 *
 * Pure-logic tests on the parsing path (no DB / network), plus static-source
 * assertions for the backfill script (Prisma + provider can't mount in jsdom).
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/** Real RI player-stats `regular_season` payload for Joe Burrow (truncated). */
const burrowRegularSeason = {
  sacks: 17,
  completions: 173,
  fumbles_lost: 0,
  games_played: 8,
  passer_rating: 100.7,
  passing_yards: 1809,
  rushing_yards: 41,
  passing_attempts: 259,
  rushing_attempts: 14,
  DK_fantasy_points: 145.46,
  passing_touchdowns: 17,
  rushing_touchdowns: 0,
  passing_interceptions: 5,
  DK_fantasy_points_per_game: 18.18,
}

/** Real RI player-stats payload for a WR with receiving fields. */
const wrRegularSeason = {
  receptions: 95,
  targets: 130,
  receiving_yards: 1450,
  receiving_touchdowns: 12,
  rushing_attempts: 1,
  rushing_yards: 8,
  rushing_touchdowns: 0,
  games_played: 16,
  DK_fantasy_points: 264.5,
  DK_fantasy_points_per_game: 16.53,
}

describe('E.2.7 — parseRollingInsightsStatsJson handles player-stats shape', () => {
  it('extracts passing splits including passing_interceptions (was unmapped before E.2.7)', () => {
    const parsed = parseRollingInsightsStatsJson(burrowRegularSeason)
    expect(parsed).not.toBeNull()
    expect(parsed!.passYd).toBe(1809)
    expect(parsed!.passTd).toBe(17)
    expect(parsed!.passCmp).toBe(173)
    expect(parsed!.passAtt).toBe(259)
    // The whole point of the E.2.7 fix — RI's player-stats endpoint uses
    // `passing_interceptions` instead of plain `interceptions`. Both must work.
    expect(parsed!.passInt).toBe(5)
  })

  it('still extracts plain `interceptions` (nflRoster shape), not just passing_interceptions', () => {
    const nflRosterShape = { ...burrowRegularSeason, passing_interceptions: undefined, interceptions: 7 }
    const parsed = parseRollingInsightsStatsJson(nflRosterShape)
    expect(parsed!.passInt).toBe(7)
  })

  it('extracts rushing splits', () => {
    const parsed = parseRollingInsightsStatsJson(burrowRegularSeason)
    expect(parsed!.rushAtt).toBe(14)
    expect(parsed!.rushYd).toBe(41)
    expect(parsed!.rushTd).toBe(0)
  })

  it('extracts receiving splits including targets', () => {
    const parsed = parseRollingInsightsStatsJson(wrRegularSeason)
    expect(parsed!.rec).toBe(95)
    expect(parsed!.tar).toBe(130)
    expect(parsed!.recYd).toBe(1450)
    expect(parsed!.recTd).toBe(12)
  })
})

describe('E.2.7 — buildNflDraftProjectionSplits with real RI stats', () => {
  it('hydrates rushing/receiving/passing for a QB stats payload', () => {
    const splits = buildNflDraftProjectionSplits({
      position: 'QB',
      statsJson: burrowRegularSeason,
      snapshotExpectedPoints: null,
      riSeasonFantasyPoints: 145.46,
      projectedPointsPerGame: 18.18,
    })
    expect(splits).not.toBeNull()
    expect(splits!.projectedPoints).toBe(145.46)
    expect(splits!.projectedPointsPerGame).toBe(18.18)
    expect(splits!.passing.yds).toBe(1809)
    expect(splits!.passing.td).toBe(17)
    expect(splits!.passing.int).toBe(5)
    expect(splits!.rushing.yds).toBe(41)
    // No receiving stats for a QB — should still be the parsed nulls/zeros, not undefined.
    expect(splits!.receiving.rec).toBeNull()
  })

  it('hydrates receiving for a WR stats payload', () => {
    const splits = buildNflDraftProjectionSplits({
      position: 'WR',
      statsJson: wrRegularSeason,
      snapshotExpectedPoints: null,
      riSeasonFantasyPoints: 264.5,
      projectedPointsPerGame: 16.53,
    })
    expect(splits!.receiving.rec).toBe(95)
    expect(splits!.receiving.tar).toBe(130)
    expect(splits!.receiving.yds).toBe(1450)
    expect(splits!.receiving.td).toBe(12)
    expect(splits!.passing.yds).toBeNull()
  })

  it('returns null splits when stats and projections are all missing', () => {
    const splits = buildNflDraftProjectionSplits({
      position: 'WR',
      statsJson: null,
      snapshotExpectedPoints: null,
      riSeasonFantasyPoints: null,
      projectedPointsPerGame: null,
    })
    // null means no splits — UI renders em dashes. Equivalent to emptyNflDraftProjectionSplits().
    expect(splits == null || splits.projectedPoints == null).toBe(true)
  })

  it('emptyNflDraftProjectionSplits returns all-null structure', () => {
    const e = emptyNflDraftProjectionSplits()
    expect(e.projectedPoints).toBeNull()
    expect(e.rushing.yds).toBeNull()
    expect(e.receiving.rec).toBeNull()
    expect(e.passing.int).toBeNull()
  })
})

describe('E.2.7 — fetchNFLPlayerStats helper wiring', () => {
  const src = read('lib/rolling-insights.ts')

  it('reuses rollingInsightsProvider (no parallel auth/REST stack)', () => {
    expect(src).toMatch(/export async function fetchNFLPlayerStats/)
    expect(src).toMatch(/rollingInsightsProvider\(\{/)
    expect(src).toMatch(/dataType: 'projections'/)
  })

  it('normalizes "YYYY-YYYY" season inputs to plain year for the URL path', () => {
    expect(src).toMatch(/seasonRaw\.includes\('-'\) \? seasonRaw\.split\('-'\)/)
  })

  it('exports RIPlayerSeasonStatsRow type so the backfill can consume it', () => {
    expect(src).toMatch(/export interface RIPlayerSeasonStatsRow/)
    expect(src).toMatch(/regular_season\?/)
  })

  it('filters out rows missing player_id or player', () => {
    expect(src).toMatch(/o\.player_id != null && typeof o\.player === 'string'/)
  })
})

describe('E.2.7 — backfill-nfl-player-season-stats script', () => {
  const src = read('scripts/backfill-nfl-player-season-stats.ts')

  it('defaults to dry-run; --apply switches to writes; --dry-run forces dry-run', () => {
    expect(src).toMatch(/apply: false/)
    expect(src).toMatch(/--apply/)
    expect(src).toMatch(/--dry-run/)
    expect(src).toMatch(/isApply = args\.apply && !args\.dryRun/)
  })

  it('writes to PlayerSeasonStats with the exact natural key the analytics loader queries', () => {
    expect(src).toMatch(/sport_playerId_season_seasonType_source/)
    expect(src).toMatch(/source: 'rolling_insights'/)
    expect(src).toMatch(/seasonType: 'regular'/)
    expect(src).toMatch(/sport: 'NFL'/)
  })

  it('matches by RI id first, then conservatively by normalized name', () => {
    expect(src).toMatch(/idByRiId\.has\(riId\)/)
    expect(src).toMatch(/matchedVia = 'id'/)
    expect(src).toMatch(/matchedVia = 'name'/)
    expect(src).toMatch(/candidates\.length === 1/)
    expect(src).toMatch(/ambiguousNameRejected/)
  })

  it('writes RI `regular_season` JSON verbatim to PlayerSeasonStats.stats', () => {
    expect(src).toMatch(/stats: \(rs \?\? \{\}\) as Prisma\.InputJsonValue/)
  })

  it('extracts DK_fantasy_points + DK_fantasy_points_per_game + games_played', () => {
    expect(src).toMatch(/'DK_fantasy_points'/)
    expect(src).toMatch(/'DK_fantasy_points_per_game'/)
    expect(src).toMatch(/'games_played'/)
  })

  it('refuses to overwrite existing nonzero PlayerSeasonStats.fantasyPoints unless --force', () => {
    expect(src).toMatch(/existing\.fantasyPoints != null && !args\.force/)
    expect(src).toMatch(/skippedExisting/)
  })

  it('resolves --teams filter via team_id (not full team name)', () => {
    expect(src).toMatch(/fetchNFLTeams/)
    expect(src).toMatch(/teamIdSet\.has\(String\(r\.team_id\)\)/)
  })

  it('reports raw provider samples for the human report', () => {
    expect(src).toMatch(/rawSamples/)
    expect(src).toMatch(/Raw provider samples/)
  })

  it('accepts --season, --teams, --limit, --json, --force, --dry-run, --league, --sport', () => {
    expect(src).toMatch(/--season=/)
    expect(src).toMatch(/--teams=/)
    expect(src).toMatch(/--limit=/)
    expect(src).toMatch(/--json/)
    expect(src).toMatch(/--force/)
    expect(src).toMatch(/--dry-run/)
    expect(src).toMatch(/--league=/)
    expect(src).toMatch(/--sport=/)
  })
})

describe('E.2.7 — package.json wires the script', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

  it('exposes backfill:nfl-player-season-stats with --env-file and the audit preload', () => {
    expect(pkg.scripts['backfill:nfl-player-season-stats']).toBeDefined()
    expect(pkg.scripts['backfill:nfl-player-season-stats']).toMatch(/backfill-nfl-player-season-stats\.ts/)
    expect(pkg.scripts['backfill:nfl-player-season-stats']).toMatch(/--env-file=\.env/)
    expect(pkg.scripts['backfill:nfl-player-season-stats']).toMatch(/_audit-preload\.cjs/)
  })
})
