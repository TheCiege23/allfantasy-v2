import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveCreateLeagueHeroMedia } from '@/lib/create-league-v2/media-priority'
import { LEAGUE_TYPE_MEDIA, SPORT_MEDIA } from '@/lib/create-league-v2/theme'
import {
  resolveDraftIntroStemFromWizardId,
  resolveDraftIntroVideoUrl,
} from '@/lib/draft/draft-intro-video'
import { getDraftTypeMedia } from '@/lib/league-media/draftTypeMedia'
import { setClientLeagueCreateOptionsCatalog } from '@/lib/create-league-v2/options-catalog-client'
import { LEAGUE_CREATE_OPTIONS_CATALOG_V1 } from '@/lib/league-creation/options-catalog-seed-data'
import {
  getAllowedSportsForType,
  getDraftTypeOptions,
  isSportAllowedForType,
} from '@/lib/create-league-v2/rules-engine'

describe('resolveCreateLeagueHeroMedia (focus)', () => {
  const base = {
    leagueType: 'survivor' as const,
    sport: 'NFL' as const,
    draftType: 'snake' as const,
    idpSelected: false,
    draftEmphasis: false,
  }

  it('concept focus uses survivor concept clip first', () => {
    const m = resolveCreateLeagueHeroMedia({ ...base, focus: 'concept' })
    expect(m.mediaKey).toMatch(/^concept:/)
    expect(m.video).toBe(LEAGUE_TYPE_MEDIA.survivor?.video)
  })

  it('sport focus uses NFL sport clip first', () => {
    const m = resolveCreateLeagueHeroMedia({ ...base, focus: 'sport' })
    expect(m.mediaKey).toBe('sport:NFL')
    expect(m.video).toBe(SPORT_MEDIA.NFL.video)
  })

  it('draft focus uses snake draft intro when present', () => {
    const m = resolveCreateLeagueHeroMedia({ ...base, focus: 'draft' })
    expect(m.mediaKey).toMatch(/^draft:snake/)
    expect(m.video).toBe('/media/draft-intros/snake-draft-intro.mp4')
    expect(m.badge).toBe('Draft format')
  })

  it('draft focus falls back to concept when draft asset missing', () => {
    const m = resolveCreateLeagueHeroMedia({
      ...base,
      draftType: 'linear',
      focus: 'draft',
    })
    expect(m.mediaKey).toMatch(/^concept:/)
    expect(m.video).toBe(LEAGUE_TYPE_MEDIA.survivor?.video)
  })
})

describe('draft intro resolver (fail closed)', () => {
  it('returns snake path under /media/draft-intros/', () => {
    expect(resolveDraftIntroVideoUrl('snake')).toBe('/media/draft-intros/snake-draft-intro.mp4')
    expect(resolveDraftIntroVideoUrl('devy_snake')).toBe('/media/draft-intros/snake-draft-intro.mp4')
  })

  it('returns null for stems without shipped assets (no crash)', () => {
    expect(resolveDraftIntroVideoUrl('linear')).toBeNull()
    expect(resolveDraftIntroVideoUrl('auction')).toBeNull()
    expect(resolveDraftIntroVideoUrl('slow_draft')).toBeNull()
  })

  it('getDraftTypeMedia leaves selectionVideo empty when resolver fails closed', () => {
    const linear = getDraftTypeMedia('linear')
    expect(linear.selectionVideo).toBe('')
    const snake = getDraftTypeMedia('snake')
    expect(snake.selectionVideo).toBe('/media/draft-intros/snake-draft-intro.mp4')
  })

  it('maps wizard ids to intro stems', () => {
    expect(resolveDraftIntroStemFromWizardId('devy_snake')).toBe('snake')
    expect(resolveDraftIntroStemFromWizardId('c2c_linear')).toBe('linear')
  })
})

describe('Survivor catalog vs soccer', () => {
  beforeEach(() => {
    setClientLeagueCreateOptionsCatalog(LEAGUE_CREATE_OPTIONS_CATALOG_V1)
  })

  afterEach(() => {
    setClientLeagueCreateOptionsCatalog(null)
  })

  it('does not list SOCCER as allowed for survivor', () => {
    expect(getAllowedSportsForType('survivor')).not.toContain('SOCCER')
    expect(isSportAllowedForType('SOCCER', 'survivor')).toBe(false)
  })

  it('Survivor + NFL + snake remains valid and complete', () => {
    expect(isSportAllowedForType('NFL', 'survivor')).toBe(true)
    const opts = getDraftTypeOptions('survivor', 'NFL').map((o) => o.id)
    expect(opts).toContain('snake')
    const survivorTeams = LEAGUE_CREATE_OPTIONS_CATALOG_V1.teamCountOptionsByConceptSport.survivor?.NFL
    expect(survivorTeams).toEqual([16, 20, 24])
  })
})
