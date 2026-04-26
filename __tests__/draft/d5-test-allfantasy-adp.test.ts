import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  aggregateAdp,
  applyTrends,
  buildContextHash,
  buildPlayerKey,
  isPickValidForAdp,
  snapshotKey,
  type AggregatablePick,
  type DraftContext,
} from '@/lib/adp/computeAllFantasyAdp'

/**
 * D.5-test — pure aggregation tests (math, filtering, context isolation, trends)
 * plus static-source assertions for the seed + recompute scripts and the API
 * route wiring. The Prisma write path is exercised by the manual smoke at the
 * bottom of the slice report.
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const NFL_PPR_REDRAFT_12: DraftContext = {
  sport: 'NFL',
  leagueType: 'redraft',
  draftType: 'snake',
  scoringFormat: 'ppr',
  rosterFormat: 'standard',
  teamCount: 12,
  season: '2025',
}

const NFL_PPR_DYNASTY_12: DraftContext = {
  ...NFL_PPR_REDRAFT_12,
  leagueType: 'dynasty',
}

function pick(over: Partial<AggregatablePick> & { playerName: string; overall: number }): AggregatablePick {
  return {
    position: 'RB',
    round: Math.ceil(over.overall / 12),
    roundPick: ((over.overall - 1) % 12) + 1,
    pickedAt: new Date('2025-04-25T12:00:00Z'),
    context: NFL_PPR_REDRAFT_12,
    draftMode: 'real',
    ...over,
  }
}

describe('D.5-test — buildPlayerKey + buildContextHash', () => {
  it('player key normalizes name + position case-insensitively', () => {
    expect(buildPlayerKey('Bijan Robinson', 'RB')).toBe('bijan robinson|rb')
    expect(buildPlayerKey('BIJAN ROBINSON', 'rb')).toBe('bijan robinson|rb')
  })

  it('context hash is deterministic', () => {
    const a = buildContextHash(NFL_PPR_REDRAFT_12)
    const b = buildContextHash({ ...NFL_PPR_REDRAFT_12 })
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(8)
  })

  it('context hash changes when ANY context field changes — separation is strict', () => {
    const base = buildContextHash(NFL_PPR_REDRAFT_12)
    expect(buildContextHash(NFL_PPR_DYNASTY_12)).not.toBe(base)
    expect(buildContextHash({ ...NFL_PPR_REDRAFT_12, scoringFormat: 'standard' })).not.toBe(base)
    expect(buildContextHash({ ...NFL_PPR_REDRAFT_12, teamCount: 10 })).not.toBe(base)
    expect(buildContextHash({ ...NFL_PPR_REDRAFT_12, season: '2024' })).not.toBe(base)
  })
})

describe('D.5-test — aggregateAdp computes the right averages', () => {
  it('averages overall pick correctly across multiple drafts of the same player', () => {
    const picks: AggregatablePick[] = [
      pick({ playerName: 'Bijan Robinson', overall: 1 }),
      pick({ playerName: 'Bijan Robinson', overall: 2 }),
      pick({ playerName: 'Bijan Robinson', overall: 3 }),
      pick({ playerName: 'Bijan Robinson', overall: 1 }),
      pick({ playerName: 'Bijan Robinson', overall: 2 }),
    ]
    const out = aggregateAdp(picks)
    expect(out.length).toBe(1)
    expect(out[0]!.sampleSize).toBe(5)
    expect(out[0]!.averageOverallPick).toBe(1.8)
    expect(out[0]!.minOverallPick).toBe(1)
    expect(out[0]!.maxOverallPick).toBe(3)
  })

  it('separates contexts — same player in two contexts produces TWO snapshots', () => {
    const picks: AggregatablePick[] = [
      pick({ playerName: 'Bijan Robinson', overall: 1, context: NFL_PPR_REDRAFT_12 }),
      pick({ playerName: 'Bijan Robinson', overall: 5, context: NFL_PPR_DYNASTY_12 }),
    ]
    const out = aggregateAdp(picks)
    expect(out.length).toBe(2)
    const redraft = out.find((s) => s.context.leagueType === 'redraft')!
    const dynasty = out.find((s) => s.context.leagueType === 'dynasty')!
    expect(redraft.averageOverallPick).toBe(1)
    expect(dynasty.averageOverallPick).toBe(5)
  })

  it('separates draftMode — real vs mock vs test produce separate snapshots for the same player', () => {
    const picks: AggregatablePick[] = [
      pick({ playerName: 'Bijan Robinson', overall: 1, draftMode: 'real' }),
      pick({ playerName: 'Bijan Robinson', overall: 4, draftMode: 'mock' }),
      pick({ playerName: 'Bijan Robinson', overall: 2, draftMode: 'test' }),
    ]
    const out = aggregateAdp(picks)
    expect(out.length).toBe(3)
    const modes = out.map((s) => s.draftMode).sort()
    expect(modes).toEqual(['mock', 'real', 'test'])
  })

  it('rejects picks with missing/invalid name or non-positive overall', () => {
    const picks: AggregatablePick[] = [
      pick({ playerName: '', overall: 1 }),
      pick({ playerName: 'Valid Player', overall: 0 }),
      pick({ playerName: 'Valid Player', overall: -3 }),
      pick({ playerName: 'Valid Player', overall: Number.NaN }),
      pick({ playerName: 'Real Pick', overall: 5 }),
    ]
    const out = aggregateAdp(picks)
    expect(out.length).toBe(1)
    expect(out[0]!.playerName).toBe('Real Pick')
  })

  it('computes averageRound + averagePickInRound correctly for snake drafts', () => {
    // 12-team snake. Player drafted at overall 13, 14 (round 2, picks 1 and 2).
    const picks: AggregatablePick[] = [
      pick({ playerName: 'X', overall: 13, round: 2, roundPick: 1 }),
      pick({ playerName: 'X', overall: 14, round: 2, roundPick: 2 }),
    ]
    const out = aggregateAdp(picks)
    expect(out[0]!.averageRound).toBe(2)
    expect(out[0]!.averagePickInRound).toBe(1.5)
  })

  it('matches the spec example (Bijan ≈ 1.02 from picks 1.01, 1.02, 1.03, 1.01, 1.02)', () => {
    const picks: AggregatablePick[] = [
      pick({ playerName: 'Bijan Robinson', overall: 1 }),
      pick({ playerName: 'Bijan Robinson', overall: 2 }),
      pick({ playerName: 'Bijan Robinson', overall: 3 }),
      pick({ playerName: 'Bijan Robinson', overall: 1 }),
      pick({ playerName: 'Bijan Robinson', overall: 2 }),
    ]
    const out = aggregateAdp(picks)
    // Average is 1.8 ≈ "1.02" rank semantics in the user's notation (round 1, pick ~2).
    expect(out[0]!.averagePickInRound).toBe(1.8)
  })
})

describe('D.5-test — isPickValidForAdp filtering rules', () => {
  it('rejects undone / corrected / deleted picks regardless of draftMode', () => {
    expect(isPickValidForAdp({ source: 'undone', draftMode: 'real' })).toBe(false)
    expect(isPickValidForAdp({ source: 'corrected', draftMode: 'real' })).toBe(false)
    expect(isPickValidForAdp({ source: 'deleted', draftMode: 'real' })).toBe(false)
  })

  it('excludes test-mode picks by default (production AI ADP isolation)', () => {
    expect(isPickValidForAdp({ draftMode: 'test' })).toBe(false)
  })

  it('allows test-mode picks when includeTest=true (harness opt-in)', () => {
    expect(isPickValidForAdp({ draftMode: 'test' }, { includeTest: true })).toBe(true)
  })

  it('rejects rookie/devy/dispersal asset types — only `player` picks count for ADP', () => {
    expect(isPickValidForAdp({ assetType: 'rookie_pick', draftMode: 'real' })).toBe(false)
    expect(isPickValidForAdp({ assetType: 'devy_pick', draftMode: 'real' })).toBe(false)
    expect(isPickValidForAdp({ assetType: 'dispersal_asset', draftMode: 'real' })).toBe(false)
    expect(isPickValidForAdp({ assetType: 'pick_slot', draftMode: 'real' })).toBe(false)
  })

  it('accepts `player` and null asset types', () => {
    expect(isPickValidForAdp({ assetType: 'player', draftMode: 'real' })).toBe(true)
    expect(isPickValidForAdp({ assetType: null, draftMode: 'real' })).toBe(true)
    expect(isPickValidForAdp({ assetType: undefined, draftMode: 'real' })).toBe(true)
  })

  it('user source (the default) accepted', () => {
    expect(isPickValidForAdp({ source: 'user', draftMode: 'real' })).toBe(true)
  })

  it('test_seed source on draftMode=test is excluded by default but included with includeTest', () => {
    expect(isPickValidForAdp({ source: 'test_seed', draftMode: 'test' })).toBe(false)
    expect(isPickValidForAdp({ source: 'test_seed', draftMode: 'test' }, { includeTest: true })).toBe(true)
  })
})

describe('D.5-test — applyTrends computes ±delta vs prior snapshots', () => {
  it('returns positive trend when the player has moved UP the board (lower avg pick now)', () => {
    const current = [
      {
        playerKey: 'bijan robinson|rb',
        playerName: 'Bijan Robinson',
        context: NFL_PPR_REDRAFT_12,
        draftMode: 'real' as const,
        contextHash: buildContextHash(NFL_PPR_REDRAFT_12),
        sampleSize: 25,
        averageOverallPick: 1.5,
        averageRound: 1,
        averagePickInRound: 1.5,
        minOverallPick: 1,
        maxOverallPick: 3,
        standardDeviation: null,
        sevenDayTrend: null,
        thirtyDayTrend: null,
      },
    ]
    const k = snapshotKey({ playerKey: current[0]!.playerKey, contextHash: current[0]!.contextHash, draftMode: 'real' })
    const out = applyTrends(current, {
      sevenDay: new Map([[k, 2.5]]),
      thirtyDay: new Map([[k, 4.0]]),
    })
    // Was 2.5 a week ago, now 1.5 → moved up by 1.0
    expect(out[0]!.sevenDayTrend).toBe(1)
    expect(out[0]!.thirtyDayTrend).toBe(2.5)
  })

  it('returns null when no prior snapshot exists (new player or first snapshot)', () => {
    const current = [
      {
        playerKey: 'bijan robinson|rb',
        playerName: 'Bijan Robinson',
        context: NFL_PPR_REDRAFT_12,
        draftMode: 'real' as const,
        contextHash: buildContextHash(NFL_PPR_REDRAFT_12),
        sampleSize: 5,
        averageOverallPick: 2,
        averageRound: 1,
        averagePickInRound: 2,
        minOverallPick: 1,
        maxOverallPick: 3,
        standardDeviation: null,
        sevenDayTrend: null,
        thirtyDayTrend: null,
      },
    ]
    const out = applyTrends(current, { sevenDay: new Map(), thirtyDay: new Map() })
    expect(out[0]!.sevenDayTrend).toBeNull()
    expect(out[0]!.thirtyDayTrend).toBeNull()
  })
})

describe('D.5-test — seed script wiring', () => {
  const src = read('scripts/seed-test-adp-drafts.ts')

  it('marks seeded picks with source="test_seed" and sessionKind="test"', () => {
    expect(src).toMatch(/source: 'test_seed'/)
    expect(src).toMatch(/sessionKind: 'test'/)
  })

  it('uses a deterministic PRNG seeded by --seed for reproducible drafts', () => {
    expect(src).toMatch(/Mulberry32/)
    expect(src).toMatch(/--seed=/)
  })

  it('cleanup branch deletes only the seeded leagues (TEST_LEAGUE_NAME_PREFIX)', () => {
    expect(src).toMatch(/TEST_LEAGUE_NAME_PREFIX = 'AF Test ADP'/)
    expect(src).toMatch(/--cleanup/)
    expect(src).toMatch(/startsWith: TEST_LEAGUE_NAME_PREFIX/)
  })

  it('default mode is dry-run; --apply required to write', () => {
    expect(src).toMatch(/apply: false/)
    expect(src).toMatch(/--apply/)
    expect(src).toMatch(/Re-run with --apply to write/)
  })

  it('uses real NFL player names, not generic placeholders', () => {
    expect(src).toMatch(/Bijan Robinson/)
    expect(src).toMatch(/Ja'Marr Chase/)
    expect(src).toMatch(/Joe Burrow/)
    expect(src).toMatch(/Patrick Mahomes/)
  })
})

describe('D.5-test — recompute service wiring', () => {
  // D.5-scheduler — the script now delegates to a reusable lib so the cron
  // route can call the same recompute. The assertions below moved with the
  // logic into lib/adp/recomputeAllFantasyAdp.ts.
  const helperSrc = read('lib/adp/recomputeAllFantasyAdp.ts')
  const scriptSrc = read('scripts/recompute-allfantasy-adp.ts')

  it('helper imports the pure aggregation lib (no inline math)', () => {
    expect(helperSrc).toMatch(/from '@\/lib\/adp\/computeAllFantasyAdp'/)
    expect(helperSrc).toMatch(/aggregateAdp/)
    expect(helperSrc).toMatch(/isPickValidForAdp/)
    expect(helperSrc).toMatch(/applyTrends/)
  })

  it('script delegates to the helper (no duplicate math left in scripts/)', () => {
    expect(scriptSrc).toMatch(/from '\.\.\/lib\/adp\/recomputeAllFantasyAdp'/)
    expect(scriptSrc).toMatch(/recomputeAllFantasyAdp/)
  })

  it('excludes test-mode picks by default; --include-test opens the gate', () => {
    expect(scriptSrc).toMatch(/--include-test/)
    expect(helperSrc).toMatch(/includeTest/)
  })

  it('derives draftMode from sessionKind (mock | test) + pick.source (test_seed)', () => {
    expect(helperSrc).toMatch(/sessionKind === 'mock'/)
    expect(helperSrc).toMatch(/sessionKind === 'test' \|\| \(row\.source \?\? ''\)\.toLowerCase\(\) === 'test_seed'/)
  })

  it('writes upserts keyed by (playerKey, contextHash, draftMode)', () => {
    expect(helperSrc).toMatch(/playerKey_contextHash_draftMode/)
  })

  it('reports filtered counts split by reason (source, asset, mode)', () => {
    expect(helperSrc).toMatch(/filteredOutBySource/)
    expect(helperSrc).toMatch(/filteredOutByAsset/)
    expect(helperSrc).toMatch(/filteredOutByMode/)
  })
})

describe('D.5-test — readSnapshotForLeague helper', () => {
  const src = read('lib/adp/readSnapshotForLeague.ts')

  it('is server-only (never callable from a client component)', () => {
    expect(src).toMatch(/import 'server-only'/)
  })

  it('does NOT fall back to external/market ADP — returns empty entries when nothing matches', () => {
    // No call to the legacy/external ADP service.
    expect(src).not.toMatch(/getAiAdpForLeague\s*\(/)
    expect(src).not.toMatch(/import.*from.*['"](?:.*\/)?ai-adp-engine['"]/)
    // Empty-result branch is explicit (no hidden fallback).
    expect(src).toMatch(/return \{[\s\S]*?entries: \[\][\s\S]*?\}/)
  })

  it('reads only the requested context + draftMode (no cross-context bleed)', () => {
    expect(src).toMatch(/contextHash, draftMode/)
  })

  it('flags low-sample entries below threshold 10', () => {
    expect(src).toMatch(/LOW_SAMPLE_THRESHOLD = 10/)
    expect(src).toMatch(/lowSample: r\.sampleSize < LOW_SAMPLE_THRESHOLD/)
  })
})

describe('D.5-test — /api/leagues/[leagueId]/ai-adp wiring', () => {
  const src = read('app/api/leagues/[leagueId]/ai-adp/route.ts')

  it('accepts ?source=allfantasy to opt into the new snapshot table', () => {
    expect(src).toMatch(/sourceParam === 'allfantasy'/)
    expect(src).toMatch(/readAllFantasyAdpForLeague/)
  })

  it('accepts ?draftMode=test (or mock) for harness validation', () => {
    expect(src).toMatch(/draftModeParam === 'test'/)
  })

  it('default behavior unchanged — legacy `getAiAdpForLeague` still runs when no source param', () => {
    expect(src).toMatch(/getAiAdpForLeague\(sport, isDynasty, formatKey\)/)
  })
})

describe('D.5-test — package.json wires the new scripts', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

  it('exposes seed:test-adp-drafts', () => {
    expect(pkg.scripts['seed:test-adp-drafts']).toBeDefined()
    expect(pkg.scripts['seed:test-adp-drafts']).toMatch(/seed-test-adp-drafts\.ts/)
    expect(pkg.scripts['seed:test-adp-drafts']).toMatch(/--env-file=\.env/)
  })

  it('exposes recompute:allfantasy-adp', () => {
    expect(pkg.scripts['recompute:allfantasy-adp']).toBeDefined()
    expect(pkg.scripts['recompute:allfantasy-adp']).toMatch(/recompute-allfantasy-adp\.ts/)
  })
})
