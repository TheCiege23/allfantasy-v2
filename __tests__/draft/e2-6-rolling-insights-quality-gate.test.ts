import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isUsefulNFLRosterPayload } from '@/lib/rolling-insights'

/**
 * E.2.6 — Rolling Insights NFL provider quality gate.
 *
 * Validates the in-memory classifier (no network), plus static-source assertions
 * to confirm the fetchNFLRoster fallback wiring + audit/backfill plumbing.
 */

function fakePlayer(opts: {
  id?: string
  team?: string | null
  pos?: string
  hasSeason?: boolean
  fp?: number | null
  rushYd?: number | null
}) {
  const team = opts.team === undefined ? 'BUF' : opts.team
  return {
    id: opts.id ?? '1',
    player: 'Jane Doe',
    team: team
      ? { id: team, team, abbrv: team, mascot: '' }
      : null,
    number: null,
    position: opts.pos ?? 'WR',
    height: null,
    weight: null,
    college: null,
    dob: null,
    img: null,
    positionCategory: null,
    status: null,
    DK_salary: null,
    regularSeason: opts.hasSeason
      ? [
          {
            period: '2024',
            passing_yards: null,
            passing_touchdowns: null,
            passing_attempts: null,
            completions: null,
            interceptions: null,
            passerRating: null,
            rushing_yards: opts.rushYd ?? null,
            rushing_touchdowns: null,
            rushing_attempts: null,
            receptions: null,
            receiving_yards: null,
            receiving_touchdowns: null,
            targets: null,
            sacks: null,
            tackles: null,
            fumbles: null,
            fumbles_lost: null,
            DK_fantasy_points: opts.fp ?? null,
            DK_fantasy_points_per_game: null,
            games_played: null,
            snap_count_offense: null,
            snap_count_defense: null,
            field_goals_made: null,
            field_goals_attempted: null,
            extra_points_made: null,
            extra_points_attempted: null,
          },
        ]
      : [],
    postSeason: [],
  } as unknown as Parameters<typeof isUsefulNFLRosterPayload>[0] extends readonly (infer P)[] | null | undefined
    ? P
    : never
}

describe('E.2.6 — isUsefulNFLRosterPayload', () => {
  it('rejects empty / null payloads', () => {
    expect(isUsefulNFLRosterPayload(null).useful).toBe(false)
    expect(isUsefulNFLRosterPayload([]).useful).toBe(false)
    expect(isUsefulNFLRosterPayload(undefined).useful).toBe(false)
  })

  it('rejects the historical-shape REST payload (no team, no regularSeason)', () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      fakePlayer({ id: String(i), team: null, hasSeason: false }),
    )
    const q = isUsefulNFLRosterPayload(rows)
    expect(q.useful).toBe(false)
    expect(q.withRealTeam).toBe(0)
    expect(q.withRegularSeason).toBe(0)
    expect(q.reason).toMatch(/historical-shape/)
  })

  it('accepts payloads where teams are present even if regularSeason is empty', () => {
    // RI returns rosters via `nflRoster` but season splits via `player-stats/{year}/NFL`
    // — a stats-less roster is still useful for SportsPlayer + identity-map backfill.
    // The audit surfaces `withRegularSeason: 0` so the gap is visible without
    // gating REST↔GraphQL fallback on it.
    const rows = Array.from({ length: 50 }, (_, i) =>
      fakePlayer({ id: String(i), team: 'BUF', hasSeason: false }),
    )
    const q = isUsefulNFLRosterPayload(rows)
    expect(q.useful).toBe(true)
    expect(q.withRegularSeason).toBe(0)
    expect(q.reason).toMatch(/separate endpoint/)
  })

  it('rejects payloads where most rows have UNK team even if a few have stats', () => {
    const rows = [
      ...Array.from({ length: 95 }, (_, i) => fakePlayer({ id: String(i), team: 'UNK', hasSeason: false })),
      ...Array.from({ length: 5 }, (_, i) =>
        fakePlayer({ id: `s${i}`, team: 'BUF', hasSeason: true, fp: 100 }),
      ),
    ]
    expect(isUsefulNFLRosterPayload(rows).useful).toBe(false)
  })

  it('treats UNKNOWN and FA the same as UNK (placeholder teams)', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      fakePlayer({ id: String(i), team: i % 2 === 0 ? 'UNKNOWN' : 'FA', hasSeason: false }),
    )
    expect(isUsefulNFLRosterPayload(rows).withRealTeam).toBe(0)
  })

  it('accepts a real GraphQL-shaped roster (real teams + regularSeason blocks)', () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      fakePlayer({ id: String(i), team: 'BUF', hasSeason: true, fp: 200, rushYd: 50 }),
    )
    const q = isUsefulNFLRosterPayload(rows)
    expect(q.useful).toBe(true)
    expect(q.withRealTeam).toBe(30)
    expect(q.withRegularSeason).toBe(30)
    expect(q.withFantasyPoints).toBe(30)
  })

  it('accepts mixed payloads as long as ≥25% have a real team', () => {
    const rows = [
      ...Array.from({ length: 70 }, (_, i) => fakePlayer({ id: String(i), team: 'UNK', hasSeason: false })),
      ...Array.from({ length: 30 }, (_, i) =>
        fakePlayer({ id: `r${i}`, team: 'BUF', hasSeason: true, fp: 150 }),
      ),
    ]
    expect(isUsefulNFLRosterPayload(rows).useful).toBe(true)
  })
})

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('E.2.6 — fetchNFLRoster fallback wiring', () => {
  const src = read('lib/rolling-insights.ts')

  it('captures a per-call provider trace exposed via getLastFetchNFLRosterTrace', () => {
    expect(src).toMatch(/export function getLastFetchNFLRosterTrace/)
    expect(src).toMatch(/lastFetchNFLRosterTrace/)
  })

  it('falls through to GraphQL when REST returns rows but quality gate fails', () => {
    expect(src).toMatch(/REST NFL roster not useful/)
    // The trace must record finalSource so audit can show which path won.
    expect(src).toMatch(/trace\.finalSource = 'rest'/)
    expect(src).toMatch(/finalSource = gqlPlayers\.length \? 'graphql' : 'none'/)
  })

  it('still treats empty REST as the existing fallback case (does not regress)', () => {
    // Empty-payload branch is implicit: REST length===0 skips the useful-gate
    // and proceeds straight to GraphQL.
    expect(src).toMatch(/restRoster\.length > 0/)
  })

  it('exposes NFLRosterPayloadQuality + FetchNFLRosterTrace types for the audit', () => {
    expect(src).toMatch(/export interface NFLRosterPayloadQuality/)
    expect(src).toMatch(/export interface FetchNFLRosterTrace/)
  })
})

describe('E.2.6 — audit script reports provider selection', () => {
  const src = read('scripts/audit-nfl-player-stats-provider.ts')

  it('includes REST useful, GraphQL attempted/returned, and recommended source', () => {
    expect(src).toMatch(/REST useful:/)
    expect(src).toMatch(/GraphQL attempted:/)
    expect(src).toMatch(/recommended:/)
    expect(src).toMatch(/recommendedSource/)
  })

  it('reads the trace from getLastFetchNFLRosterTrace (not a parallel re-implementation)', () => {
    expect(src).toMatch(/getLastFetchNFLRosterTrace/)
  })

  it('accepts --league, --sport, --limit smoke-test flags as no-ops', () => {
    expect(src).toMatch(/--league=/)
    expect(src).toMatch(/--sport=/)
    expect(src).toMatch(/--limit=/)
  })
})

describe('E.2.6 — backfill script tracks provider source and respects --force', () => {
  const src = read('scripts/backfill-nfl-draft-stats.ts')

  it('records per-team provider source via providerSourceByTeam', () => {
    expect(src).toMatch(/providerSourceByTeam/)
    expect(src).toMatch(/getLastFetchNFLRosterTrace/)
  })

  it('does not overwrite existing rollingInsightsId rows unless --force is passed', () => {
    expect(src).toMatch(/--force/)
    expect(src).toMatch(/options: \{ force: boolean \}/)
    expect(src).toMatch(/existing\.rollingInsightsId && !options\.force/)
  })

  it('summarizes REST/GraphQL/none counts in the human-readable report', () => {
    expect(src).toMatch(/REST=\$\{restCount\}/)
    expect(src).toMatch(/GraphQL=\$\{gqlCount\}/)
  })

  it('accepts --league, --sport, --limit smoke-test flags as no-ops', () => {
    expect(src).toMatch(/--league=/)
    expect(src).toMatch(/--sport=/)
    expect(src).toMatch(/--limit=/)
  })
})
