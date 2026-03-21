import { describe, expect, it } from 'vitest'
import { getSportsForSelector, getDashboardSportOrder } from '@/lib/multi-sport/SportSelectorUIService'
import { groupLeaguesBySport } from '@/lib/dashboard/DashboardSportGroupingService'
import { buildSportContextString, resolveSportForAI } from '@/lib/ai/AISportContextResolver'
import {
  buildDraftRecommendationContext,
  buildWaiverRecommendationContext,
  buildRosterRecommendationContext,
} from '@/lib/ai/SportAwareRecommendationService'
import { getPositionFilterOptionsForSport } from '@/lib/draft-room/SportDraftUIResolver'
import { getPositionFiltersForSport } from '@/lib/waiver-wire/SportWaiverResolver'

describe('Prompt 4 multi-sport UI + AI integration', () => {
  it('exposes required league creation sports in selector options', () => {
    const selectorSports = getSportsForSelector().map((s) => s.value)
    expect(selectorSports).toEqual(
      expect.arrayContaining(['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'])
    )
  })

  it('orders dashboard sport groups in requested order while preserving NFL first', () => {
    const order = getDashboardSportOrder()
    expect(order.slice(0, 7)).toEqual(['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'])
  })

  it('groups leagues visually by sport with requested section ordering', () => {
    const groups = groupLeaguesBySport([
      { id: '1', sport: 'NBA', name: 'NBA League' },
      { id: '2', sport: 'NHL', name: 'NHL League' },
      { id: '3', sport: 'NFL', name: 'NFL League' },
      { id: '4', sport: 'NCAAB', name: 'NCAAB League' },
      { id: '5', sport: 'SOCCER', name: 'Soccer League' },
    ])

    expect(groups.map((g) => g.sport)).toEqual(['NFL', 'NHL', 'NBA', 'NCAAB', 'SOCCER'])
    expect(groups[0]?.emoji).toBe('🏈')
    expect(groups[1]?.emoji).toBe('🏒')
  })

  it('resolves and propagates sport context for AI recommendation layers', () => {
    const resolvedSport = resolveSportForAI({ sport: 'NCAAF' })
    expect(resolvedSport).toBe('NCAAF')

    const context = buildSportContextString({
      sport: resolvedSport,
      leagueName: 'Campus Dynasty',
      numTeams: 12,
      format: 'PPR',
      currentWeek: 5,
    })
    expect(context).toContain('Sport: NCAAF')
    expect(context).toContain('League: Campus Dynasty')

    expect(buildDraftRecommendationContext({ sport: 'MLB' })).toContain('Sport: MLB')
    expect(buildWaiverRecommendationContext({ sport: 'NBA' })).toContain('Sport: NBA')
    expect(buildRosterRecommendationContext({ sport: 'NHL' })).toContain('Sport: NHL')
  })

  it('returns sport-specific draft and waiver position filters', () => {
    const nhlDraftFilters = getPositionFilterOptionsForSport('NHL').map((f) => f.value)
    expect(nhlDraftFilters).toEqual(expect.arrayContaining(['All', 'C', 'LW', 'RW', 'D', 'G']))

    const ncaabWaiverFilters = getPositionFiltersForSport('NCAAB')
    expect(ncaabWaiverFilters).toEqual(expect.arrayContaining(['ALL', 'G', 'F', 'C', 'UTIL']))
  })
})
