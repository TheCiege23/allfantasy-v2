import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { RecommendationTimeline } from '@/app/dashboard/components/warroom/RecommendationTimeline'
import type { LineupActionItem } from '@/lib/lineup-actions/types'

// Stub returns keys; tInterpolate surfaces the interpolation vars so assertions can prove the REAL
// values (confidence %, expected gain) flow into the labels rather than being fabricated.
vi.mock('@/components/i18n/LanguageProviderClient', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string, vars: Record<string, string | number> = {}) => {
      const entries = Object.entries(vars)
      return entries.length ? `${key}(${entries.map(([k, v]) => `${k}=${v}`).join(',')})` : key
    },
  }),
}))

function action(overrides: Partial<LineupActionItem>): LineupActionItem {
  return {
    leagueId: 'lg1',
    leagueName: 'Test League',
    sport: 'NFL',
    platform: 'allfantasy',
    teamId: 't1',
    slotIndex: 0,
    slotId: 'FLEX',
    slotLabel: 'FLEX',
    playerId: 'p1',
    playerName: 'Player One',
    reasonType: 'ai_start_sit',
    urgency: 'normal',
    lockTime: null,
    recommendedAction: 'Start Player One over Player Two',
    suggestedReplacementPlayerId: 'p2',
    confidence: null,
    expectedGain: null,
    sourceModule: 'AFWarRoom',
    message: 'Player One projects 3.4 pts higher this week.',
    severity: 'info',
    ...overrides,
  } as LineupActionItem
}

describe('RecommendationTimeline (Phase 3.1)', () => {
  it('self-gates to nothing when there are no recommendations', () => {
    const { container } = render(<RecommendationTimeline actions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders real decision metadata: confidence, expected gain, urgency, and an expandable Explain', () => {
    const { container } = render(
      <RecommendationTimeline
        actions={[
          action({
            reasonType: 'ai_start_sit',
            urgency: 'urgent',
            confidence: 78,
            expectedGain: 3.4,
            recommendedAction: 'Start Player One over Player Two',
            message: 'Player One projects 3.4 pts higher and has a better matchup.',
          }),
        ]}
      />,
    )

    // Headline (the recommended action) is shown.
    expect(screen.getByText('Start Player One over Player Two')).toBeTruthy()
    // Confidence chip carries the real value (78) — not fabricated.
    expect(container.textContent).toContain('confidence(pct=78)')
    // Expected gain carries the real projected point delta (3.4).
    expect(container.textContent).toContain('gain(pts=3.4)')
    // Urgency chip renders for urgent items.
    expect(screen.getByText('dashboard.warroom.recs.urgencyUrgent')).toBeTruthy()

    // Explain is collapsed by default, revealed on click (the real engine reasoning).
    const why = screen.getByText('dashboard.warroom.recs.explain')
    expect(screen.queryByText(/better matchup/)).toBeNull()
    fireEvent.click(why)
    expect(screen.getByText(/better matchup/)).toBeTruthy()
  })

  it('omits confidence/gain chips when the source has no real values (no fabrication)', () => {
    render(
      <RecommendationTimeline
        actions={[action({ reasonType: 'empty_starter', confidence: null, expectedGain: null, urgency: 'urgent', recommendedAction: 'Fill your empty FLEX slot' })]}
      />,
    )
    expect(screen.getByText('Fill your empty FLEX slot')).toBeTruthy()
    expect(screen.queryByText(/confident/)).toBeNull()
    expect(screen.queryByText(/pts/)).toBeNull()
  })

  it('orders urgent recommendations ahead of lower-urgency ones', () => {
    render(
      <RecommendationTimeline
        actions={[
          action({ slotId: 'a', urgency: 'low', recommendedAction: 'Low priority move' }),
          action({ slotId: 'b', urgency: 'urgent', recommendedAction: 'Urgent move now' }),
        ]}
      />,
    )
    const rows = screen.getAllByText(/move/i)
    expect(rows[0].textContent).toContain('Urgent move now')
  })
})
