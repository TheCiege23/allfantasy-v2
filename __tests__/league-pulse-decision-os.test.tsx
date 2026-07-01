import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LeaguePulseCard from '@/components/decision-os/LeaguePulseCard'
import {
  buildCommissionerLeaguePulse,
  buildDashboardLeaguePulse,
  buildLeagueHomePulse,
} from '@/lib/decision-os/league-pulse'
import type { CommissionerLeagueHealthSnapshot } from '@/lib/commissioner-hub/commissionerHubHealth'

const now = new Date('2026-07-01T16:00:00.000Z')

function snapshot(over: Partial<CommissionerLeagueHealthSnapshot> = {}): CommissionerLeagueHealthSnapshot {
  return {
    leagueId: 'league-1',
    leagueName: 'Test League',
    sport: 'NFL',
    leagueType: 'redraft',
    season: 2026,
    status: 'in_season',
    teamCount: 12,
    currentWeek: 4,
    generatedAt: now.toISOString(),
    source: 'database',
    dataConfidence: 'high',
    healthScore: 82,
    engagementScore: 78,
    fairnessScore: 80,
    sustainabilityScore: 84,
    overallStatus: 'healthy',
    healthTrend: 'stable',
    summary: 'Existing deterministic health summary.',
    metrics: {
      inactiveTeams: 0,
      missedLineups: 0,
      tradeActivity: 4,
      waiverActivity: 12,
      leagueEngagement: 78,
      commissionerActions: 2,
      pendingWaiverClaims: 1,
      pendingTrades: 0,
      openAiAlerts: 0,
      chatMessagesLast7Days: 18,
      activeManagers: 12,
      injuredStarters: 1,
      lineupSubmissionRate: 1,
      projectionCoveragePct: 92,
      lowConfidenceProjectionStarters: 0,
    },
    alerts: [],
    recommendations: ['Post a weekly recap.'],
    actions: [
      {
        key: 'settings',
        label: 'Review settings',
        description: 'Confirm commissioner settings before the next scoring window.',
        href: '/league/league-1/settings',
        enabled: true,
        requiresConfirmation: false,
        tone: 'standard',
      },
    ],
    assistantQuestions: [],
    nflDataCoverage: null,
    ...over,
  }
}

describe('League Pulse Decision OS premium experience', () => {
  it('uses an honest insufficient-data fallback instead of unsupported claims', () => {
    const pulse = buildDashboardLeaguePulse({ connectedLeagues: [], entryCount: 0, now })

    expect(pulse.status).toBe('insufficient-data')
    expect(pulse.insufficientData?.missing).toContain('Connected league')
    expect(pulse.derivation).toContain('Stopped before making unsupported claims')
    expect(pulse.nextAction.label).toBe('Connect a league')
  })

  it('derives league-home risk from team ownership and standings evidence', () => {
    const pulse = buildLeagueHomePulse({
      now,
      isCommissioner: true,
      league: {
        id: 'league-1',
        name: 'Family League',
        sport: 'NFL',
        teamCount: 4,
        lifecycleState: 'in_season',
      },
      teams: [
        { id: 'team-1', teamName: 'Alpha', claimedByUserId: 'user-1', pointsFor: 600 },
        { id: 'team-2', teamName: 'Bravo', claimedByUserId: 'user-2', pointsFor: 455 },
        { id: 'team-3', teamName: 'Charlie', claimedByUserId: 'user-3', pointsFor: 410 },
        { id: 'team-4', teamName: 'Open Team', isOrphan: true, pointsFor: 390 },
      ],
    })

    expect(pulse.headline).toContain('1 manager slot')
    expect(pulse.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Open manager slots', value: '1' }),
        expect.objectContaining({ label: 'Points spread' }),
      ]),
    )
    expect(pulse.nextAction.label).toBe('Invite managers')
    expect(pulse.confidence).toBeGreaterThanOrEqual(70)
  })

  it('aggregates commissioner health snapshots into one action-oriented pulse', () => {
    const pulse = buildCommissionerLeaguePulse({
      now,
      snapshots: [
        snapshot(),
        snapshot({
          leagueId: 'league-2',
          healthScore: 62,
          engagementScore: 58,
          metrics: {
            ...snapshot().metrics,
            inactiveTeams: 2,
            missedLineups: 1,
            pendingTrades: 2,
          },
          alerts: ['Two teams have not set lineups.'],
        }),
      ],
    })

    expect(pulse.headline).toContain('commissioner signal')
    expect(pulse.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Managed leagues', value: '2' }),
        expect.objectContaining({ label: 'Inactive teams', value: '2' }),
      ]),
    )
    expect(pulse.nextAction.label).toBe('Review settings')
    expect(pulse.derivation.join(' ')).toContain('deterministic commissioner health scores')
  })

  it('renders confidence, evidence, derivation, and next action without raw backend ids', () => {
    const pulse = buildCommissionerLeaguePulse({ now, snapshots: [snapshot()] })

    render(<LeaguePulseCard pulse={pulse} variant="commissioner" />)

    const card = screen.getByTestId('league-pulse-card-commissioner')
    expect(within(card).getByText('League Pulse')).toBeInTheDocument()
    expect(within(card).getByText(`${pulse.confidenceLabel} confidence`)).toBeInTheDocument()
    expect(within(card).getByText('Based on')).toBeInTheDocument()
    expect(within(card).getByText('Derivation chain')).toBeInTheDocument()
    expect(within(card).getByText('Next action')).toBeInTheDocument()
    expect(card.textContent).not.toContain('league-1')
  })
})
