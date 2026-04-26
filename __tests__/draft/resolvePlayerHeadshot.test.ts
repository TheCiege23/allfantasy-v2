import { describe, expect, it } from 'vitest'

import {
  isValidHeadshotUrl,
  normalizePlayerName,
} from '@/lib/player-assets/resolvePlayerHeadshot'

describe('E.1.5 — isValidHeadshotUrl', () => {
  it('rejects synthesized data: URIs (the AF placeholder bug)', () => {
    expect(
      isValidHeadshotUrl(
        'data:image/svg+xml;utf8,%3Csvg%3E%3Ctext%3EAF%3C%2Ftext%3E%3C%2Fsvg%3E',
      ),
    ).toBe(false)
    expect(isValidHeadshotUrl('data:image/png;base64,iVBORw0KGgo')).toBe(false)
  })

  it('rejects team-logo URLs (must not be the main avatar)', () => {
    expect(isValidHeadshotUrl('https://a.espncdn.com/i/teamLogos/nfl/500/atl.png')).toBe(false)
    expect(isValidHeadshotUrl('https://a.espncdn.com/i/teamLogo/nfl/500/cin.png')).toBe(false)
  })

  it('accepts real player headshot URLs', () => {
    expect(isValidHeadshotUrl('https://sleepercdn.com/content/nfl/players/1234.jpg')).toBe(true)
    expect(isValidHeadshotUrl('https://a.espncdn.com/i/headshots/nfl/players/full/12345.png')).toBe(true)
    expect(isValidHeadshotUrl('https://www.thesportsdb.com/images/media/player/cutout/abc.png')).toBe(true)
  })

  it('rejects null / empty / whitespace / non-http schemes', () => {
    expect(isValidHeadshotUrl(null)).toBe(false)
    expect(isValidHeadshotUrl(undefined)).toBe(false)
    expect(isValidHeadshotUrl('')).toBe(false)
    expect(isValidHeadshotUrl('   ')).toBe(false)
    expect(isValidHeadshotUrl('javascript:void(0)')).toBe(false)
    expect(isValidHeadshotUrl('/relative/path/foo.png')).toBe(false)
  })
})

describe('E.1.5 — normalizePlayerName', () => {
  it('strips apostrophes and lowercases', () => {
    expect(normalizePlayerName("Ja'Marr Chase")).toBe('jamarr chase')
    expect(normalizePlayerName("De'Von Achane")).toBe('devon achane')
  })

  it('strips periods (A.J. Brown → aj brown)', () => {
    expect(normalizePlayerName('A.J. Brown')).toBe('aj brown')
    expect(normalizePlayerName('T.J. Hockenson')).toBe('tj hockenson')
  })

  it('drops trailing suffixes Jr/Sr/II/III/IV/V', () => {
    expect(normalizePlayerName('Brian Thomas Jr.')).toBe('brian thomas')
    expect(normalizePlayerName('Patrick Mahomes II')).toBe('patrick mahomes')
    expect(normalizePlayerName('Marvin Harrison Jr')).toBe('marvin harrison')
    expect(normalizePlayerName('Robert Griffin III')).toBe('robert griffin')
  })

  it('preserves multi-word last names that include hyphens (treated as spaces)', () => {
    expect(normalizePlayerName('Amon-Ra St. Brown')).toBe('amon ra st brown')
  })

  it('handles empty/null/undefined safely', () => {
    expect(normalizePlayerName(null)).toBe('')
    expect(normalizePlayerName(undefined)).toBe('')
    expect(normalizePlayerName('')).toBe('')
    expect(normalizePlayerName('   ')).toBe('')
  })

  it('two players with apostrophe vs no-apostrophe variants normalize to same key', () => {
    expect(normalizePlayerName("Ja'Marr Chase")).toBe(normalizePlayerName('Jamarr Chase'))
    expect(normalizePlayerName("D'Andre Swift")).toBe(normalizePlayerName('DAndre Swift'))
  })
})
