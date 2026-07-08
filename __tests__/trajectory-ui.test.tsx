import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

import { computeDisplayDelta, deltaTone } from '@/app/dashboard/components/warroom/trajectory/displayDelta'
import { DeltaChip } from '@/app/dashboard/components/warroom/trajectory/DeltaChip'
import { ConfidenceChip } from '@/app/dashboard/components/warroom/trajectory/ConfidenceChip'
import { BeforeAfterRow } from '@/app/dashboard/components/warroom/trajectory/BeforeAfterRow'
import { TrajectoryMiniSummary } from '@/app/dashboard/components/warroom/trajectory/TrajectoryMiniSummary'
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

function summary(o: Partial<TrajectorySummary>): TrajectorySummary {
  return {
    metricId: 'm',
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
const changed = (cur: number, prev: number, extra: Partial<TrajectorySummary> = {}) =>
  summary({ hasChange: true, currentValue: cur, previousValue: prev, ...extra })

describe('computeDisplayDelta', () => {
  it('reads positive / negative / flat at display resolution', () => {
    expect(computeDisplayDelta(changed(58, 40), 0)).toMatchObject({ direction: 'up', magnitude: 18, visible: true })
    expect(computeDisplayDelta(changed(40, 58), 0)).toMatchObject({ direction: 'down', magnitude: 18, visible: true })
    // 40.3 vs 40.1 both round to 40 → flat, not visible (stays silent).
    expect(computeDisplayDelta(changed(40.3, 40.1), 0)).toMatchObject({ direction: 'flat', visible: false })
  })

  it('self-gates (null) for unsupported metrics and missing history', () => {
    expect(computeDisplayDelta(changed(58, 40, { supported: false }), 0)).toBeNull()
    expect(computeDisplayDelta(summary({ hasChange: false, currentValue: 58 }), 0)).toBeNull()
    expect(computeDisplayDelta(undefined, 0)).toBeNull()
  })

  it('deltaTone respects inverted metrics', () => {
    expect(deltaTone('up', false)).toBe('positive')
    expect(deltaTone('down', false)).toBe('negative')
    expect(deltaTone('down', true)).toBe('positive') // seed dropping is good
    expect(deltaTone('up', true)).toBe('negative')
    expect(deltaTone('flat')).toBe('neutral')
  })
})

describe('DeltaChip', () => {
  it('renders a positive (emerald, ▲) chip with an up aria-label', () => {
    const { container } = render(<DeltaChip summary={changed(58, 40)} decimals={0} />)
    const chip = container.querySelector('span[aria-label]')!
    expect(chip.getAttribute('aria-label')).toContain('changeUp(value=18)')
    expect(chip.className).toContain('text-emerald-300')
    expect(chip.textContent).toContain('▲')
  })

  it('renders a negative (red, ▼) chip', () => {
    const { container } = render(<DeltaChip summary={changed(40, 58)} decimals={0} />)
    const chip = container.querySelector('span[aria-label]')!
    expect(chip.getAttribute('aria-label')).toContain('changeDown(value=18)')
    expect(chip.className).toContain('text-red-300')
  })

  it('inverts good/bad for seed-like metrics (down = emerald)', () => {
    const { container } = render(<DeltaChip summary={changed(4, 6)} decimals={0} invert />)
    const chip = container.querySelector('span[aria-label]')!
    expect(chip.getAttribute('aria-label')).toContain('changeDown(value=2)')
    expect(chip.className).toContain('text-emerald-300')
  })

  it('self-gates on flat by default, but shows a neutral chip with showFlat', () => {
    const flat = changed(40.3, 40.1)
    expect(render(<DeltaChip summary={flat} decimals={0} />).container.innerHTML).toBe('')
    const { container } = render(<DeltaChip summary={flat} decimals={0} showFlat />)
    const chip = container.querySelector('span[aria-label]')!
    expect(chip.getAttribute('aria-label')).toContain('changeFlat')
    expect(chip.className).toContain('text-white/40')
  })

  it('renders nothing for unsupported or history-less summaries', () => {
    expect(render(<DeltaChip summary={changed(58, 40, { supported: false })} />).container.innerHTML).toBe('')
    expect(render(<DeltaChip summary={summary({ hasChange: false, currentValue: 58 })} />).container.innerHTML).toBe('')
  })
})

describe('ConfidenceChip', () => {
  it('renders only when a real confidence exists', () => {
    expect(render(<ConfidenceChip confidence={0.8} />).container.textContent).toContain('confidence(pct=80)')
    expect(render(<ConfidenceChip confidence={null} />).container.innerHTML).toBe('')
    expect(render(<ConfidenceChip confidence={undefined} />).container.innerHTML).toBe('')
    expect(render(<ConfidenceChip confidence={Number.NaN} />).container.innerHTML).toBe('')
  })
})

describe('BeforeAfterRow', () => {
  it('shows previous → current with a delta when a prior exists', () => {
    const { container } = render(
      <BeforeAfterRow summary={changed(58, 40)} label="Playoff Odds" decimals={0} format={(n) => `${n}%`} />,
    )
    expect(container.textContent).toContain('40%')
    expect(container.textContent).toContain('58%')
    expect(container.querySelector('span[aria-label*="changeUp(value=18)"]')).toBeTruthy()
  })

  it('shows current only (no fabricated before) when there is no prior', () => {
    const { container } = render(
      <BeforeAfterRow summary={summary({ hasChange: false, currentValue: 58 })} label="Playoff Odds" format={(n) => `${n}%`} />,
    )
    expect(container.textContent).toContain('58%')
    expect(container.textContent).not.toContain('→')
    expect(container.querySelector('span[aria-label]')).toBeNull()
  })
})

describe('TrajectoryMiniSummary', () => {
  it('renders only the metrics that really changed', () => {
    const { container } = render(
      <TrajectoryMiniSummary
        items={[
          { summary: changed(58, 40), label: 'Playoff' },
          { summary: summary({ hasChange: false, currentValue: 4 }), label: 'Seed', invert: true },
        ]}
      />,
    )
    expect(container.textContent).toContain('Playoff')
    expect(container.textContent).not.toContain('Seed')
  })

  it('self-gates entirely when nothing has a real trajectory', () => {
    const { container } = render(
      <TrajectoryMiniSummary
        items={[
          { summary: summary({ hasChange: false, currentValue: 58 }), label: 'Playoff' },
          { summary: changed(58, 40, { supported: false }), label: 'Champ' },
        ]}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
