/**
 * Phase 20 — Manager Replay Insights dashboard card test (display-only).
 * Renders the client card against a mocked internal-route fetch and proves
 * every honest state (loading, disabled, error, empty, ready) plus that no
 * internal replay key/ID surfaces in the visible DOM.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ManagerReplayInsightsCard } from '@/components/dashboard/ManagerReplayInsightsCard'
import type { ManagerReplayInsightSetV1, ManagerReplayInsightV1 } from '@/lib/replay-framework/insights/managerReplayInsight'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  // Client gate on, so the card fetches; the "inert" case below turns it off.
  vi.stubEnv('NEXT_PUBLIC_MANAGER_REPLAY_INSIGHTS_DASHBOARD_ENABLED', 'true')
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllEnvs()
})

function makeInsight(overrides: Partial<ManagerReplayInsightV1> = {}): ManagerReplayInsightV1 {
  return {
    insightId: 'replay_insight_starter_impact_trades',
    category: 'starter_impact_trades',
    headline: 'Your starter-impact trades paid off',
    detail: 'Trades that upgraded your active starting lineup changed your lineup efficiency by about +1.4 pts and left roughly 8% of acquired players unused.',
    displayValue: '+1.4 pts efficiency',
    sentiment: 'positive',
    confidence: 'high',
    sampleSize: 44,
    caveat: null,
    ...overrides,
  }
}

function makeSet(insights: ManagerReplayInsightV1[]): ManagerReplayInsightSetV1 {
  return {
    scope: 'league',
    insights,
    tradesAnalyzed: 141,
    tradesWithLineupData: 114,
    validationSource: 'decision_replay_correlation',
    version: 'replay-insight-v1',
    derivedAt: '2026-07-07T00:00:00.000Z',
  }
}

function resolveWith(body: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValue({ ok, status, json: async () => body })
}

describe('ManagerReplayInsightsCard', () => {
  it('is fully inert (renders nothing, never fetches) when the client flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_MANAGER_REPLAY_INSIGHTS_DASHBOARD_ENABLED', 'false')
    const { container } = render(<ManagerReplayInsightsCard leagueId="L1" />)
    expect(container.textContent).toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a loading state before the fetch resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ManagerReplayInsightsCard leagueId="L1" />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('renders nothing when the feature is disabled', async () => {
    resolveWith({ enabled: false })
    const { container } = render(<ManagerReplayInsightsCard leagueId="L1" />)
    await waitFor(() => expect(container.querySelector('section')).toBeNull())
    expect(container.textContent).toBe('')
  })

  it('renders the insight headlines and values when ready', async () => {
    resolveWith({ enabled: true, data: makeSet([
      makeInsight(),
      makeInsight({ insightId: 'replay_insight_bench_depth_trades', category: 'bench_depth_trades', headline: "Bench-depth trades didn't move your lineup", displayValue: '-1.1 pts efficiency', sentiment: 'caution' }),
    ]) })
    render(<ManagerReplayInsightsCard leagueId="L1" />)
    expect(await screen.findByText('Your starter-impact trades paid off')).toBeTruthy()
    expect(screen.getByText("Bench-depth trades didn't move your lineup")).toBeTruthy()
    expect(screen.getByText('+1.4 pts efficiency')).toBeTruthy()
  })

  it('does not surface the internal insightId slug in the visible DOM', async () => {
    resolveWith({ enabled: true, data: makeSet([makeInsight()]) })
    const { container } = render(<ManagerReplayInsightsCard leagueId="L1" />)
    await screen.findByText('Your starter-impact trades paid off')
    expect(container.textContent).not.toContain('replay_insight_')
    expect(container.textContent).not.toContain('decision_replay_correlation')
  })

  it('shows an honest empty state when there are no insights', async () => {
    resolveWith({ enabled: true, data: makeSet([]) })
    render(<ManagerReplayInsightsCard leagueId="L1" />)
    expect(await screen.findByText(/Not enough completed-trade history/i)).toBeTruthy()
  })

  it('shows an error state when the request fails', async () => {
    resolveWith({}, false, 500)
    render(<ManagerReplayInsightsCard leagueId="L1" />)
    expect(await screen.findByText(/couldn.t be loaded/i)).toBeTruthy()
  })

  it('renders a low-sample caveat when present', async () => {
    resolveWith({ enabled: true, data: makeSet([
      makeInsight({ confidence: 'insufficient', sampleSize: 2, caveat: 'Based on only 2 of your trades — treat as directional, not conclusive. Across 141 real validated trades, starter-impact deals gained about +1.4 pts of lineup efficiency.' }),
    ]) })
    render(<ManagerReplayInsightsCard leagueId="L1" />)
    expect(await screen.findByText(/Based on only 2 of your trades/i)).toBeTruthy()
  })
})
