import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * E.2.5 — NFL projected/season-stats backfill scripts.
 *
 * Static-source assertions (no DB / network), since the scripts pull Prisma + provider
 * clients that can't be mounted in jsdom without secrets.
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('E.2.5 — audit-nfl-player-stats-provider script', () => {
  const src = read('scripts/audit-nfl-player-stats-provider.ts')

  it('reads from Rolling Insights provider helpers (no new client)', () => {
    expect(src).toMatch(/from '\.\.\/lib\/rolling-insights'/)
    expect(src).toMatch(/fetchNFLTeams/)
    expect(src).toMatch(/fetchNFLRoster/)
  })

  it('reports table totals for the three sources the loader joins', () => {
    expect(src).toMatch(/sportsPlayer\.count/)
    expect(src).toMatch(/playerSeasonStats\.count/)
    expect(src).toMatch(/playerIdentityMap\.count/)
    expect(src).toMatch(/playerAnalyticsSnapshot\.count/)
  })

  it('classifies state as MISSING_PROVIDER / MISSING_BACKFILL / READY / PARTIAL', () => {
    expect(src).toMatch(/MISSING_PROVIDER/)
    expect(src).toMatch(/MISSING_BACKFILL/)
    expect(src).toMatch(/READY/)
    expect(src).toMatch(/PARTIAL/)
  })

  it('accepts --json, --season, --probe-team flags', () => {
    expect(src).toMatch(/--json/)
    expect(src).toMatch(/--season=/)
    expect(src).toMatch(/--probe-team=/)
  })

  it('counts rushing / receiving / passing stat coverage on the probe', () => {
    expect(src).toMatch(/playersWithRushing/)
    expect(src).toMatch(/playersWithReceiving/)
    expect(src).toMatch(/playersWithPassing/)
    expect(src).toMatch(/playersWithFantasyPoints/)
  })

  it('does not write to Prisma (read-only)', () => {
    expect(src).not.toMatch(/\.upsert\(/)
    expect(src).not.toMatch(/\.create\(\{[\s\S]*?data:/)
    expect(src).not.toMatch(/\.update\(/)
  })
})

describe('E.2.5 — backfill-nfl-draft-stats script', () => {
  const src = read('scripts/backfill-nfl-draft-stats.ts')

  it('defaults to dry-run; --apply switches to writes', () => {
    expect(src).toMatch(/apply: false/)
    expect(src).toMatch(/--apply/)
    expect(src).toMatch(/mode: args\.apply \? 'apply' : 'dry-run'/)
  })

  it('uses pool-side normalizer (.trim().toLowerCase()) — NOT the punctuation-stripping one', () => {
    // Prevents a regression of the E.2 case-mismatch bug. The loader joins
    // PlayerIdentityMap.normalizedName ←→ pool-side `normalizeDraftPoolNameForDedupe`,
    // which is plain trim+lowercase. Stripping apostrophes here would re-introduce the bug.
    expect(src).toMatch(/normalizePoolName/)
    expect(src).toMatch(/\(name \?\? ''\)\.trim\(\)\.toLowerCase\(\)/)
    expect(src).not.toMatch(/from '\.\.\/lib\/player-assets\/resolvePlayerHeadshot'/)
  })

  it('upserts PlayerIdentityMap with rollingInsightsId so the loader can join', () => {
    expect(src).toMatch(/playerIdentityMap\.findFirst/)
    expect(src).toMatch(/playerIdentityMap\.create/)
    expect(src).toMatch(/playerIdentityMap\.update/)
    expect(src).toMatch(/rollingInsightsId: p\.id/)
  })

  it('reuses syncNFLPlayersToDb for SportsPlayer + PlayerSeasonStats writes (no duplication)', () => {
    expect(src).toMatch(/syncNFLPlayersToDb/)
    // The sync function lives in lib/rolling-insights.ts — the script must not
    // re-implement its own SportsPlayer / PlayerSeasonStats upsert paths.
    expect(src).not.toMatch(/sportsPlayer\.upsert/)
    expect(src).not.toMatch(/playerSeasonStats\.upsert/)
  })

  it('skips DB writes entirely in dry-run mode', () => {
    expect(src).toMatch(/if \(!args\.apply\) \{[\s\S]*?continue/)
    expect(src).toMatch(/if \(args\.apply\) \{[\s\S]*?syncNFLPlayersToDb/)
  })

  it('accepts --apply, --json, --season, --teams flags', () => {
    expect(src).toMatch(/--apply/)
    expect(src).toMatch(/--json/)
    expect(src).toMatch(/--season=/)
    expect(src).toMatch(/--teams=/)
  })
})

describe('E.2.5 — package.json wires the new scripts', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

  it('exposes audit:nfl-stats-provider', () => {
    expect(pkg.scripts['audit:nfl-stats-provider']).toBeDefined()
    expect(pkg.scripts['audit:nfl-stats-provider']).toMatch(/audit-nfl-player-stats-provider\.ts/)
  })

  it('exposes backfill:nfl-draft-stats', () => {
    expect(pkg.scripts['backfill:nfl-draft-stats']).toBeDefined()
    expect(pkg.scripts['backfill:nfl-draft-stats']).toMatch(/backfill-nfl-draft-stats\.ts/)
  })

  it('uses the standard server-only stub preload pattern', () => {
    expect(pkg.scripts['audit:nfl-stats-provider']).toMatch(/_audit-preload\.cjs/)
    expect(pkg.scripts['backfill:nfl-draft-stats']).toMatch(/_audit-preload\.cjs/)
  })
})
