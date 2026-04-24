import React, { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/app/draft-room/LazyDraftImage', () => ({
  LazyDraftImage: () => null,
}))

import { DraftBoard } from '@/components/app/draft-room/DraftBoard'
import type { DraftPickSnapshot, SlotOrderEntry } from '@/lib/live-draft-engine/types'

const slotOrder: SlotOrderEntry[] = [
  { slot: 1, rosterId: 'roster-1', displayName: 'Alpha' },
  { slot: 2, rosterId: 'roster-2', displayName: 'Beta' },
]

const samplePick: DraftPickSnapshot = {
  id: 'pick-1',
  overall: 1,
  round: 1,
  slot: 1,
  rosterId: 'roster-1',
  displayName: 'Alpha',
  playerName: 'Atlas Runner',
  position: 'RB',
  team: 'NYJ',
  byeWeek: null,
  playerId: 'p-1',
  tradedPickMeta: null,
  source: 'user',
  pickLabel: '1.01',
  createdAt: new Date().toISOString(),
}

/**
 * Regression: one physical DraftBoard should survive pre-draft → live → paused → live
 * prop transitions (same pattern as DraftRoomPageClient: one board, no second mount branch).
 */
function SingleBoardPhaseHarness() {
  const [phase, setPhase] = useState<'pre_draft' | 'in_progress' | 'paused' | 'completed'>('pre_draft')
  const picks =
    phase === 'pre_draft'
      ? []
      : phase === 'completed'
        ? [
            samplePick,
            {
              ...samplePick,
              id: 'pick-2',
              overall: 2,
              round: 1,
              slot: 2,
              rosterId: 'roster-2',
              displayName: 'Beta',
              playerName: 'Beta Runner',
              pickLabel: '1.02',
            },
          ]
        : [samplePick]
  const currentOverall =
    phase === 'pre_draft' ? null : phase === 'completed' ? null : 2
  return (
    <div>
      <p data-testid="phase">{phase}</p>
      <button type="button" data-testid="sim-start" onClick={() => setPhase('in_progress')}>
        start
      </button>
      <button type="button" data-testid="sim-pause" onClick={() => setPhase('paused')}>
        pause
      </button>
      <button type="button" data-testid="sim-resume" onClick={() => setPhase('in_progress')}>
        resume
      </button>
      <button type="button" data-testid="sim-complete" onClick={() => setPhase('completed')}>
        complete
      </button>
      <DraftBoard
        picks={picks}
        slotOrder={slotOrder}
        teamCount={2}
        rounds={2}
        draftType="snake"
        thirdRoundReversal={false}
        currentOverallPick={currentOverall}
      />
    </div>
  )
}

describe('single draft board (selectors + single mount)', () => {
  it('keeps exactly one draft-board and one draft-board-grid across simulated start / pause / resume', () => {
    const { container } = render(<SingleBoardPhaseHarness />)

    const countBoards = () => container.querySelectorAll('[data-testid="draft-board"]').length
    const countGrids = () => container.querySelectorAll('[data-testid="draft-board-grid"]').length

    expect(screen.getByTestId('phase')).toHaveTextContent('pre_draft')
    expect(countBoards()).toBe(1)
    expect(countGrids()).toBe(1)

    fireEvent.click(screen.getByTestId('sim-start'))
    expect(screen.getByTestId('phase')).toHaveTextContent('in_progress')
    expect(countBoards()).toBe(1)
    expect(countGrids()).toBe(1)

    fireEvent.click(screen.getByTestId('sim-pause'))
    expect(screen.getByTestId('phase')).toHaveTextContent('paused')
    expect(countBoards()).toBe(1)
    expect(countGrids()).toBe(1)

    fireEvent.click(screen.getByTestId('sim-resume'))
    expect(screen.getByTestId('phase')).toHaveTextContent('in_progress')
    expect(countBoards()).toBe(1)
    expect(countGrids()).toBe(1)

    fireEvent.click(screen.getByTestId('sim-complete'))
    expect(screen.getByTestId('phase')).toHaveTextContent('completed')
    expect(countBoards()).toBe(1)
    expect(countGrids()).toBe(1)
  })
})
