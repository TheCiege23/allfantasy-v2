import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { PlatformPulseCard } from '@/app/dashboard/components/warroom/PlatformPulseCard'
import type { PlatformPulseItem } from '@/lib/platform-pulse'

vi.mock('@/components/i18n/LanguageProviderClient', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string, vars: Record<string, string | number> = {}) => {
      const entries = Object.entries(vars)
      return entries.length ? `${key}(${entries.map(([k, v]) => `${k}=${v}`).join(',')})` : key
    },
  }),
}))

function item(o: Partial<PlatformPulseItem> & { id: string; kind: PlatformPulseItem['kind'] }): PlatformPulseItem {
  return {
    category: 'Recommend',
    priority: 70,
    source: 'StartSit',
    data: {},
    ...o,
  } as PlatformPulseItem
}

describe('PlatformPulseCard (Phase 3.6)', () => {
  it('self-gates to nothing when there are no items', () => {
    const { container } = render(<PlatformPulseCard items={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders category badge, localized title, confidence chip, and an expandable Why', () => {
    const { container } = render(
      <PlatformPulseCard
        items={[
          item({
            id: 'a',
            kind: 'ai_recommendation',
            category: 'Recommend',
            confidence: 0.78,
            data: { playerName: 'A.J. Brown', leagueName: 'Dynasty' },
            why: 'Better matchup this week.',
          }),
        ]}
      />,
    )
    // Category badge + localized title/summary.
    expect(container.textContent).toContain('dashboard.pulse.category.Recommend')
    expect(container.textContent).toContain('dashboard.pulse.kind.aiRecommendation')
    expect(container.textContent).toContain('A.J. Brown · Dynasty')
    // Real confidence chip (reused Phase 3.5 primitive).
    expect(container.textContent).toContain('confidence(pct=78)')

    // Why is collapsed until clicked; then it reveals the real reasoning.
    expect(screen.queryByText('Better matchup this week.')).toBeNull()
    fireEvent.click(screen.getByText('dashboard.pulse.why'))
    expect(screen.getByText('Better matchup this week.')).toBeTruthy()
  })

  it('shows a health item as current-state with no delta chip and no Why when no reason', () => {
    const { container } = render(
      <PlatformPulseCard
        items={[
          item({
            id: 'h',
            kind: 'league_health_low',
            category: 'Monitor',
            priority: 70,
            source: 'commissioner',
            data: { leagueName: 'KBI', score: 20, metric: 'fairness' },
            why: null,
          }),
        ]}
      />,
    )
    expect(container.textContent).toContain('dashboard.pulse.kind.healthLow(metric=dashboard.pulse.metric.fairness)')
    expect(container.textContent).toContain('dashboard.pulse.summary.score(league=KBI,score=20)')
    // No fabricated confidence/trajectory/why.
    expect(container.textContent).not.toContain('confidence(')
    expect(container.querySelector('[aria-label*="change"]')).toBeNull()
    expect(screen.queryByText('dashboard.pulse.why')).toBeNull()
  })

  it('renders a summarized item with a count title and whyDetails bullets (Phase 3.8B)', () => {
    render(
      <PlatformPulseCard
        items={[
          item({
            id: 'sum',
            kind: 'lineup_urgent',
            category: 'Recommend',
            priority: 92,
            summarized: true,
            data: { leagueName: 'Dynasty', count: 3 },
            why: 'Slot 1 empty',
            whyDetails: ['Slot 1 empty', 'Slot 2 illegal', 'Slot 3 gap'],
          }),
        ]}
      />,
    )
    // Count-aware title — no repeated "Set your lineup".
    expect(screen.getByText('dashboard.pulse.kind.lineupUrgentMany(count=3)')).toBeTruthy()
    // Why expands into the real per-decision bullets.
    expect(screen.queryByText('Slot 2 illegal')).toBeNull()
    fireEvent.click(screen.getByText('dashboard.pulse.why'))
    expect(screen.getByText('Slot 1 empty')).toBeTruthy()
    expect(screen.getByText('Slot 2 illegal')).toBeTruthy()
    expect(screen.getByText('Slot 3 gap')).toBeTruthy()
  })
})
