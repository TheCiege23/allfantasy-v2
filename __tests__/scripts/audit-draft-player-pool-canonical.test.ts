/**
 * Unit tests for the canonicalName / canonicalPosition / canonicalTeam helpers
 * used by the audit script. These are the cornerstone of duplicate detection —
 * if these collapse the wrong way, the whole audit (and any future dedupe pass
 * built on the same rules) will report wrong groups.
 */

import { describe, expect, it } from 'vitest'
import {
  canonicalName,
  canonicalPosition,
  canonicalTeam,
} from '../../scripts/audit-draft-player-pool'

describe('canonicalName', () => {
  it('lowercases', () => {
    expect(canonicalName('Russell Wilson')).toBe('russell wilson')
  })

  it("strips apostrophes — De'Von Achane = devon achane", () => {
    expect(canonicalName("De'Von Achane")).toBe('devon achane')
    expect(canonicalName("Ja'Marr Chase")).toBe('jamarr chase')
  })

  it('collapses dotted initials AND space-separated single letters — A.J. Brown = A J Brown = aj brown', () => {
    expect(canonicalName('A.J. Brown')).toBe('aj brown')
    expect(canonicalName('A J Brown')).toBe('aj brown')
    expect(canonicalName('AJ Brown')).toBe('aj brown')
  })

  it('PRESERVES Jr/Sr/II/III/IV/V suffixes — they distinguish father/son', () => {
    expect(canonicalName('Marvin Harrison Jr.')).toBe('marvin harrison jr')
    expect(canonicalName('Marvin Harrison')).toBe('marvin harrison')
    // The two MUST resolve to different keys so the dedupe pass keeps both.
    expect(canonicalName('Marvin Harrison Jr.')).not.toBe(canonicalName('Marvin Harrison'))
    expect(canonicalName('Calvin Ridley Sr')).toBe('calvin ridley sr')
    expect(canonicalName('Patrick Mahomes II')).toBe('patrick mahomes ii')
    expect(canonicalName('Robert Griffin III')).toBe('robert griffin iii')
    expect(canonicalName('Robert Downey IV')).toBe('robert downey iv')
  })

  it('strips diacritics — Níco = nico', () => {
    expect(canonicalName('Níco Collins')).toBe('nico collins')
  })

  it('returns empty for empty/whitespace input', () => {
    expect(canonicalName('')).toBe('')
    expect(canonicalName('   ')).toBe('')
  })

  it('Jr and Sr canonicalize differently (so father and son survive dedupe)', () => {
    expect(canonicalName('Marvin Harrison Jr.')).toBe('marvin harrison jr')
    expect(canonicalName('Marvin Harrison Sr.')).toBe('marvin harrison sr')
    expect(canonicalName('Marvin Harrison Jr.')).not.toBe(canonicalName('Marvin Harrison Sr.'))
  })
})

describe('canonicalPosition', () => {
  it('uppercases and trims', () => {
    expect(canonicalPosition('rb')).toBe('RB')
    expect(canonicalPosition(' WR ')).toBe('WR')
  })

  it('collapses DEF aliases to DEF', () => {
    expect(canonicalPosition('DEF')).toBe('DEF')
    expect(canonicalPosition('DST')).toBe('DEF')
    expect(canonicalPosition('D/ST')).toBe('DEF')
  })

  it('returns empty for null/undefined', () => {
    expect(canonicalPosition(null)).toBe('')
    expect(canonicalPosition(undefined)).toBe('')
  })
})

describe('canonicalTeam', () => {
  it('uppercases and trims', () => {
    expect(canonicalTeam('phi')).toBe('PHI')
    expect(canonicalTeam(' NYG ')).toBe('NYG')
  })

  it('returns empty for null', () => {
    expect(canonicalTeam(null)).toBe('')
    expect(canonicalTeam(undefined)).toBe('')
  })
})
