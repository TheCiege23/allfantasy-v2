import { describe, expect, it } from 'vitest'
import { getSportThumbnailCandidates } from '@/lib/create-league-v2/create-league-media-assets'
import { resolveCreateLeagueHeroMedia } from '@/lib/create-league-v2/media-priority'
import { SPORT_MEDIA } from '@/lib/create-league-v2/theme'
import { getDraftTypeMedia } from '@/lib/league-media/draftTypeMedia'

describe('Create League packaged media registry', () => {
  it('NFL uses packaged Football.mp4 with legacy root mp4 fallback', () => {
    expect(SPORT_MEDIA.NFL?.video).toBe('/media/create-league/sports/videos/Football.mp4')
    expect(SPORT_MEDIA.NFL?.fallback).toBe('/Football.mp4')
  })

  it('NBA uses packaged Basketball.mp4 with legacy root fallback', () => {
    expect(SPORT_MEDIA.NBA?.video).toBe('/media/create-league/sports/videos/Basketball.mp4')
    expect(SPORT_MEDIA.NBA?.fallback).toBe('/Basketball.mp4')
  })

  it('Snake draft maps to packaged Snake Draft.mp4', () => {
    expect(getDraftTypeMedia('snake').selectionVideo).toBe('/media/create-league/drafts/videos/Snake Draft.mp4')
  })

  it('Missing draft video resolves to empty string without throwing', () => {
    expect(() => getDraftTypeMedia('slow_draft').selectionVideo).not.toThrow()
    expect(getDraftTypeMedia('slow_draft').selectionVideo).toBe('')
  })

  it('sport thumbnail candidates prefer packaged sports/thumbnail stem', () => {
    expect(getSportThumbnailCandidates('NFL')[0]).toBe('/media/create-league/sports/thumbnail/Football.png')
  })

  it('mediaFocus sport resolves sport clip', () => {
    const m = resolveCreateLeagueHeroMedia({
      leagueType: 'redraft',
      sport: 'NFL',
      draftType: 'snake',
      idpSelected: false,
      draftEmphasis: false,
      focus: 'sport',
    })
    expect(m.mediaKey).toBe('sport:NFL')
    expect(m.video).toBe(SPORT_MEDIA.NFL?.video)
  })

  it('mediaFocus draft resolves draft clip when shipped', () => {
    const m = resolveCreateLeagueHeroMedia({
      leagueType: 'redraft',
      sport: 'NFL',
      draftType: 'auction',
      idpSelected: false,
      draftEmphasis: false,
      focus: 'draft',
    })
    expect(m.mediaKey).toMatch(/^draft:/)
    expect(m.video).toContain('Auction Draft.mp4')
  })
})
