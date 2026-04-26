import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  aggregateAdp,
  buildPlayerKey,
  buildContextHash,
  type AggregatablePick,
  type DraftContext,
} from '@/lib/adp/computeAllFantasyAdp'

/**
 * D.5 — AllFantasy AI ADP integration. Pure-logic coverage of the new
 * `standardDeviation` math, plus static-source assertions for the three
 * integration touchpoints D.5 added on top of D.5-test:
 *   1. Pool resolver overlay (server-side join from AllFantasyAdpSnapshot).
 *   2. SleeperPoolTable cell tooltip + low-sample indicator.
 *   3. Recompute script writes the std-dev field.
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const PPR_REDRAFT_12: DraftContext = {
  sport: 'NFL',
  leagueType: 'redraft',
  draftType: 'snake',
  scoringFormat: 'ppr',
  rosterFormat: 'standard',
  teamCount: 12,
  season: '2025',
}

function pick(over: Partial<AggregatablePick> & { playerName: string; overall: number }): AggregatablePick {
  return {
    position: 'RB',
    round: Math.ceil(over.overall / 12),
    roundPick: ((over.overall - 1) % 12) + 1,
    pickedAt: new Date('2025-04-25T12:00:00Z'),
    context: PPR_REDRAFT_12,
    draftMode: 'real',
    ...over,
  }
}

describe('D.5 — standardDeviation in aggregateAdp', () => {
  it('returns null when sample size is 0 or 1', () => {
    expect(aggregateAdp([])).toEqual([])
    const single = aggregateAdp([pick({ playerName: 'X', overall: 5 })])
    expect(single[0]!.standardDeviation).toBeNull()
  })

  it('computes population std dev correctly', () => {
    // Picks 1, 1, 1, 5, 5, 5 → mean 3, variance ((4)^2*3 + (2)^2*3)/6 = (48+12)/6 = wait
    // Actually: (1-3)^2*3 + (5-3)^2*3 = 4*3 + 4*3 = 24; variance 24/6 = 4; stddev 2.
    const picks = [
      pick({ playerName: 'X', overall: 1 }),
      pick({ playerName: 'X', overall: 1 }),
      pick({ playerName: 'X', overall: 1 }),
      pick({ playerName: 'X', overall: 5 }),
      pick({ playerName: 'X', overall: 5 }),
      pick({ playerName: 'X', overall: 5 }),
    ]
    const out = aggregateAdp(picks)
    expect(out[0]!.standardDeviation).toBe(2)
  })

  it('zero std dev when all picks are identical', () => {
    const picks = [
      pick({ playerName: 'X', overall: 7 }),
      pick({ playerName: 'X', overall: 7 }),
      pick({ playerName: 'X', overall: 7 }),
    ]
    expect(aggregateAdp(picks)[0]!.standardDeviation).toBe(0)
  })

  it('rounds std dev to 2 decimal places', () => {
    // overalls 1, 2, 3, 4 → mean 2.5, variance (2.25+0.25+0.25+2.25)/4 = 5/4 = 1.25 → stddev ≈ 1.118
    const picks = [
      pick({ playerName: 'X', overall: 1 }),
      pick({ playerName: 'X', overall: 2 }),
      pick({ playerName: 'X', overall: 3 }),
      pick({ playerName: 'X', overall: 4 }),
    ]
    const sd = aggregateAdp(picks)[0]!.standardDeviation
    expect(sd).toBe(1.12)
  })
})

describe('D.5 — pool resolver overlays AI ADP from snapshot', () => {
  const src = read('lib/draft-room/getResolvedDraftPoolForLeague.ts')

  it('imports the context-hash builder from lib/adp/computeAllFantasyAdp', () => {
    expect(src).toMatch(/await import\('@\/lib\/adp\/computeAllFantasyAdp'\)/)
    expect(src).toMatch(/buildContextHash/)
  })

  it('queries AllFantasyAdpSnapshot scoped to (contextHash, draftMode="real")', () => {
    expect(src).toMatch(/prisma\.allFantasyAdpSnapshot\.findMany/)
    expect(src).toMatch(/where: \{ contextHash: ctxHash, draftMode: 'real' \}/)
  })

  it('overlays aiAdp / aiAdpSampleSize / aiAdpLowSample / trends / stddev on each row', () => {
    expect(src).toMatch(/aiAdp: aiAdpHit\.adp/)
    expect(src).toMatch(/aiAdpSampleSize: aiAdpHit\.sampleSize/)
    expect(src).toMatch(/aiAdpLowSample: aiAdpHit\.lowSample/)
    expect(src).toMatch(/aiAdpSevenDayTrend: aiAdpHit\.sevenDayTrend/)
    expect(src).toMatch(/aiAdpThirtyDayTrend: aiAdpHit\.thirtyDayTrend/)
    expect(src).toMatch(/aiAdpStandardDeviation: aiAdpHit\.standardDeviation/)
  })

  it('explicitly sets aiAdp to null when no snapshot row matches (no external fallback)', () => {
    expect(src).toMatch(/: \{ aiAdp: null \}/)
  })

  it('uses the same playerKey shape as the recompute script (lower(name) | lower(position))', () => {
    expect(src).toMatch(/normalizeDraftPoolNameForDedupe\(name \?\? ''\)/)
    expect(src).toMatch(/normalizeKeyPart\(position \?\? ''\)/)
    expect(src).toMatch(/aiAdpByPlayerKey\.get\(/)
  })

  it('threshold for low-sample is 10 (matches readSnapshotForLeague)', () => {
    expect(src).toMatch(/LOW_SAMPLE_THRESHOLD = 10/)
  })

  it('league context join includes season + scoring + isDynasty + leagueSize', () => {
    expect(src).toMatch(/season: true/)
    expect(src).toMatch(/scoring: true/)
    expect(src).toMatch(/isDynasty: true/)
    expect(src).toMatch(/leagueSize: true/)
  })

  it('does not import or call any external/market ADP source for the AI ADP column', () => {
    // The resolver may still load market ADP for the non-AI ADP column; what matters is
    // the AI ADP overlay block doesn't reach for those values when the snapshot is empty.
    const aiBlockStart = src.indexOf('D.5 — overlay AI ADP')
    const aiBlockEnd = src.indexOf('promotedMap', aiBlockStart)
    expect(aiBlockStart).toBeGreaterThan(0)
    expect(aiBlockEnd).toBeGreaterThan(aiBlockStart)
    const aiBlock = src.slice(aiBlockStart, aiBlockEnd)
    expect(aiBlock).not.toMatch(/getAiAdpForLeague\s*\(/)
    // No imports from the legacy ai-adp-engine inside the AI ADP block.
    expect(aiBlock).not.toMatch(/from\s*['"](?:.*\/)?ai-adp-engine['"]/)
  })
})

describe('D.5 — SleeperPoolTable AI ADP cell tooltip + low-sample dot', () => {
  const src = read('components/app/draft-room/SleeperPoolTable.tsx')

  it('uses the canonical D.5 tooltip text', () => {
    expect(src).toMatch(/AllFantasy AI ADP: average draft position from valid AllFantasy drafts/)
  })

  it('mentions the full context tuple in the tooltip', () => {
    expect(src).toMatch(/sport, league type, draft type, scoring, roster format, team count, and season/)
  })

  it('renders a low-sample dot only when aiAdp is non-null AND sample is low', () => {
    expect(src).toMatch(/p\.aiAdpLowSample && p\.aiAdp != null/)
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-ai-adp-low-sample`\}/)
  })

  it('em-dash branch makes the empty-state explicit ("no drafts yet")', () => {
    expect(src).toMatch(/No drafts yet/)
  })

  it('low-sample tooltip phrasing tells the user the value will firm up', () => {
    expect(src).toMatch(/Low sample — value will firm up/)
  })

  it('exposes data-low-sample attribute for QA / e2e selectors', () => {
    expect(src).toMatch(/data-low-sample=/)
  })
})

describe('D.5 — recompute service writes standardDeviation through to upsert', () => {
  // D.5-scheduler — math + upsert moved out of scripts/ into the reusable
  // helper so the cron route shares a single source of truth.
  const src = read('lib/adp/recomputeAllFantasyAdp.ts')

  it('threads s.standardDeviation into the Prisma upsert payload', () => {
    expect(src).toMatch(/standardDeviation: s\.standardDeviation/)
  })
})

describe('D.5 — Prisma model + migration', () => {
  it('schema declares standardDeviation as a nullable Float', () => {
    const schema = read('prisma/schema.prisma')
    expect(schema).toMatch(/standardDeviation\s+Float\?/)
  })

  it('migration adds the column with IF NOT EXISTS guard', () => {
    const sql = read('prisma/migrations/20260425200000_allfantasy_adp_stddev/migration.sql')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "standardDeviation"/)
  })
})

describe('D.5 — context isolation still holds with std dev field', () => {
  it('two contexts produce two snapshots with potentially different std devs', () => {
    const dynasty: DraftContext = { ...PPR_REDRAFT_12, leagueType: 'dynasty' }
    const picks: AggregatablePick[] = [
      pick({ playerName: 'X', overall: 1, context: PPR_REDRAFT_12 }),
      pick({ playerName: 'X', overall: 3, context: PPR_REDRAFT_12 }),
      pick({ playerName: 'X', overall: 5, context: PPR_REDRAFT_12 }),
      pick({ playerName: 'X', overall: 10, context: dynasty }),
      pick({ playerName: 'X', overall: 12, context: dynasty }),
    ]
    const out = aggregateAdp(picks)
    expect(out.length).toBe(2)
    const r = out.find((s) => s.context.leagueType === 'redraft')!
    const d = out.find((s) => s.context.leagueType === 'dynasty')!
    // Different averages implies different distributions — std devs must compute on each set independently.
    expect(r.averageOverallPick).toBe(3)
    expect(d.averageOverallPick).toBe(11)
    expect(r.standardDeviation).not.toBeNull()
    expect(d.standardDeviation).not.toBeNull()
  })

  it('player-key + context-hash builder shapes match the resolver overlay site', () => {
    // Sanity — the resolver builds a key as `${normalizeDraftPoolNameForDedupe(name)}|${normalizeKeyPart(pos)}`.
    // The recompute script writes via `buildPlayerKey(name, position)` — both lowercase + trim.
    expect(buildPlayerKey('Bijan Robinson', 'RB')).toBe('bijan robinson|rb')
    // `normalizeDraftPoolNameForDedupe` is plain trim+lowercase (preserves apostrophes/periods).
    // `buildPlayerKey` is the same operation. So lookup hits.
    expect(buildPlayerKey("Ja'Marr Chase", 'WR')).toBe("ja'marr chase|wr")
  })

  it('contextHash builder hashes the full tuple', () => {
    const a = buildContextHash(PPR_REDRAFT_12)
    const different = buildContextHash({ ...PPR_REDRAFT_12, scoringFormat: 'standard' })
    expect(a).not.toBe(different)
  })
})
