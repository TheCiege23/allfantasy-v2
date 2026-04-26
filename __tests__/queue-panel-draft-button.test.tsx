import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { QueuePanel } from '@/components/app/draft-room/QueuePanel'

const baseQueueEntry = {
  playerName: 'Jahmyr Gibbs',
  position: 'RB',
  team: 'DET',
  playerId: null,
  byeWeek: null,
  availabilityProbability: null,
  rank: null,
}

function renderPanel(props: Partial<React.ComponentProps<typeof QueuePanel>> = {}) {
  const onDraftFromQueue = vi.fn()
  render(
    <QueuePanel
      queue={[baseQueueEntry as any]}
      canDraft={false}
      onRemove={vi.fn()}
      onReorder={vi.fn()}
      onDraftFromQueue={onDraftFromQueue}
      autoPickFromQueue={false}
      onAutoPickFromQueueChange={vi.fn()}
      awayMode={false}
      onAwayModeChange={vi.fn()}
      {...props}
    />,
  )
  return { onDraftFromQueue }
}

describe('QueuePanel — Draft button discoverability (Slice C followup)', () => {
  it('shows the Draft button on the top queue entry even when off-clock (disabled state)', () => {
    renderPanel({ canDraft: false })
    const btn = screen.getByTestId('draft-queue-draft-button') as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(true)
    expect(btn.title).toMatch(/not on the clock/i)
  })

  it('clicking the disabled Draft button does not invoke the handler', () => {
    const { onDraftFromQueue } = renderPanel({ canDraft: false })
    const btn = screen.getByTestId('draft-queue-draft-button') as HTMLButtonElement
    fireEvent.click(btn)
    expect(onDraftFromQueue).not.toHaveBeenCalled()
  })

  it('on-clock manager can click Draft and the handler fires with the queue entry', () => {
    const { onDraftFromQueue } = renderPanel({ canDraft: true })
    const btn = screen.getByTestId('draft-queue-draft-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(onDraftFromQueue).toHaveBeenCalledTimes(1)
    expect(onDraftFromQueue.mock.calls[0][0].playerName).toBe('Jahmyr Gibbs')
  })
})
