import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import ManagerCommandCenterSection from '@/components/decision-os/ManagerCommandCenterSection'

const fetchMock = vi.fn()

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

const LEAGUES = [
  { id: 'league-1', name: 'Dynasty Warriors' },
  { id: 'league-2', name: 'Redraft Rebels' },
]

const SNAPSHOT = {
  generatedAt: '2026-07-09T00:00:00.000Z',
  totalLeagues: 2,
  healthyLeagueCount: 1,
  atRiskLeagueCount: 1,
  unavailableLeagueCount: 0,
  leagueSummaries: [
    { leagueId: 'league-1', available: true, participationTier: 'active', engagementScore: 70, retentionRisk: 'low', isInactive: false, recommendationCount: 0 },
    { leagueId: 'league-2', available: true, participationTier: 'passive', engagementScore: 30, retentionRisk: 'critical', isInactive: false, recommendationCount: 1 },
  ],
  attentionQueue: [
    {
      id: 'manager_engagement_risk:league-2',
      leagueId: 'league-2',
      type: 'manager_engagement_risk',
      severity: 'critical',
      priorityScore: 500,
      title: "This team's engagement needs attention",
      explanation: 'Your retention risk for this team is "critical".',
      recommendedAction: 'Check in on your lineup, waivers, and league activity to stay engaged.',
      timestamp: '2026-07-09T00:00:00.000Z',
      source: 'user_os',
    },
  ],
  leagueTrends: [],
  warnings: [],
  draftsApproachingCount: 1,
}

describe('ManagerCommandCenterSection', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an honest empty state and never fetches when the user belongs to no leagues', () => {
    render(<ManagerCommandCenterSection leagues={[]} />)
    expect(screen.getByText(/Your multi-league overview will appear here/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches the manager command center snapshot and renders every reused module with real data', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(SNAPSHOT))
    render(<ManagerCommandCenterSection leagues={LEAGUES} />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/decision-os/manager-command-center',
        expect.objectContaining({ credentials: 'same-origin' }),
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('manager-command-center-overview')).toBeInTheDocument()
    })

    // Reused CommissionerAttentionQueue, unchanged — renders real manager signals.
    expect(screen.getByTestId('attention-queue-item-critical')).toHaveTextContent('Redraft Rebels')
    expect(screen.getByTestId('attention-queue-item-critical')).toHaveTextContent(
      'Your retention risk for this team is "critical".',
    )

    // Reused TodaysBriefCard, composed from the SAME fetched snapshot — zero additional request.
    expect(screen.getByTestId('todays-brief-card')).toBeInTheDocument()
    expect(screen.getByTestId('todays-brief-priority-items')).toHaveTextContent('Redraft Rebels')

    // Reused NotificationCenter, composed with zero additional request.
    expect(screen.getByTestId('notification-center')).toBeInTheDocument()

    // New Manager League Switcher, real navigation hrefs.
    expect(screen.getByTestId('manager-league-switcher-list')).toBeInTheDocument()
    expect(screen.getByTestId('manager-league-switcher-item-league-2')).toHaveAttribute('href', '/league/league-2')
  })

  it("Today's Brief renders an honest healthy state before the snapshot has loaded, with no extra fetch", () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}))
    render(<ManagerCommandCenterSection leagues={LEAGUES} />)

    expect(screen.getByTestId('todays-brief-card')).toBeInTheDocument()
    expect(screen.getByTestId('todays-brief-summary')).toHaveTextContent('Every league looks healthy today.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows a real error message, not a silent failure, when the fetch fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    render(<ManagerCommandCenterSection leagues={LEAGUES} />)

    await waitFor(() => {
      expect(screen.getByTestId('manager-command-center-error')).toBeInTheDocument()
    })
  })
})
