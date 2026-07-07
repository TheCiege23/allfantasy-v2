import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { InjuryImpactPanel } from '@/app/dashboard/components/warroom/InjuryImpactPanel'
import type { UserLeague } from '@/app/dashboard/types'

vi.mock('@/components/i18n/LanguageProviderClient', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string, vars: Record<string, string | number> = {}) => {
      const entries = Object.entries(vars)
      return entries.length ? `${key}(${entries.map(([k, v]) => `${k}=${v}`).join(',')})` : key
    },
  }),
}))

const league = { id: 'lg1', name: 'Test League', sport: 'NFL' } as UserLeague

function stubFetch(result: unknown) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => result }) as unknown as typeof fetch
}

function player(overrides: Record<string, unknown>) {
  return {
    playerKey: 'pk',
    name: 'Player',
    position: 'WR',
    team: 'PHI',
    sport: 'NFL',
    statusRaw: 'Questionable',
    severity: 'questionable',
    source: 'injury_report',
    sourceId: 's1',
    notes: null,
    practice: null,
    gameStatus: null,
    reportDate: null,
    lastUpdated: null,
    onRoster: true,
    isStarter: true,
    headshotUrl: null,
    impactScore: 60,
    lineupDisruption: 0,
    replacementUrgency: 0,
    confidence: 80,
    dataGaps: [],
    ...overrides,
  }
}

function result(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    analysisMode: 'league',
    analysisScope: 'league',
    leagueName: 'Test League',
    sportLabel: 'NFL',
    leagueSport: 'NFL',
    overallRisk: 40,
    summaryCounts: { outIr: 1, doubtful: 0, questionable: 2, limited: 0, fullPractice: 3 },
    players: [],
    aiNarrative: null,
    chimmyPayload: {},
    dataGaps: [],
    degraded: false,
    computedAt: new Date().toISOString(),
    validation: {},
    feedFreshness: {},
    summaryLine: '',
    dataQuality: 'full',
    integrationHints: {},
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InjuryImpactPanel (Phase 3.2)', () => {
  it('renders real severity counts, affected starters, impact, and the status as the "why"', async () => {
    stubFetch(
      result({
        players: [
          player({ name: 'A.J. Brown', position: 'WR', team: 'PHI', severity: 'questionable', statusRaw: 'Questionable', impactScore: 72, injuryNewsSummary: 'Limited in practice (hamstring).' }),
          player({ name: 'Bench Guy', position: 'RB', team: 'NYG', isStarter: false, impactScore: 90 }),
        ],
      }),
    )
    const { container } = render(<InjuryImpactPanel league={league} />)

    await waitFor(() => expect(screen.getByText('A.J. Brown', { exact: false })).toBeTruthy())
    // Real severity summary counts render (1 out/IR, 2 questionable).
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('2')
    // Impact bar uses the real impactScore.
    expect(container.textContent).toContain('impact(n=72)')
    // The real status/news is surfaced as the "why".
    expect(screen.getByText(/Limited in practice/)).toBeTruthy()
    // A non-starter is excluded from the affected-starters list.
    expect(screen.queryByText(/Bench Guy/)).toBeNull()
  })

  it('shows an honest clean empty state when no starters are affected', async () => {
    stubFetch(result({ summaryCounts: { outIr: 0, doubtful: 0, questionable: 0, limited: 0, fullPractice: 5 }, players: [] }))
    render(<InjuryImpactPanel league={league} />)
    await waitFor(() => expect(screen.getByText('dashboard.warroom.injury.emptyClean')).toBeTruthy())
  })
})
