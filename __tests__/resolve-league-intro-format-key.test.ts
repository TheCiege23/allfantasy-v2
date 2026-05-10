import { describe, expect, it } from 'vitest'
import { getFormatIntroMetadata } from '@/lib/league/format-engine'
import { getLeagueTypeMedia } from '@/lib/league-media/leagueTypeMedia'
import { resolveLeagueIntroFormatKey } from '@/lib/league/resolveLeagueIntroFormatKey'

describe('resolveLeagueIntroFormatKey', () => {
  it('prefers Prisma leagueType column over settings', () => {
    expect(
      resolveLeagueIntroFormatKey({
        leagueTypeColumn: 'redraft',
        settings: { league_type: 'guillotine' },
      }),
    ).toBe('redraft')
  })

  it('reads settings.league_type when column is empty', () => {
    expect(
      resolveLeagueIntroFormatKey({
        leagueTypeColumn: null,
        settings: { league_type: 'dynasty' },
      }),
    ).toBe('dynasty')
  })

  it('reads settings.leagueType (camelCase) when column is empty', () => {
    expect(
      resolveLeagueIntroFormatKey({
        leagueTypeColumn: undefined,
        settings: { leagueType: 'keeper' },
      }),
    ).toBe('keeper')
  })

  it('does not treat leagueVariant-like strings in settings as substring matches — exact keys only', () => {
    expect(
      resolveLeagueIntroFormatKey({
        leagueTypeColumn: null,
        settings: { league_type: 'guillotine_redraft' },
      }),
    ).toBe('guillotine_redraft')
  })

  it('returns undefined when no column or settings format key', () => {
    expect(
      resolveLeagueIntroFormatKey({
        leagueTypeColumn: null,
        settings: {},
      }),
    ).toBeUndefined()
  })
})

describe('league type media (poster / video assets)', () => {
  it('redraft uses neutral AllFantasy poster, not guillotine or another format’s image', () => {
    const m = getLeagueTypeMedia('redraft')
    expect(m.introVideo).toBe('/league-type-redraft-intro.mp4')
    expect(m.thumbnail).toBe('/af-crest.png')
    expect(m.thumbnail).not.toMatch(/guillotine/i)
  })

  it('guillotine uses guillotine poster and intro', () => {
    const m = getLeagueTypeMedia('guillotine')
    expect(m.thumbnail).toBe('/league-type-guillotine.png')
    expect(m.introVideo).toBe('/league-type-guillotine-intro.mp4')
  })

  it('dynasty uses dynasty poster', () => {
    expect(getLeagueTypeMedia('dynasty').thumbnail).toBe('/league-type-dynasty.png')
  })

  it('unknown key falls back to redraft media bundle (neutral poster)', () => {
    const m = getLeagueTypeMedia('definitely_not_a_format')
    expect(m.key).toBe('definitely_not_a_format')
    expect(m.introVideo).toBe('/league-type-redraft-intro.mp4')
    expect(m.thumbnail).toBe('/af-crest.png')
  })
})

describe('intro video selection via getFormatIntroMetadata', () => {
  it('redraft league uses redraft intro even when leagueVariant is guillotine (modifier misuse)', () => {
    const meta = getFormatIntroMetadata({
      sport: 'NFL',
      leagueType: resolveLeagueIntroFormatKey({
        leagueTypeColumn: 'redraft',
        settings: {},
      }),
      leagueVariant: 'guillotine',
    })
    expect(meta.introVideo).toBe('/league-type-redraft-intro.mp4')
    expect(meta.thumbnail).toBe('/af-crest.png')
    expect(meta.title).toContain('Redraft')
  })

  it('guillotine league uses guillotine intro', () => {
    const meta = getFormatIntroMetadata({
      sport: 'NFL',
      leagueType: 'guillotine',
      leagueVariant: null,
    })
    expect(meta.introVideo).toBe('/league-type-guillotine-intro.mp4')
    expect(meta.thumbnail).toBe('/league-type-guillotine.png')
  })

  it('dynasty league uses dynasty intro', () => {
    const meta = getFormatIntroMetadata({
      sport: 'NFL',
      leagueType: 'dynasty',
      leagueVariant: null,
    })
    expect(meta.introVideo).toBe('/league-type-dynasty-intro.mp4')
  })

  it('redraft + scoring-like variant does not switch to guillotine intro', () => {
    const meta = getFormatIntroMetadata({
      sport: 'NFL',
      leagueType: resolveLeagueIntroFormatKey({
        leagueTypeColumn: 'redraft',
        settings: { scoring_format: 'ppr' },
      }),
      leagueVariant: 'fb_half_ppr',
    })
    expect(meta.introVideo).toBe('/league-type-redraft-intro.mp4')
  })

  it('unknown intro format key falls back to redraft media', () => {
    const meta = getFormatIntroMetadata({
      sport: 'NFL',
      leagueType: resolveLeagueIntroFormatKey({
        leagueTypeColumn: null,
        settings: {},
      }),
    })
    expect(meta.introVideo).toBe('/league-type-redraft-intro.mp4')
    expect(meta.thumbnail).toBe('/af-crest.png')
  })
})
