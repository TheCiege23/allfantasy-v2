import { describe, expect, it } from 'vitest'
import { adaptWaiverWirePlayer } from '@/lib/player-data/adapters/waiverPlayerAdapter'
import type { UnifiedPlayerWireDto } from '@/lib/player-data/serializeUnifiedPlayerForApi'

function wire(partial: Partial<UnifiedPlayerWireDto>): UnifiedPlayerWireDto {
  return {
    id: 'x',
    name: 'A',
    position: 'WR',
    team: 'KC',
    sport: 'NFL',
    headshotUrl: null,
    injuryStatus: 'Questionable',
    fantasyPointsPerGame: null,
    projectedPoints: 11.2,
    adp: 45,
    aiAdp: 40,
    aiAdpSampleSize: null,
    collegeClass: 'unknown',
    collegeClassLabel: null,
    soccerLeague: null,
    nflRookieIsRookie: null,
    nflRookieSource: null,
    lowConfidence: false,
    profileSource: 'ri',
    statsSource: 'ri',
    projectionsSource: 'ri',
    normalizedStats: {},
    normalizedProjections: {},
    product: { unified: {} as UnifiedPlayerWireDto['product']['unified'], yearsExp: 2, isRookie: false, byeWeek: null },
    ...partial,
  }
}

describe('waiverPlayerAdapter', () => {
  it('preserves wire fields and adds display aliases', () => {
    const row = adaptWaiverWirePlayer(wire({ headshotUrl: 'https://example.com/a.jpg' }))
    expect(row.id).toBe('x')
    expect(row.displayHeadshotUrl).toBe('https://example.com/a.jpg')
    expect(row.displayInjury).toBe('Questionable')
    expect(row.displayProjection).toBe(11.2)
  })

  it('computes experience summary from yearsExp', () => {
    const row = adaptWaiverWirePlayer(wire({ product: { unified: {} as any, yearsExp: 0, isRookie: true, byeWeek: null } }))
    expect(row.experienceSummary).toBe('Rookie')
  })

  it('adds source labels, ADP aliases, bye week, and stats summary for player cards', () => {
    const row = adaptWaiverWirePlayer(
      wire({
        adp: 18.4,
        aiAdp: null,
        projectionsSource: 'allfantasy:rolling_insights',
        statsSource: 'rolling_insights',
        normalizedStats: {
          fantasyPointsPerGame: 14.2,
          receivingYards: 870,
          receivingTouchdowns: 6,
        },
        product: { unified: {} as any, yearsExp: 3, isRookie: false, byeWeek: 10 },
      }),
    )

    expect(row.displayAdp).toBe(18.4)
    expect(row.displayAiAdp).toBeNull()
    expect(row.displayByeWeek).toBe(10)
    expect(row.projectionSourceLabel).toBe('Projection: AF rolling insights')
    expect(row.adpSourceLabel).toBe('Provider ADP')
    expect(row.statsSourceLabel).toBe('Stats: rolling insights')
    expect(row.dataQualityLabels).toContain('Provider ADP')
    expect(row.dataQualityLabels).toContain('AF ADP coming soon')
    expect(row.seasonStatsSummary).toEqual(['PPG 14.2', 'YDS 870', 'TD 6'])
  })

  it('labels NCAAF limited data without inventing missing stats', () => {
    const row = adaptWaiverWirePlayer(
      wire({
        sport: 'NCAAF',
        adp: null,
        projectedPoints: null,
        lowConfidence: true,
        statsSource: null,
        projectionsSource: null,
        normalizedStats: {},
      }),
    )

    expect(row.displayProjection).toBeNull()
    expect(row.dataQualityLabels).toContain('NCAAF limited data')
    expect(row.dataQualityLabels).toContain('Missing stats')
    expect(row.dataQualityLabels).toContain('Fallback projection')
    expect(row.seasonStatsSummary).toEqual([])
  })
})
