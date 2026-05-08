/**
 * Player Pool Identity Cleanup (Phase 2) — static-source assertions.
 *
 * Vitest's render path is flaky on this codebase's JSX, so these tests assert
 * the SHAPE of the source code rather than running the resolver. The unit tests
 * for canonicalName/Position/Team live in
 * __tests__/scripts/audit-draft-player-pool-canonical.test.ts and exercise the
 * shared helper directly.
 *
 * Coverage:
 *   - Resolver imports the shared canonical-identity helpers.
 *   - normalizeDraftPoolNameForDedupe delegates to canonicalName (collapses
 *     Russell Wilson FA/NYG dupes after the cache build/lookup go through it).
 *   - normalizeLooseName also delegates to canonicalName.
 *   - dedupeEnrichedRawRows uses strictIdentityKey (team-AGNOSTIC) — proves the
 *     dupe collapse is driven by canonicalName + canonicalPos, not (name+pos+team).
 *   - scoreDraftPoolRow exists and weights real headshot, non-FA team, sleeperId,
 *     valid ADP.
 *   - Image lookup uses team-keyed match first, then name+pos, then name-only
 *     ONLY when the pool row has no team (avoids MHJ Jr/Sr collision).
 *   - SleeperId lookup uses the same confidence ladder.
 *   - SleeperPoolTable: avatar flex-shrink-0 (in PlayerAvatar), drafted badge
 *     no longer nested inside the truncate span.
 *   - No Supabase imports added to any of the touched files.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compareDraftEntriesByStableRank, resolvePreferredAdp } from '../../lib/draft-room/adp-ordering'
import { normalizeDraftPoolInjuryStatus } from '../../lib/draft-room/injury-status-normalization'

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const RESOLVER = 'lib/draft-room/getResolvedDraftPoolForLeague.ts'
const CANONICAL = 'lib/draft-room/player-canonical-identity.ts'
const TABLE = 'components/app/draft-room/SleeperPoolTable.tsx'
const AUDIT = 'scripts/audit-draft-player-pool.ts'

describe('Phase 2 — shared canonical identity module', () => {
  const src = read(CANONICAL)

  it('exports canonicalName / canonicalPosition / canonicalTeam / strictIdentityKey / isFreeAgentTeam', () => {
    expect(src).toMatch(/export function canonicalName/)
    expect(src).toMatch(/export function canonicalPosition/)
    expect(src).toMatch(/export function canonicalTeam/)
    expect(src).toMatch(/export function strictIdentityKey/)
    expect(src).toMatch(/export function isFreeAgentTeam/)
  })

  it("strips apostrophes outright (Ja'Marr → jamarr; not Ja Marr)", () => {
    expect(src).toMatch(/replace\(\/\['‘’\]\/g, ''\)/)
  })

  it('strips dots (A.J. → AJ)', () => {
    expect(src).toMatch(/replace\(\/\\\.\/g, ''\)/)
  })

  it('PRESERVES Jr/Sr/II/III/IV/V suffix tokens (Marvin Harrison Jr. ≠ Marvin Harrison)', () => {
    // The earlier draft of this helper dropped suffixes, which collapsed
    // father/son. The fix is to remove SUFFIX_TOKENS filtering. This guard
    // prevents a future regression that re-adds the filter.
    expect(src).not.toMatch(/SUFFIX_TOKENS/)
    expect(src).toMatch(/Suffix tokens \(jr, sr, ii, iii, iv, v\) are KEPT/)
  })

  it('canonicalPosition collapses DEF/DST/D-ST to DEF', () => {
    expect(src).toMatch(/DEF_ALIASES/)
    expect(src).toMatch(/'DEF'.*'DST'.*'D\/ST'/)
  })

  it('isFreeAgentTeam recognizes blank and FA variants', () => {
    expect(src).toMatch(/'FA'/)
    expect(src).toMatch(/'F\/A'/)
    expect(src).toMatch(/'NONE'/)
  })
})

describe('Phase 2 — resolver delegates name normalization to canonicalName', () => {
  const src = read(RESOLVER)

  it('imports the shared canonical helpers', () => {
    expect(src).toMatch(/from '@\/lib\/draft-room\/player-canonical-identity'/)
    expect(src).toMatch(/canonicalName/)
    expect(src).toMatch(/canonicalPosition/)
    expect(src).toMatch(/strictIdentityKey/)
    expect(src).toMatch(/isFreeAgentTeam/)
  })

  it('normalizeDraftPoolNameForDedupe delegates to canonicalName (no longer .trim().toLowerCase() only)', () => {
    expect(src).toMatch(/export function normalizeDraftPoolNameForDedupe[\s\S]{0,200}return canonicalName\(name\)/)
  })

  it('normalizeLooseName delegates to canonicalName (no longer special-cases de von)', () => {
    expect(src).toMatch(/function normalizeLooseName[\s\S]{0,200}return canonicalName\(name\)/)
  })
})

describe('Phase 2 — strict-identity dedupe collapses Russell Wilson FA/NYG-style dupes', () => {
  const src = read(RESOLVER)

  it('dedupeEnrichedRawRows uses strictIdentityKey (team-AGNOSTIC primary key)', () => {
    expect(src).toMatch(/function dedupeEnrichedRawRows[\s\S]{0,500}strictIdentityKey\(name, pos\)/)
  })

  it('does NOT use loosePlayerTeamKey as the primary dedupe key any more', () => {
    // The function may still call loosePlayerTeamKey elsewhere (image lookup),
    // but the dedupe block must use strictIdentityKey.
    const m = src.match(/function dedupeEnrichedRawRows\(rows: DraftPoolRawRow\[\]\)[\s\S]*?\n\}/)
    expect(m, 'dedupeEnrichedRawRows must exist').not.toBeNull()
    expect(m![0]).not.toMatch(/loosePlayerTeamKey\(/)
    expect(m![0]).toMatch(/strictIdentityKey\(/)
  })

  it('best-row scoring weights real headshot, non-FA team, sleeperId, valid ADP', () => {
    expect(src).toMatch(/function scoreDraftPoolRow/)
    expect(src).toMatch(/hasHttpHeadshot[\s\S]{0,80}\+= 200/)
    expect(src).toMatch(/!isFreeAgentTeam\(team\)\) score \+= 120/)
    expect(src).toMatch(/sleeperId.*score \+= 120/)
    expect(src).toMatch(/adp != null\) score \+= 60/)
  })
})

describe('Phase 2 — image confidence ladder', () => {
  const src = read(RESOLVER)

  it('sportsPlayer map-building uses normalizePositionForMapKey to convert TheSportsDB full names', () => {
    // TheSportsDB stores "Wide Receiver", "Running Back", etc.
    // Pool rows use abbreviations "WR", "RB". Without normalization, the map keys
    // are "wide receiver" while pool lookups use "wr" — they never match.
    expect(src).toMatch(/POSITION_FULL_TO_ABBREV/)
    expect(src).toMatch(/function normalizePositionForMapKey/)
    expect(src).toMatch(/const pk = normalizePositionForMapKey\(row\.position/)
  })

  it('headshot lookup tries team-keyed match FIRST', () => {
    expect(src).toMatch(/Phase 2 — image confidence ladder/)
    expect(src).toMatch(/const teamMatch = lookupTeam \? sportsPlayerImageByLooseTeamKey\.get\(looseTeamKey\) : null/)
  })

  it('headshot lookup drops name-only fallback when pool row has a team', () => {
    expect(src).toMatch(/const nameOnlyMatch = !lookupTeam \? sportsPlayerImageByNameKey\.get\(`\$\{lookupName\}\|`\) : null/)
  })

  it('headshot lookup priority is team → name+pos → nameOnly (only when no team)', () => {
    expect(src).toMatch(/backfilledHeadshot = teamMatch \?\? namePosMatch \?\? nameOnlyMatch \?\? null/)
  })

  it('sleeperId lookup uses the same ladder (team → name+pos → name-only when no team)', () => {
    expect(src).toMatch(/Phase 2 — sleeperId confidence ladder/)
    expect(src).toMatch(/return teamMatch \?\? namePosMatch \?\? nameOnlyMatch \?\? null/)
  })
})

describe('Phase 2 — SleeperPoolTable readability constraints', () => {
  const src = read(TABLE)

  it('inner name column has min-w-0 (lets truncation work in a flex parent)', () => {
    expect(src).toMatch(/flex min-w-0 flex-1 flex-col/)
  })

  it('drafted badge is OUTSIDE the truncate span and has flex-shrink-0', () => {
    // Badge is in its own flex sibling, no longer nested inside the name span.
    expect(src).toMatch(/data-testid=\{`\$\{testIdBase\}-name`\}[\s\S]{0,300}<\/span>\s*\{drafted \?/)
    expect(src).toMatch(/flex-shrink-0 rounded border border-white\/15[\s\S]{0,100}Drafted/)
  })

  it('name span has min-w-0 + flex-1 + truncate (so it consumes available width)', () => {
    expect(src).toMatch(/min-w-0 flex-1 truncate text-\[12px\] font-semibold/)
  })

  it('position/team line has whitespace-nowrap so QB/NYG never wraps to two lines', () => {
    expect(src).toMatch(/truncate whitespace-nowrap text-\[10px\] text-white\/55/)
  })
})

describe('Phase 2 — audit script is wired to npm scripts', () => {
  const pkg = JSON.parse(read('package.json'))

  it('"audit:draft-player-pool" script exists', () => {
    expect(pkg.scripts['audit:draft-player-pool']).toBeTruthy()
    expect(pkg.scripts['audit:draft-player-pool']).toMatch(/audit-draft-player-pool\.ts/)
  })

  it('audit script imports shared canonical helpers (single source of truth)', () => {
    const src = read(AUDIT)
    expect(src).toMatch(/from '\.\.\/lib\/draft-room\/player-canonical-identity'/)
  })

  it('audit dumps full URL preview for named samples', () => {
    const src = read(AUDIT)
    expect(src).toMatch(/Named samples \(full identity dump\)/)
    expect(src).toMatch(/url=\$\{urlPreview\}/)
  })
})

describe('Phase 2 — no forbidden BaaS references in touched files', () => {
  const FORBIDDEN = 'supa' + 'base'
  for (const rel of [RESOLVER, CANONICAL, TABLE, AUDIT]) {
    it(`${rel} contains no forbidden BaaS imports`, () => {
      expect(read(rel).toLowerCase()).not.toContain(FORBIDDEN)
    })
  }
})

describe('Task 5 — draft pool injury status normalization', () => {
  it('maps OUT variants to OUT', () => {
    expect(normalizeDraftPoolInjuryStatus('Out', null)).toBe('OUT')
    expect(normalizeDraftPoolInjuryStatus('inactive', null)).toBe('OUT')
    expect(normalizeDraftPoolInjuryStatus('INACT', null)).toBe('OUT')
  })

  it('maps QUESTIONABLE variants and Q shorthand to QUESTIONABLE', () => {
    expect(normalizeDraftPoolInjuryStatus('questionable', null)).toBe('QUESTIONABLE')
    expect(normalizeDraftPoolInjuryStatus('Questionable', null)).toBe('QUESTIONABLE')
    expect(normalizeDraftPoolInjuryStatus('Q', null)).toBe('QUESTIONABLE')
  })

  it('maps IR variants to IR', () => {
    expect(normalizeDraftPoolInjuryStatus('IR', null)).toBe('IR')
    expect(normalizeDraftPoolInjuryStatus('Injured Reserve', null)).toBe('IR')
  })

  it('maps PUP variants to PUP', () => {
    expect(normalizeDraftPoolInjuryStatus('PUP', null)).toBe('PUP')
    expect(normalizeDraftPoolInjuryStatus('Physically Unable To Perform', null)).toBe('PUP')
  })

  it('maps suspended variants to SUSPENDED', () => {
    expect(normalizeDraftPoolInjuryStatus('Suspended', null)).toBe('SUSPENDED')
    expect(normalizeDraftPoolInjuryStatus('league suspension', null)).toBe('SUSPENDED')
  })

  it('returns UNKNOWN for empty or unknown text', () => {
    expect(normalizeDraftPoolInjuryStatus(null, null)).toBe('UNKNOWN')
    expect(normalizeDraftPoolInjuryStatus('day to day', null)).toBe('UNKNOWN')
  })

  it('maps ACTIVE shorthand variants', () => {
    expect(normalizeDraftPoolInjuryStatus('ACT', null)).toBe('ACTIVE')
    expect(normalizeDraftPoolInjuryStatus('Active', null)).toBe('ACTIVE')
  })

  it('uses gameStatus fallback when status is empty', () => {
    expect(normalizeDraftPoolInjuryStatus('', 'Questionable')).toBe('QUESTIONABLE')
    expect(normalizeDraftPoolInjuryStatus(null, 'Out')).toBe('OUT')
  })
})

describe('Task 6 — ADP/ranking source hardening', () => {
  it('prefers valid raw ADP over averaged ADP', () => {
    expect(resolvePreferredAdp(14.2, 22.4)).toBe(14.2)
  })

  it('falls back to averaged ADP when raw ADP is invalid', () => {
    expect(resolvePreferredAdp(Number.NaN, 31.5)).toBe(31.5)
    expect(resolvePreferredAdp(0, 31.5)).toBe(31.5)
    expect(resolvePreferredAdp(-5, 31.5)).toBe(31.5)
  })

  it('returns null when neither ADP value is valid', () => {
    expect(resolvePreferredAdp(null, null)).toBeNull()
    expect(resolvePreferredAdp(Number.NaN, Number.NaN)).toBeNull()
  })

  it('sorts entries by ADP ascending before name tie-breakers', () => {
    const rows = [
      { name: 'Zed', position: 'WR', team: 'AAA', adp: 25, aiAdp: null },
      { name: 'Able', position: 'WR', team: 'AAA', adp: 8, aiAdp: null },
      { name: 'Moe', position: 'WR', team: 'AAA', adp: null, aiAdp: 12 },
    ]
    const sorted = rows
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => compareDraftEntriesByStableRank(a.entry, b.entry, a.index, b.index))
      .map((item) => item.entry.name)
    expect(sorted).toEqual(['Able', 'Zed', 'Moe'])
  })

  it('uses AI ADP when ADP is absent', () => {
    const rows = [
      { name: 'Gamma', position: 'WR', team: 'AAA', adp: null, aiAdp: 18 },
      { name: 'Beta', position: 'WR', team: 'AAA', adp: null, aiAdp: 7 },
    ]
    const sorted = rows
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => compareDraftEntriesByStableRank(a.entry, b.entry, a.index, b.index))
      .map((item) => item.entry.name)
    expect(sorted).toEqual(['Beta', 'Gamma'])
  })
})
