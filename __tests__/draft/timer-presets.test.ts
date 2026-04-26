import { describe, expect, it } from 'vitest'

import {
  classifySeconds,
  presetSeconds,
  resolveTimerSeconds,
  unitToSeconds,
  validateCustom,
} from '@/lib/draft/timer-presets'
import { pickTimerSecondsFromLeagueSettings } from '@/lib/league/league-settings-pick-timer'

describe('Draft Slice B.1 — timer-presets', () => {
  it('preset 10 seconds resolves to 10', () => {
    expect(presetSeconds('10s')).toBe(10)
    expect(resolveTimerSeconds('10s', null)).toBe(10)
  })

  it('preset 30 seconds resolves to 30', () => {
    expect(resolveTimerSeconds('30s', null)).toBe(30)
  })

  it('preset 1 minute resolves to 60', () => {
    expect(resolveTimerSeconds('60s', null)).toBe(60)
  })

  it('preset 1 hour resolves to 3600', () => {
    expect(resolveTimerSeconds('3600s', null)).toBe(3600)
  })

  it('off resolves to null (no countdown)', () => {
    expect(resolveTimerSeconds('off', null)).toBeNull()
  })

  it('custom 15 seconds resolves to 15', () => {
    expect(resolveTimerSeconds('custom', 15)).toBe(15)
  })

  it('custom 1 second is allowed (min 1)', () => {
    expect(resolveTimerSeconds('custom', 1)).toBe(1)
  })

  it('custom value clamps above 86400', () => {
    expect(resolveTimerSeconds('custom', 999999)).toBe(86400)
  })

  it('classifies known seconds back to a preset', () => {
    expect(classifySeconds(60)).toEqual({ preset: '60s', customSeconds: null })
    expect(classifySeconds(3600)).toEqual({ preset: '3600s', customSeconds: null })
  })

  it('classifies unknown seconds as custom', () => {
    expect(classifySeconds(15)).toEqual({ preset: 'custom', customSeconds: 15 })
  })

  it('classifies null/0 as off', () => {
    expect(classifySeconds(null)).toEqual({ preset: 'off', customSeconds: null })
    expect(classifySeconds(0)).toEqual({ preset: 'off', customSeconds: null })
  })

  it('unitToSeconds converts minutes/hours', () => {
    expect(unitToSeconds(2, 'minutes')).toBe(120)
    expect(unitToSeconds(3, 'hours')).toBe(10800)
  })

  it('validateCustom rejects out-of-bound values', () => {
    expect(validateCustom(0, 'seconds')).not.toBeNull()
    expect(validateCustom(86401, 'seconds')).not.toBeNull()
    expect(validateCustom(25, 'hours')).not.toBeNull()
    expect(validateCustom(15, 'seconds')).toBeNull()
  })
})

describe('Draft Slice B.1 — pickTimerSecondsFromLeagueSettings', () => {
  it('does not clamp 15 to 90 (custom 15 saves 15)', () => {
    expect(pickTimerSecondsFromLeagueSettings('custom', 15)).toBe(15)
  })

  it('off resolves to 0', () => {
    expect(pickTimerSecondsFromLeagueSettings('off', null)).toBe(0)
  })

  it('preset 10s resolves to 10', () => {
    expect(pickTimerSecondsFromLeagueSettings('10s', null)).toBe(10)
  })

  it('preset 1h resolves to 3600', () => {
    expect(pickTimerSecondsFromLeagueSettings('3600s', null)).toBe(3600)
  })
})
