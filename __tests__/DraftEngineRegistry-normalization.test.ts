import { describe, expect, it } from 'vitest'
import {
  DraftEngineRegistry,
  isDraftModeSupported,
  isWeightedLotteryOrderType,
} from '@/lib/draft-engine/DraftEngineRegistry'

// ─── Sport normalization ─────────────────────────────────────────────────────

describe('DraftEngineRegistry – sport normalization', () => {
  it('resolves uppercase SOCCER alias to Soccer defaults', () => {
    const d = DraftEngineRegistry.getSportDefaults('SOCCER' as never)
    expect(d).not.toBeNull()
    expect(d?.supportedDraftTypes).toContain('snake')
    expect(d?.supportedDraftTypes).toContain('auction')
  })

  it('resolves lowercase soccer alias to Soccer defaults', () => {
    const d = DraftEngineRegistry.getSportDefaults('soccer' as never)
    expect(d).not.toBeNull()
    expect(d?.defaultRoundCount).toBe(18)
  })

  it('resolves canonical Soccer (title-case) to Soccer defaults', () => {
    const d = DraftEngineRegistry.getSportDefaults('Soccer')
    expect(d).not.toBeNull()
  })

  it('returns null for completely unknown sport', () => {
    expect(DraftEngineRegistry.getSportDefaults('CRICKET' as never)).toBeNull()
    expect(DraftEngineRegistry.getSportDefaults('' as never)).toBeNull()
  })

  it.each([
    ['NFL', 18],
    ['NBA', 15],
    ['MLB', 25],
    ['NHL', 20],
    ['NCAAB', 16],
    ['NCAAF', 20],
    ['Soccer', 18],
  ] as const)('%s has expected default round count of %d', (sport, rounds) => {
    expect(DraftEngineRegistry.getSportDefaults(sport)?.defaultRoundCount).toBe(rounds)
  })
})

// ─── Draft type normalization ────────────────────────────────────────────────

describe('DraftEngineRegistry – draft type normalization', () => {
  it.each([
    ['snake', 'NFL', true],
    ['linear', 'NFL', true],
    ['auction', 'NFL', true],
    ['salary-cap', 'NFL', true],
    ['salary_cap', 'NFL', true], // underscore alias
    ['third-round-reversal', 'NFL', true],
    ['third_round_reversal', 'NFL', true], // underscore alias
    ['3rd_reversal', 'NFL', true], // short alias
    ['dynasty-startup', 'NFL', true],
    ['dynasty_startup', 'NFL', true], // underscore alias
    ['startup_draft', 'NFL', true], // lifecycle alias
    ['dynasty-rookie', 'NFL', true],
    ['dynasty_rookie', 'NFL', true], // underscore alias
    ['rookie_draft', 'NFL', true], // lifecycle alias
    ['big-brother', 'NFL', false], // not in NFL supported list
    ['big_brother', 'NFL', false], // underscore alias — still not in NFL list
  ] as const)(
    'isDraftTypeSupportedBySport(%s, %s) → %s',
    (draftType, sport, expected) => {
      expect(DraftEngineRegistry.isDraftTypeSupportedBySport(sport, draftType)).toBe(expected)
    }
  )

  it('returns false for unrecognized draft type id', () => {
    expect(DraftEngineRegistry.isDraftTypeSupportedBySport('NFL', 'mystery_draft')).toBe(false)
    expect(DraftEngineRegistry.isDraftTypeSupportedBySport('NFL', '')).toBe(false)
  })

  it('returns false when sport is unknown', () => {
    expect(DraftEngineRegistry.isDraftTypeSupportedBySport('CRICKET' as never, 'snake')).toBe(false)
  })

  it('getSupportedDraftTypes returns empty array for unknown sport', () => {
    expect(DraftEngineRegistry.getSupportedDraftTypes('CRICKET' as never)).toEqual([])
    expect(DraftEngineRegistry.getSupportedDraftTypes('' as never)).toEqual([])
  })

  it('getSupportedDraftTypes normalizes SOCCER to Soccer list', () => {
    const types = DraftEngineRegistry.getSupportedDraftTypes('SOCCER' as never)
    expect(types).toContain('snake')
    expect(types).toContain('auction')
    // Soccer does not support dynasty-startup or dynasty-rookie
    expect(types).not.toContain('dynasty-startup')
    expect(types).not.toContain('dynasty-rookie')
  })
})

// ─── getDefaultDraftTemplate normalization ───────────────────────────────────

describe('DraftEngineRegistry – getDefaultDraftTemplate normalization', () => {
  it('produces a template for NFL snake using canonical ids', () => {
    const tpl = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'league-1', 12, 'snake')
    expect(tpl).not.toBeNull()
    expect(tpl?.sport).toBe('NFL')
    expect(tpl?.type).toBe('snake')
    expect(tpl?.totalTeams).toBe(12)
    expect(tpl?.rounds.length).toBe(18)
    expect(tpl?.totalPicks).toBe(12 * 18)
  })

  it('produces a template for SOCCER / soccer aliases', () => {
    const tplUpper = DraftEngineRegistry.getDefaultDraftTemplate('SOCCER' as never, 'league-2', 10, 'snake')
    expect(tplUpper).not.toBeNull()
    expect(tplUpper?.sport).toBe('Soccer')

    const tplLower = DraftEngineRegistry.getDefaultDraftTemplate('soccer' as never, 'league-3', 10, 'snake')
    expect(tplLower).not.toBeNull()
    expect(tplLower?.sport).toBe('Soccer')
  })

  it('normalizes underscore draft type aliases', () => {
    const tplSalary = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'league-4', 12, 'salary_cap')
    expect(tplSalary).not.toBeNull()
    expect(tplSalary?.type).toBe('salary-cap')

    const tpl3rr = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'league-5', 12, 'third_round_reversal')
    expect(tpl3rr).not.toBeNull()
    expect(tpl3rr?.type).toBe('third-round-reversal')

    const tplStartup = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'league-6', 12, 'startup_draft')
    expect(tplStartup).not.toBeNull()
    expect(tplStartup?.type).toBe('dynasty-startup')

    const tplRookie = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'league-7', 12, 'rookie_draft')
    expect(tplRookie).not.toBeNull()
    expect(tplRookie?.type).toBe('dynasty-rookie')
  })

  it('returns null for unknown sport', () => {
    expect(DraftEngineRegistry.getDefaultDraftTemplate('CRICKET' as never, 'l', 12, 'snake')).toBeNull()
  })

  it('returns null for unknown draft type', () => {
    expect(DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'l', 12, 'mystery_draft')).toBeNull()
  })

  it('returns null for draft type unsupported by sport', () => {
    // big-brother is not in Soccer supported types
    expect(DraftEngineRegistry.getDefaultDraftTemplate('Soccer', 'l', 12, 'big-brother')).toBeNull()
    // dynasty-rookie is not supported by Soccer
    expect(DraftEngineRegistry.getDefaultDraftTemplate('Soccer', 'l', 12, 'dynasty-rookie')).toBeNull()
    // NCAAB doesn't include dynasty-rookie
    expect(DraftEngineRegistry.getDefaultDraftTemplate('NCAAB', 'l', 12, 'dynasty-rookie')).toBeNull()
  })

  it('sets timer defaults from sport row', () => {
    const tpl = DraftEngineRegistry.getDefaultDraftTemplate('NBA', 'l', 10, 'snake')
    expect(tpl?.timer.secondsPerPick).toBe(90)
    const tplNFL = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'l', 10, 'snake')
    expect(tplNFL?.timer.secondsPerPick).toBe(120)
  })

  it('builds a correct order with teamCount entries', () => {
    const tpl = DraftEngineRegistry.getDefaultDraftTemplate('NFL', 'l', 8, 'linear')
    expect(tpl?.order).toHaveLength(8)
    expect(tpl?.order[0]).toMatchObject({ position: 1, teamId: 'team-1' })
    expect(tpl?.order[7]).toMatchObject({ position: 8, teamId: 'team-8' })
  })

  it('sets mode to live by default for all sports', () => {
    for (const sport of ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer'] as const) {
      const tpl = DraftEngineRegistry.getDefaultDraftTemplate(sport, 'l', 10, 'snake')
      expect(tpl?.mode).toBe('live')
    }
  })
})

// ─── isDraftModeSupported ────────────────────────────────────────────────────

describe('isDraftModeSupported', () => {
  it.each(['live', 'slow', 'email', 'offline', 'auto'])('accepts %s', (mode) => {
    expect(isDraftModeSupported(mode)).toBe(true)
  })

  it('rejects unknown modes', () => {
    expect(isDraftModeSupported('async')).toBe(false)
    expect(isDraftModeSupported('manual')).toBe(false)
    expect(isDraftModeSupported('')).toBe(false)
  })
})

// ─── isWeightedLotteryOrderType ──────────────────────────────────────────────

describe('isWeightedLotteryOrderType', () => {
  it('returns true only for weighted-lottery', () => {
    expect(isWeightedLotteryOrderType('weighted-lottery')).toBe(true)
  })

  it.each(['randomized', 'manual', 'previous-season', 'ai-generated', ''])('rejects %s', (v) => {
    expect(isWeightedLotteryOrderType(v)).toBe(false)
  })
})
