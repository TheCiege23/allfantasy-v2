import { describe, expect, it } from 'vitest'
import { classifyAvatarSource, initialsFor } from '@/lib/draft-room/classify-avatar-source'

describe('E.1 — classifyAvatarSource', () => {
  it('null/empty → null', () => {
    expect(classifyAvatarSource(null)).toBe('null')
    expect(classifyAvatarSource(undefined)).toBe('null')
    expect(classifyAvatarSource('')).toBe('null')
    expect(classifyAvatarSource('   ')).toBe('null')
  })

  it('data: URI → synthesized (the cause of the giant "AF" letter in PlayerDetailModal)', () => {
    expect(
      classifyAvatarSource(
        'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctext%3EAF%3C%2Ftext%3E%3C%2Fsvg%3E',
      ),
    ).toBe('synthesized')
    expect(classifyAvatarSource('data:image/png;base64,iVBORw0KGgoA')).toBe('synthesized')
  })

  it('ESPN /teamLogos/ path → team_logo_badge_only (must not be the main avatar)', () => {
    expect(classifyAvatarSource('https://a.espncdn.com/i/teamLogos/nfl/500/atl.png')).toBe('team_logo_badge_only')
    expect(classifyAvatarSource('https://a.espncdn.com/i/teamLogos/nfl/500/phi.png')).toBe('team_logo_badge_only')
    expect(classifyAvatarSource('https://a.espncdn.com/i/teamLogo/nfl/500/cin.png')).toBe('team_logo_badge_only')
  })

  it('real CDN headshot → headshot', () => {
    expect(classifyAvatarSource('https://sleepercdn.com/content/nfl/players/1234.jpg')).toBe('headshot')
    expect(classifyAvatarSource('https://a.espncdn.com/i/headshots/nfl/players/full/12345.png')).toBe('headshot')
    expect(classifyAvatarSource('https://static.www.nfl.com/image/private/foo/bar.png')).toBe('headshot')
  })

  it('relative or unknown scheme → null (no broken icon)', () => {
    expect(classifyAvatarSource('/static/players/foo.png')).toBe('null')
    expect(classifyAvatarSource('javascript:void(0)')).toBe('null')
  })
})

describe('E.1 — initialsFor', () => {
  it('two-word player → first + last initial', () => {
    expect(initialsFor('Bijan Robinson')).toBe('BR')
    expect(initialsFor("Ja'Marr Chase")).toBe('JC')
    expect(initialsFor('Justin Jefferson')).toBe('JJ')
    expect(initialsFor('Christian McCaffrey')).toBe('CM')
  })

  it('three-word player uses first + last (skips middle)', () => {
    expect(initialsFor('Amon-Ra St. Brown')).toBe('AB')
    expect(initialsFor('A.J. Brown')).toBe('AB')
  })

  it('single-name player → first letter only', () => {
    expect(initialsFor('Pelé')).toBe('P')
  })

  it('empty/missing → ?', () => {
    expect(initialsFor('')).toBe('?')
    expect(initialsFor(null)).toBe('?')
    expect(initialsFor(undefined)).toBe('?')
    expect(initialsFor('   ')).toBe('?')
  })

  it('does NOT produce "AF" for any real player name (the bug we fixed)', () => {
    for (const name of ['Bijan Robinson', "Ja'Marr Chase", 'Saquon Barkley', 'Lamar Jackson', 'Patrick Mahomes']) {
      expect(initialsFor(name)).not.toBe('AF')
    }
  })
})
