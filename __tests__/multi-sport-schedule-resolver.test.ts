import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUniqueMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scheduleTemplate: {
      findUnique: findUniqueMock,
    },
  },
}))

import {
  resolveScheduleContext,
  resolveScheduleContextForLeague,
} from '@/lib/multi-sport/MultiSportScheduleResolver'

describe('MultiSportScheduleResolver', () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
  })

  it('returns deterministic fallback context for sync resolver', () => {
    const ctx = resolveScheduleContext('NBA', 2026, 3)
    expect(ctx).toEqual({
      sportType: 'NBA',
      season: 2026,
      currentWeekOrRound: 3,
      totalWeeksOrRounds: 24,
      label: 'round',
    })
  })

  it('uses schedule template totals when template exists', async () => {
    findUniqueMock.mockResolvedValue({
      regularSeasonWeeks: 20,
      playoffWeeks: 4,
    })

    const ctx = await resolveScheduleContextForLeague('NHL', 2026, 8, 'standard')

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        uniq_schedule_template_sport_format: {
          sportType: 'NHL',
          formatType: 'STANDARD',
        },
      },
      select: {
        regularSeasonWeeks: true,
        playoffWeeks: true,
      },
    })
    expect(ctx.totalWeeksOrRounds).toBe(24)
    expect(ctx.label).toBe('round')
  })

  it('falls back when schedule template cannot be loaded', async () => {
    findUniqueMock.mockRejectedValue(new Error('db offline'))

    const ctx = await resolveScheduleContextForLeague('NFL', 2026, 5)

    expect(ctx).toEqual({
      sportType: 'NFL',
      season: 2026,
      currentWeekOrRound: 5,
      totalWeeksOrRounds: 18,
      label: 'week',
    })
  })
})
