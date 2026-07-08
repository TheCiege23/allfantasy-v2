import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { SeasonOutlook } from '@/app/dashboard/components/warroom/SeasonOutlook'
import type { UserLeague } from '@/app/dashboard/types'
import type { TrajectorySummary } from '@/lib/trajectory/summarize'

vi.mock('@/components/i18n/LanguageProviderClient', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string, vars: Record<string, string | number> = {}) => {
      const entries = Object.entries(vars)
      return entries.length ? `${key}(${entries.map(([k, v]) => `${k}=${v}`).join(',')})` : key
    },
  }),
}))

// ChampionshipGauge uses IntersectionObserver via useCountUp; stub it out.
vi.mock('@/app/dashboard/components/warroom/ChampionshipGauge', () => ({
  ChampionshipGauge: ({ percent, label }: { percent: number; label: string }) => (
    <div data-testid="gauge">{label}:{percent}</div>
  ),
}))

const league = {
  id: 'lg',
  name: 'Test League',
  sport: 'NFL',
  lifecycleState: 'in_season',
  season: 2026,
  currentWeek: 2,
} as unknown as UserLeague

function summary(o: Partial<TrajectorySummary>): TrajectorySummary {
  return {
    metricId: 'season.metric',
    supported: true,
    hasChange: false,
    direction: null,
    absolute: null,
    percent: null,
    confidence: null,
    currentValue: null,
    previousValue: null,
    whyChanged: null,
    ...o,
  }
}

function stubFetch(trajectories: Record<string, Record<string, TrajectorySummary>>) {
  global.fetch = vi.fn((url: string) => {
    if (url.includes('/api/league/detail')) {
      return Promise.resolve({ ok: true, json: async () => ({ teams: [{ externalId: 't1', claimedByUserId: 'u1' }] }) })
    }
    if (url.includes('season-forecast')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          teamForecasts: [
            { teamId: 't1', playoffProbability: 58, championshipProbability: 12, expectedWins: 6.9, expectedFinalSeed: 4, eliminationRisk: 20 },
          ],
          trajectories,
        }),
      })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  }) as unknown as typeof fetch
}

afterEach(() => vi.restoreAllMocks())

describe('SeasonOutlook trajectory (Phase 3.4)', () => {
  it('shows real delta + confidence chips when a previous snapshot exists', async () => {
    stubFetch({
      t1: {
        playoffProbability: summary({ hasChange: true, direction: 'up', currentValue: 58, previousValue: 40, confidence: 0.8 }),
        championshipProbability: summary({ hasChange: true, direction: 'up', currentValue: 12, previousValue: 8 }),
        expectedWins: summary({ hasChange: true, direction: 'up', currentValue: 6.9, previousValue: 6.1 }),
        expectedFinalSeed: summary({ hasChange: true, direction: 'down', currentValue: 4, previousValue: 6 }),
      },
    })
    const { container } = render(<SeasonOutlook league={league} userId="u1" />)

    // Playoff odds delta chip (58 − 40 = 18 at 0 decimals).
    await waitFor(() => expect(container.querySelector('[aria-label*="changeUp(value=18)"]')).toBeTruthy())
    // Expected-wins delta chip (6.9 − 6.1 = 0.8 at 1 decimal).
    expect(container.querySelector('[aria-label*="changeUp(value=0.8)"]')).toBeTruthy()
    // Projected-seed improved (6 → 4): honest downward movement chip.
    expect(container.querySelector('[aria-label*="changeDown(value=2)"]')).toBeTruthy()
    // Source-provided confidence surfaced honestly.
    expect(container.textContent).toContain('confidence(pct=80)')
  })

  it('self-gates silently when there is no previous snapshot', async () => {
    stubFetch({
      t1: {
        playoffProbability: summary({ hasChange: false, currentValue: 58 }),
        championshipProbability: summary({ hasChange: false, currentValue: 12 }),
        expectedWins: summary({ hasChange: false, currentValue: 6.9 }),
        expectedFinalSeed: summary({ hasChange: false, currentValue: 4 }),
      },
    })
    const { container } = render(<SeasonOutlook league={league} userId="u1" />)

    // The card still renders its core (gauges), proving it loaded...
    await waitFor(() => expect(screen.getAllByTestId('gauge').length).toBeGreaterThan(0))
    // ...but no trajectory chips or confidence chip appear.
    expect(container.querySelector('[aria-label*="changeUp"]')).toBeNull()
    expect(container.querySelector('[aria-label*="changeDown"]')).toBeNull()
    expect(container.textContent).not.toContain('confidence(')
  })
})
