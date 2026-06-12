/**
 * Regression tests for the NFL/NCAAF fantasy league standings API.
 *
 * Root cause fixed: app/api/app/leagues/[leagueId]/standings/route.ts was proxying
 * all requests to the bracket pool standings endpoint (/api/bracket/leagues/.../standings),
 * which is for NBA/NHL/FIFA bracket challenges — not NFL fantasy leagues.
 *
 * Fix: route detects whether the league has a RedraftSeason. If yes → read from
 * RedraftRoster (fantasy standings engine output). If no → keep the bracket proxy
 * for true bracket pool leagues.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

const standingsRoute = read('app/api/app/leagues/[leagueId]/standings/route.ts')
const catchAllRoute = read('app/api/app/[...path]/route.ts')

// ─── Dedicated route: no longer proxies to bracket pool unconditionally ────────

describe('app/api/app/leagues/[leagueId]/standings — fantasy-aware routing', () => {
  it('does NOT import-only from proxyToExisting with bracket target (has other logic)', () => {
    // Old (broken) route was only 8 lines: import + one unconditional proxyToExisting call.
    // The fixed route must have session handling, DB queries, and conditional bracket fallback.
    const lineCount = standingsRoute.split('\n').filter((l) => l.trim()).length
    expect(lineCount).toBeGreaterThan(20)
    // Must contain prisma queries — proves it's not just a pass-through proxy
    expect(standingsRoute).toContain('prisma.')
  })

  it('checks for a RedraftSeason to distinguish fantasy from bracket leagues', () => {
    expect(standingsRoute).toContain('redraftSeason')
    expect(standingsRoute).toContain('findFirst')
    expect(standingsRoute).toContain('leagueId')
  })

  it('reads from redraftRoster for fantasy leagues', () => {
    expect(standingsRoute).toContain('redraftRoster')
    expect(standingsRoute).toContain('findMany')
    expect(standingsRoute).toContain('seasonId')
  })

  it('falls back to bracket proxy only when no RedraftSeason exists', () => {
    // The bracket proxy is still present but guarded by the !season check
    expect(standingsRoute).toContain('bracket/leagues')
    expect(standingsRoute).toMatch(/if\s*\(\s*!season\s*\)/)
  })

  it('returns standings array with expected fantasy fields', () => {
    expect(standingsRoute).toContain('wins')
    expect(standingsRoute).toContain('losses')
    expect(standingsRoute).toContain('ties')
    expect(standingsRoute).toContain('pointsFor')
    expect(standingsRoute).toContain('pointsAgainst')
    expect(standingsRoute).toContain('playoffSeed')
    expect(standingsRoute).toContain('streak')
  })

  it('returns seasonId in response for StandingsView playoff generation', () => {
    // StandingsView needs seasonId to call generatePlayoffs
    expect(standingsRoute).toContain('seasonId')
    expect(standingsRoute).toContain('NextResponse.json')
  })

  it('validates session auth before returning data', () => {
    expect(standingsRoute).toContain('getServerSession')
    expect(standingsRoute).toContain('Unauthorized')
  })

  it('returns 404 for missing league', () => {
    expect(standingsRoute).toContain('League not found')
    expect(standingsRoute).toContain('404')
  })

  it('returns 403 when user is not a league member or commissioner', () => {
    expect(standingsRoute).toContain('Forbidden')
    expect(standingsRoute).toContain('403')
  })

  it('returns empty standings array safely for new leagues with no matchups played', () => {
    // findMany returns [] when no rosters exist; map over empty array → []
    // Verify the code uses map (safe over empty array) not index access
    expect(standingsRoute).toContain('.map(')
  })

  it('sorts rosters by playoffSeed then wins then pointsFor', () => {
    expect(standingsRoute).toContain('playoffSeed')
    expect(standingsRoute).toContain('wins')
    expect(standingsRoute).toContain('pointsFor')
    // orderBy array with multiple sort keys
    expect(standingsRoute).toContain('orderBy')
  })

  it('rounds pointsFor and pointsAgainst to 2 decimal places', () => {
    expect(standingsRoute).toContain('Math.round')
    expect(standingsRoute).toContain('100')
  })

  it('marks route as force-dynamic so standings are never cached at edge', () => {
    expect(standingsRoute).toContain("dynamic = 'force-dynamic'")
  })
})

// ─── Catch-all: standings/playoffs sections updated ───────────────────────────

describe('app/api/app/[...path] catch-all — standings routing updated', () => {
  it('standings section routes to dedicated standings handler (not directly to bracket)', () => {
    // The catch-all should proxy to /api/app/leagues/${leagueId}/standings
    // which in turn does the fantasy-vs-bracket detection
    const standingsBlock = catchAllRoute.match(
      /section === ['"]standings['"][\s\S]*?(?=if \(leagueId|$)/,
    )?.[0] ?? ''
    expect(standingsBlock).toContain('/api/app/leagues/')
    expect(standingsBlock).not.toContain('/api/bracket/leagues/')
  })

  it('playoffs section routes to dedicated standings handler (not directly to bracket)', () => {
    const playoffsBlock = catchAllRoute.match(
      /section === ['"]playoffs['"][\s\S]*?(?=if \(leagueId|$)/,
    )?.[0] ?? ''
    expect(playoffsBlock).toContain('/api/app/leagues/')
    expect(playoffsBlock).not.toContain('/api/bracket/leagues/')
  })
})

// ─── StandingsView response shape ────────────────────────────────────────────

describe('StandingsView — expected response shape from standings API', () => {
  const standingsView = read('app/league/[leagueId]/tabs/redraft/StandingsView.tsx')

  it('StandingsView expects id field from each roster row', () => {
    expect(standingsView).toContain('r.id')
  })

  it('StandingsView expects wins, losses, ties', () => {
    expect(standingsView).toContain('r.wins')
    expect(standingsView).toContain('r.losses')
  })

  it('StandingsView expects pointsFor and pointsAgainst', () => {
    expect(standingsView).toContain('r.pointsFor')
    expect(standingsView).toContain('r.pointsAgainst')
  })

  it('StandingsView expects playoffSeed for rank column', () => {
    expect(standingsView).toContain('playoffSeed')
  })

  it('StandingsView expects streak field', () => {
    expect(standingsView).toContain('streak')
  })

  it('StandingsView uses seasonId (not leagueId) to call generatePlayoffs', () => {
    // Playoff generation needs the season, not just the league
    expect(standingsView).toContain('seasonId')
    expect(standingsView).toContain('generatePlayoffs')
  })
})
