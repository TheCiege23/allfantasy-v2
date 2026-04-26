/**
 * D.7 — Redraft Rookie Filter
 *
 * Verifies:
 *  - NFL `years_exp === 0` flows through normalizeDraftPlayer → isRookie=true
 *  - The PlayerPanel rookies-only predicate includes years_exp=0 for NFL redraft
 *  - Devy/C2C class-year fallback still works when those configs are enabled
 *  - Plain redraft no longer matches on `classYearLabel` (which never contained
 *    real NFL rookie data in production) — that was the D.6.1 → D.7 fix
 *  - composes correctly with position filters and search (predicate is pure)
 *  - missing rookie metadata produces a safe empty/unavailable signal
 *  - no Supabase references introduced
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isRookieEligibleForFilter } from '@/lib/draft-room/rookieFilterPredicate'
import { normalizeDraftPlayer } from '@/lib/draft-sports-models/normalize-draft-player'
import {
  loadNflRookieLookup as _loadNflRookieLookup,
  lookupYearsExp,
  type NflRookieLookup,
} from '@/lib/draft-room/nflRookieLookup'

void _loadNflRookieLookup // touch import for tooling

const root = resolve(__dirname, '..', '..')

describe('D.7 — normalizeDraftPlayer derives isRookie from yearsExp', () => {
  it('yearsExp=0 → isRookie=true on the normalized entry', () => {
    const entry = normalizeDraftPlayer(
      { name: 'Ashton Jeanty', position: 'RB', team: 'LV', adp: 25, yearsExp: 0 },
      'NFL',
    )
    expect(entry.yearsExp).toBe(0)
    expect(entry.isRookie).toBe(true)
  })

  it('yearsExp=1 → isRookie undefined (not a rookie)', () => {
    const entry = normalizeDraftPlayer(
      { name: 'Bijan Robinson', position: 'RB', team: 'ATL', adp: 4, yearsExp: 1 },
      'NFL',
    )
    expect(entry.yearsExp).toBe(1)
    expect(entry.isRookie).toBeUndefined()
  })

  it('explicit isRookie=true wins even without yearsExp', () => {
    const entry = normalizeDraftPlayer(
      { name: 'Devy Promote', position: 'WR', team: null, isRookie: true },
      'NFL',
    )
    expect(entry.isRookie).toBe(true)
  })

  it('missing yearsExp → yearsExp=null and isRookie=undefined (unavailable)', () => {
    const entry = normalizeDraftPlayer(
      { name: 'Mystery Player', position: 'WR', team: 'BUF', adp: 60 },
      'NFL',
    )
    expect(entry.yearsExp).toBeNull()
    expect(entry.isRookie).toBeUndefined()
  })
})

describe('D.7 — isRookieEligibleForFilter (NFL redraft path)', () => {
  it('NFL rookie (yearsExp=0) → included', () => {
    expect(isRookieEligibleForFilter({ yearsExp: 0 })).toBe(true)
  })

  it('NFL veteran (yearsExp=1) → excluded', () => {
    expect(isRookieEligibleForFilter({ yearsExp: 1 })).toBe(false)
  })

  it('NFL veteran (yearsExp=8) → excluded', () => {
    expect(isRookieEligibleForFilter({ yearsExp: 8 })).toBe(false)
  })

  it('explicit isRookie=true → included regardless of yearsExp', () => {
    expect(isRookieEligibleForFilter({ isRookie: true, yearsExp: 5 })).toBe(true)
  })

  it('plain redraft (no devy, no c2c): classYearLabel="Sr" alone → NOT included (the bug)', () => {
    expect(
      isRookieEligibleForFilter(
        { classYearLabel: 'Sr', isDevy: false },
        { devyEnabled: false, c2cEnabled: false },
      ),
    ).toBe(false)
  })

  it('plain redraft: isDevy=true alone → NOT included (no devy config means no devy fallback)', () => {
    expect(
      isRookieEligibleForFilter({ isDevy: true }, { devyEnabled: false, c2cEnabled: false }),
    ).toBe(false)
  })

  it('plain redraft: missing all rookie metadata → excluded (empty-state will surface)', () => {
    expect(isRookieEligibleForFilter({})).toBe(false)
  })
})

describe('D.7 — isRookieEligibleForFilter (Devy / C2C path retained)', () => {
  it('devy league: isDevy=true → included', () => {
    expect(
      isRookieEligibleForFilter({ isDevy: true }, { devyEnabled: true }),
    ).toBe(true)
  })

  it('devy league: classYearLabel="Rookie" → included', () => {
    expect(
      isRookieEligibleForFilter({ classYearLabel: 'Rookie' }, { devyEnabled: true }),
    ).toBe(true)
  })

  it('c2c league: classYearLabel="FR" → included', () => {
    expect(
      isRookieEligibleForFilter({ classYearLabel: 'FR' }, { c2cEnabled: true }),
    ).toBe(true)
  })

  it('c2c league: vet with yearsExp=4 stays excluded even with c2c enabled', () => {
    expect(
      isRookieEligibleForFilter(
        { yearsExp: 4, isDevy: false, classYearLabel: null },
        { c2cEnabled: true },
      ),
    ).toBe(false)
  })
})

describe('D.7 — predicate composes with realistic redraft pool', () => {
  // Synthetic pool that mirrors what the resolver produces for an NFL redraft
  // league: a couple of obvious rookies, a couple of vets, and a row missing
  // years_exp metadata entirely (Sleeper miss).
  const pool = [
    { name: 'Ashton Jeanty', position: 'RB', team: 'LV', yearsExp: 0 },
    { name: 'Tetairoa McMillan', position: 'WR', team: 'CAR', yearsExp: 0 },
    { name: 'Cameron Ward', position: 'QB', team: 'TEN', yearsExp: 0 },
    { name: "Ja'Marr Chase", position: 'WR', team: 'CIN', yearsExp: 4 },
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', yearsExp: 7 },
    { name: 'Mystery Free Agent', position: 'WR', team: null /* no yearsExp */ },
  ] as const

  it('Rookies Only returns exactly the three first-year players', () => {
    const filtered = pool.filter((p) => isRookieEligibleForFilter(p))
    expect(filtered.map((p) => p.name)).toEqual([
      'Ashton Jeanty',
      'Tetairoa McMillan',
      'Cameron Ward',
    ])
  })

  it('Rookies Only + RB position filter returns only the rookie RBs', () => {
    const filtered = pool
      .filter((p) => p.position === 'RB')
      .filter((p) => isRookieEligibleForFilter(p))
    expect(filtered.map((p) => p.name)).toEqual(['Ashton Jeanty'])
  })

  it('Rookies Only + name search "ward" returns Cameron Ward', () => {
    const q = 'ward'
    const filtered = pool
      .filter((p) => isRookieEligibleForFilter(p))
      .filter((p) => p.name.toLowerCase().includes(q))
    expect(filtered.map((p) => p.name)).toEqual(['Cameron Ward'])
  })

  it('rows without yearsExp metadata never get included by Rookies Only', () => {
    expect(isRookieEligibleForFilter({ name: 'Mystery Free Agent' } as any)).toBe(false)
  })
})

describe('D.7 — Sleeper rookie lookup helper', () => {
  it('lookupYearsExp finds by exact name+position', () => {
    const lookup: NflRookieLookup = {
      byNamePos: new Map([['ashton jeanty|RB', { yearsExp: 0, sleeperId: '11629' }]]),
      byName: new Map([['ashton jeanty', { yearsExp: 0, sleeperId: '11629' }]]),
      hasData: true,
    }
    expect(lookupYearsExp(lookup, 'Ashton Jeanty', 'RB')).toBe(0)
  })

  it('lookupYearsExp falls back to name-only when position misses', () => {
    const lookup: NflRookieLookup = {
      byNamePos: new Map([['ashton jeanty|RB', { yearsExp: 0 }]]),
      byName: new Map([['ashton jeanty', { yearsExp: 0 }]]),
      hasData: true,
    }
    expect(lookupYearsExp(lookup, 'Ashton Jeanty', 'WR' /* wrong */)).toBe(0)
    expect(lookupYearsExp(lookup, 'Ashton Jeanty', null /* missing */)).toBe(0)
  })

  it('lookupYearsExp returns null when no match (UI then surfaces "Rookie data unavailable")', () => {
    const empty: NflRookieLookup = { byNamePos: new Map(), byName: new Map(), hasData: false }
    expect(lookupYearsExp(empty, 'Mystery Player', 'WR')).toBeNull()
  })

  it('handles whitespace + case differences gracefully', () => {
    const lookup: NflRookieLookup = {
      byNamePos: new Map([['cameron ward|QB', { yearsExp: 0 }]]),
      byName: new Map([['cameron ward', { yearsExp: 0 }]]),
      hasData: true,
    }
    expect(lookupYearsExp(lookup, '  CAMERON WARD  ', 'qb')).toBe(0)
  })
})

describe('D.7 — Watchlist + Show Drafted toggles still work alongside Rookies Only', () => {
  // These are kept as predicate-level smoke checks; the existing test files
  // (d6-1, d6-bottom-dock) cover the surrounding UI plumbing.
  const pool = [
    { name: 'Ashton Jeanty', position: 'RB', team: 'LV', yearsExp: 0 },
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', yearsExp: 7 },
  ] as const

  it('combining a watchlist set with rookies-only is composable', () => {
    const watchlist = new Set(['saquon barkley|RB'])
    const filtered = pool
      .filter((p) => watchlist.has(`${p.name.toLowerCase()}|${p.position}`))
      .filter((p) => isRookieEligibleForFilter(p))
    // Saquon is on the watchlist but not a rookie → both filters strip him out
    expect(filtered).toEqual([])
  })
})

describe('D.7 — no forbidden BaaS references introduced', () => {
  // Per project guidance: Neon + Prisma only. Split the forbidden token so
  // this test file doesn't trigger its own assertion.
  const FORBIDDEN = 'supa' + 'base'
  const filesToCheck = [
    'lib/draft-room/nflRookieLookup.ts',
    'lib/draft-room/rookieFilterPredicate.ts',
    'lib/draft-sports-models/types.ts',
    'lib/draft-sports-models/normalize-draft-player.ts',
    'components/app/draft-room/PlayerPanel.tsx',
  ]

  for (const rel of filesToCheck) {
    it(`${rel} contains no forbidden BaaS imports`, () => {
      const src = readFileSync(resolve(root, rel), 'utf8')
      expect(src.toLowerCase()).not.toContain(FORBIDDEN)
    })
  }
})
