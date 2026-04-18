import { describe, expect, it } from 'vitest'
import { buildUserTemporalContextForAI } from '@/lib/preferences/userTemporalContextForAI'

describe('buildUserTemporalContextForAI', () => {
  it('formats fixed instant in America/New_York and exposes calendar date in zone', () => {
    const fixed = new Date('2026-04-17T05:41:00.000Z')
    const ctx = buildUserTemporalContextForAI({
      timezone: 'America/New_York',
      preferredLanguage: 'en',
      now: fixed,
    })
    expect(ctx.userTimezone).toBe('America/New_York')
    expect(ctx.utcNowIso).toBe(fixed.toISOString())
    expect(ctx.userLocalCalendarDate).toMatch(/2026-04-1[67]/)
    expect(ctx.promptLine).toContain('2026')
    expect(ctx.promptLine).toContain('America/New_York')
  })

  it('falls back to default timezone when profile timezone invalid', () => {
    const ctx = buildUserTemporalContextForAI({
      timezone: 'Invalid/Zone',
      now: new Date('2026-01-01T12:00:00.000Z'),
    })
    expect(ctx.userTimezone).toBeTruthy()
    expect(ctx.userLocalCalendarDate.length).toBeGreaterThanOrEqual(10)
  })
})
