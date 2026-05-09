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
  it('does not render Draft button when off-clock', () => {
    renderPanel({ canDraft: false })
    expect(screen.queryByTestId('draft-queue-draft-button')).toBeNull()
  })

  it('off-clock state never invokes draft handler', () => {
    const { onDraftFromQueue } = renderPanel({ canDraft: false })
    expect(screen.queryByTestId('draft-queue-draft-button')).toBeNull()
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

  it('renders queue AI overlay chips only when overlays are enabled', () => {
    const aiOverlaySignals = {
      'jahmyr gibbs|rb': {
        badge: 'ai_pick' as const,
        stackAvailable: true,
        byeWeekConflict: true,
      },
    }

    renderPanel({ canDraft: true, aiOverlaySignals, showAiOverlays: true })
    expect(screen.getByText('Stack')).toBeTruthy()
    expect(screen.getByText('Bye conflict')).toBeTruthy()

    renderPanel({ canDraft: true, aiOverlaySignals, showAiOverlays: false })
    const stackChips = screen.queryAllByText('Stack')
    const byeConflictChips = screen.queryAllByText('Bye conflict')
    expect(stackChips).toHaveLength(1)
    expect(byeConflictChips).toHaveLength(1)
  })
})