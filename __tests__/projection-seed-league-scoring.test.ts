import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveProjectionSeed } from '@/lib/multi-sport/ProjectionSeedResolver'
import type { ScoringRuleDto } from '@/lib/multi-sport/ScoringTemplateResolver'

const mockGetLeagueSettingsForScoring = vi.fn()
const mockResolveFormatTypeFromLeagueSettings = vi.fn()
const mockGetScoringTemplateForSport = vi.fn()
const mockResolveScoringRulesForLeague = vi.fn()
const mockResolveScheduleContextForLeague = vi.fn()

vi.mock('@/lib/multi-sport/MultiSportScoringResolver', () => ({
  getLeagueSettingsForScoring: (...args: unknown[]) =>
    mockGetLeagueSettingsForScoring(...args),
  resolveFormatTypeFromLeagueSettings: (...args: unknown[]) =>
    mockResolveFormatTypeFromLeagueSettings(...args),
  getScoringTemplateForSport: (...args: unknown[]) =>
    mockGetScoringTemplateForSport(...args),
  resolveScoringRulesForLeague: (...args: unknown[]) =>
    mockResolveScoringRulesForLeague(...args),
}))

vi.mock('@/lib/multi-sport/MultiSportScheduleResolver', () => ({
  resolveScheduleContextForLeague: (...args: unknown[]) =>
    mockResolveScheduleContextForLeague(...args),
}))

describe('ProjectionSeedResolver league scoring behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveScheduleContextForLeague.mockResolvedValue({
      sportType: 'NFL',
      season: 2026,
      currentWeekOrRound: 5,
      totalWeeksOrRounds: 18,
      label: 'week',
    })
  })

  it('uses template rules when no leagueId is provided', async () => {
    const templateRules: ScoringRuleDto[] = [
      { statKey: 'passing_td', pointsValue: 4, multiplier: 1, enabled: true },
    ]
    mockResolveFormatTypeFromLeagueSettings.mockReturnValue(undefined)
    mockGetScoringTemplateForSport.mockResolvedValue({
      templateId: 'NFL-PPR',
      rules: templateRules,
    })

    const seed = await resolveProjectionSeed({
      leagueSport: 'NFL',
      season: 2026,
      weekOrRound: 5,
      formatType: 'PPR',
    })

    expect(mockResolveScoringRulesForLeague).not.toHaveBeenCalled()
    expect(seed.templateId).toBe('NFL-PPR')
    expect(seed.scoringRules).toEqual(templateRules)
  })

  it('uses league-resolved scoring rules when leagueId is provided', async () => {
    const templateRules: ScoringRuleDto[] = [
      { statKey: 'passing_td', pointsValue: 4, multiplier: 1, enabled: true },
    ]
    const leagueRules: ScoringRuleDto[] = [
      { statKey: 'passing_td', pointsValue: 6, multiplier: 1, enabled: true },
    ]
    mockGetLeagueSettingsForScoring.mockResolvedValue({
      leagueVariant: 'HALF_PPR',
    })
    mockResolveFormatTypeFromLeagueSettings.mockReturnValue('HALF_PPR')
    mockGetScoringTemplateForSport.mockResolvedValue({
      templateId: 'NFL-HALF_PPR',
      rules: templateRules,
    })
    mockResolveScoringRulesForLeague.mockResolvedValue(leagueRules)

    const seed = await resolveProjectionSeed({
      leagueId: 'league-1',
      leagueSport: 'NFL',
      season: 2026,
      weekOrRound: 5,
    })

    expect(mockResolveScoringRulesForLeague).toHaveBeenCalledWith(
      'league-1',
      'NFL',
      undefined,
      { leagueVariant: 'HALF_PPR' }
    )
    expect(seed.templateId).toBe('NFL-HALF_PPR')
    expect(seed.scoringRules).toEqual(leagueRules)
  })
})
