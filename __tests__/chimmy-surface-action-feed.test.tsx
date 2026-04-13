import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import ChimmySurfaceActionFeed from '@/components/chimmy-surfaces/ChimmySurfaceActionFeed'
import type { AIActionContext, ChimmyFeedRecommendation } from '@/lib/chimmy-actions'

vi.mock('@/components/chimmy-surfaces/ChimmyActionRecommendationCard', () => ({
  default: ({ rec }: { rec: ChimmyFeedRecommendation }) => <div>{rec.headline}</div>,
}))

vi.mock('@/components/chimmy-surfaces/ChimmyQuickActionStrip', () => ({
  default: () => <div data-testid="quick-strip-mock" />,
}))

const context: AIActionContext = {
  userId: 'u1',
  role: 'member',
  sport: 'NFL',
  leagueType: 'redraft',
  leagueId: 'l1',
  teamId: 't1',
  subscriptionState: {
    hasPremium: false,
    hasCommissioner: false,
    hasAdmin: false,
  },
  leagueState: {
    isLocked: false,
    isWaiverOpen: true,
    isLineupLocked: false,
    isDraftActive: false,
    isDraftComplete: true,
    isTradeDeadlinePast: false,
    isInPlayoffs: false,
    currentWeek: 8,
  },
  rosterState: {
    hasIR: true,
    hasIL: false,
    hasTaxi: false,
    hasDevy: false,
  },
}

function makeRec(id: number): ChimmyFeedRecommendation {
  return {
    id: `rec-${id}`,
    headline: `Headline ${id}`,
    reason: `Reason ${id}`,
    confidencePct: 70,
    riskLevel: 'low',
    actionType: 'Lineup',
  }
}

describe('ChimmySurfaceActionFeed', () => {
  it('shows maxVisible items first and expands/collapses on toggle', () => {
    const recommendations = [1, 2, 3, 4, 5].map(makeRec)

    render(
      <ChimmySurfaceActionFeed
        recommendations={recommendations}
        context={context}
        maxVisible={3}
      />,
    )

    expect(screen.getByText('Headline 1')).toBeInTheDocument()
    expect(screen.getByText('Headline 2')).toBeInTheDocument()
    expect(screen.getByText('Headline 3')).toBeInTheDocument()
    expect(screen.queryByText('Headline 4')).not.toBeInTheDocument()
    expect(screen.queryByText('Headline 5')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Show 2 more suggestions/i }))

    expect(screen.getByText('Headline 4')).toBeInTheDocument()
    expect(screen.getByText('Headline 5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Show less/i }))

    expect(screen.queryByText('Headline 4')).not.toBeInTheDocument()
    expect(screen.queryByText('Headline 5')).not.toBeInTheDocument()
  })

  it('renders empty fallback state when feed is empty', () => {
    render(<ChimmySurfaceActionFeed recommendations={[]} context={context} />)
    expect(screen.getByText('No recommendations yet')).toBeInTheDocument()
  })
})
