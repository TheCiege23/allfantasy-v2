import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildNameSearchVariants,
  isValidHeadshotUrl,
  normalizePlayerName,
} from '@/lib/player-assets/resolvePlayerHeadshot'

/**
 * E.1.6 — TheSportsAPI as the third headshot provider tier.
 *
 * Pure-logic coverage of the shared name-variant generator + isValidHeadshotUrl,
 * plus static-source assertions for the wiring inside resolvePlayerHeadshot.ts
 * and the backfill script (Prisma + provider can't mount under jsdom).
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('E.1.6 — buildNameSearchVariants generates the variants the user listed', () => {
  it("Ja'Marr Chase → includes 'JaMarr Chase' and 'Ja Marr Chase'", () => {
    const v = buildNameSearchVariants("Ja'Marr Chase", normalizePlayerName("Ja'Marr Chase"))
    expect(v).toContain("Ja'Marr Chase")
    expect(v).toContain('JaMarr Chase')
    expect(v).toContain('Ja Marr Chase')
    // The fully-normalized lowercase fallback is always present too.
    expect(v).toContain('jamarr chase')
  })

  it("A.J. Brown → includes 'AJ Brown' and 'A J Brown'", () => {
    const v = buildNameSearchVariants('A.J. Brown', normalizePlayerName('A.J. Brown'))
    expect(v).toContain('A.J. Brown')
    expect(v).toContain('AJ Brown')
    expect(v).toContain('A J Brown')
    expect(v).toContain('aj brown')
  })

  it("D.K. Metcalf → includes 'DK Metcalf' and 'D K Metcalf'", () => {
    const v = buildNameSearchVariants('D.K. Metcalf', normalizePlayerName('D.K. Metcalf'))
    expect(v).toContain('D.K. Metcalf')
    expect(v).toContain('DK Metcalf')
    expect(v).toContain('D K Metcalf')
  })

  it('Amon-Ra St. Brown → includes hyphen-replaced + period-stripped variants', () => {
    const v = buildNameSearchVariants('Amon-Ra St. Brown', normalizePlayerName('Amon-Ra St. Brown'))
    expect(v).toContain('Amon-Ra St. Brown')
    // Strip-punct preserves the hyphen: "Amon-Ra St Brown"
    expect(v).toContain('Amon-Ra St Brown')
    // Hyphen-replaced (period preserved): "Amon Ra St. Brown"
    expect(v).toContain('Amon Ra St. Brown')
    // Period-and-hyphen-replaced: "Amon Ra St Brown"
    expect(v).toContain('Amon Ra St Brown')
  })

  it("De'Von Achane → includes 'DeVon Achane' and 'De Von Achane'", () => {
    const v = buildNameSearchVariants("De'Von Achane", normalizePlayerName("De'Von Achane"))
    expect(v).toContain("De'Von Achane")
    expect(v).toContain('DeVon Achane')
    expect(v).toContain('De Von Achane')
    expect(v).toContain('devon achane')
  })

  it("C.J. Stroud → includes 'CJ Stroud' and 'C J Stroud'", () => {
    const v = buildNameSearchVariants('C.J. Stroud', normalizePlayerName('C.J. Stroud'))
    expect(v).toContain('CJ Stroud')
    expect(v).toContain('C J Stroud')
  })

  it('Brian Thomas Jr. → includes the suffix-stripped variant for SportsDB', () => {
    const v = buildNameSearchVariants('Brian Thomas Jr.', normalizePlayerName('Brian Thomas Jr.'))
    expect(v).toContain('Brian Thomas Jr.')
    expect(v).toContain('Brian Thomas')
  })

  it('does NOT emit duplicates (each variant unique)', () => {
    const v = buildNameSearchVariants('Bo Nix', normalizePlayerName('Bo Nix'))
    const set = new Set(v)
    expect(set.size).toBe(v.length)
  })

  it('falls back to the normalized lowercase form when given null/empty', () => {
    expect(buildNameSearchVariants(null, 'jamarr chase')).toEqual(['jamarr chase'])
    expect(buildNameSearchVariants('', 'jamarr chase')).toEqual(['jamarr chase'])
  })

  it("preserves 'most specific' order — exact original is the FIRST candidate", () => {
    const v = buildNameSearchVariants("Ja'Marr Chase", normalizePlayerName("Ja'Marr Chase"))
    expect(v[0]).toBe("Ja'Marr Chase")
  })
})

describe('E.1.6 — isValidHeadshotUrl rejects team logos and synth placeholders (carry-over)', () => {
  it('rejects team-logo URLs even if they come back from a provider', () => {
    expect(isValidHeadshotUrl('https://a.espncdn.com/i/teamLogos/nfl/500/atl.png')).toBe(false)
  })

  it('rejects data: URI placeholders', () => {
    expect(isValidHeadshotUrl('data:image/svg+xml;utf8,...')).toBe(false)
  })

  it('accepts api-sports.io player headshot URLs (per their CDN shape)', () => {
    expect(isValidHeadshotUrl('https://media.api-sports.io/american-football/players/1234.png')).toBe(true)
  })
})

describe('E.1.6 — resolvePlayerHeadshot wires TheSportsAPI as tier 3', () => {
  const src = read('lib/player-assets/resolvePlayerHeadshot.ts')

  it('imports apiSportsProvider from lib/workers/providers/api-sports', () => {
    expect(src).toMatch(/import \{ apiSportsProvider \} from '@\/lib\/workers\/providers\/api-sports'/)
  })

  it('HeadshotProvider type includes the new "apisports" source', () => {
    expect(src).toMatch(/'clearsports'\s*\|\s*'sportsdb'\s*\|\s*'apisports'\s*\|\s*'sportsplayer'\s*\|\s*'none'/)
  })

  it('apiSports tier sits AFTER SportsDB and BEFORE the SportsPlayer cache lookup', () => {
    const sportsDbIdx = src.indexOf('// ── 2. SportsDB ──')
    const apiSportsIdx = src.indexOf('// ── 3. TheSportsAPI')
    const cacheIdx = src.indexOf('// ── 4. SportsPlayer DB cache ──')
    expect(sportsDbIdx).toBeGreaterThan(0)
    expect(apiSportsIdx).toBeGreaterThan(sportsDbIdx)
    expect(cacheIdx).toBeGreaterThan(apiSportsIdx)
  })

  it('returns source: "apisports" when the API hit succeeds', () => {
    expect(src).toMatch(/source: 'apisports'/)
  })

  it('uses the SAME variants list for SportsDB and TheSportsAPI (no double-lookup logic)', () => {
    expect(src).toMatch(/const nameCandidates = buildNameSearchVariants/)
    // Both loops must iterate `nameCandidates` so we don't drift between providers.
    const candidateLoops = src.match(/for \(const candidate of nameCandidates\)/g) ?? []
    expect(candidateLoops.length).toBeGreaterThanOrEqual(2)
  })

  it('still passes through isValidHeadshotUrl before accepting api-sports response', () => {
    // Defensive: api-sports occasionally returns generic placeholders.
    // The api-sports tier must hit isValidHeadshotUrl before returning.
    const apiBlock = src.slice(src.indexOf('// ── 3. TheSportsAPI'), src.indexOf('// ── 4. SportsPlayer'))
    expect(apiBlock).toMatch(/isValidHeadshotUrl\(apiUrl\)/)
  })

  it('swallows provider errors and continues to the next variant / next tier', () => {
    expect(src).toMatch(/swallow — provider may be down or unconfigured/)
  })
})

describe('E.1.6 — backfill-player-headshots reports new tier + accepts --names', () => {
  const src = read('scripts/backfill-player-headshots.ts')

  it('counts apiSports hits in the report struct', () => {
    expect(src).toMatch(/resolvedApiSports: number/)
    expect(src).toMatch(/result\.source === 'apisports'/)
  })

  it('prints the new tier in the human-readable summary', () => {
    expect(src).toMatch(/resolved via TheSportsAPI/)
  })

  it('accepts a --names="A,B,C" filter and applies it before the row loop', () => {
    expect(src).toMatch(/--names=/)
    expect(src).toMatch(/args\.names && args\.names\.length/)
    expect(src).toMatch(/wanted\.has\(\(e\.name \?\? ''\)\.trim\(\)\.toLowerCase\(\)\)/)
  })

  it('keeps dry-run as the default behavior (--apply still required to write)', () => {
    expect(src).toMatch(/apply: false/)
    expect(src).toMatch(/--apply/)
  })
})
