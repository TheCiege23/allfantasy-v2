import { describe, expect, it } from 'vitest'
import {
  buildPostCreateLeagueHomeHref,
  isPostCreateLeagueShellHandoff,
} from '@/lib/league/post-create-navigation'

describe('post-create handoff normalization', () => {
  it('routes all specialty formats with leagueId to /league/[id] with shared query flags', () => {
    const base = buildPostCreateLeagueHomeHref({
      leagueId: 'lg_1',
      leagueType: 'survivor',
      allowInviteLink: true,
    })
    expect(base.startsWith('/league/lg_1?')).toBe(true)
    const u = new URL(base, 'http://localhost')
    expect(u.searchParams.get('created')).toBe('1')
    expect(u.searchParams.get('guide')).toBe('settings')
    expect(u.searchParams.get('openChat')).toBe('league')
    expect(u.searchParams.get('showInvite')).toBe('1')
  })

  it('adds tournamentHub for tournament + first feeder league', () => {
    const href = buildPostCreateLeagueHomeHref({
      leagueId: 'feeder_a',
      leagueType: 'tournament',
      tournamentId: 'tour_99',
      allowInviteLink: false,
    })
    const u = new URL(href, 'http://localhost')
    expect(u.pathname).toBe('/league/feeder_a')
    expect(u.searchParams.get('tournamentHub')).toBe('tour_99')
  })

  it('falls back to app tournament commissioner when tournament has no feeder id yet', () => {
    const href = buildPostCreateLeagueHomeHref({
      leagueType: 'tournament',
      tournamentId: 'tour_only',
    })
    expect(href).toContain('/tournament/tour_only/commissioner')
    expect(href).toContain('created=1')
  })

  it('detects post-create shell handoff from search params', () => {
    expect(isPostCreateLeagueShellHandoff({ created: '1' })).toBe(true)
    expect(isPostCreateLeagueShellHandoff({ created: 'true' })).toBe(true)
    expect(isPostCreateLeagueShellHandoff({})).toBe(false)
  })

  it('encodes league ids in the path', () => {
    const href = buildPostCreateLeagueHomeHref({
      leagueId: 'league+id%test',
      leagueType: 'redraft',
    })
    expect(href).toContain(encodeURIComponent('league+id%test'))
  })
})
