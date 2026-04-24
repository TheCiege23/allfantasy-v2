import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PreDraftSlotSetupCard } from '@/components/app/draft-room/PreDraftSlotSetupCard'
import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function makeSession(overrides: Partial<DraftSessionSnapshot> = {}): DraftSessionSnapshot {
  return {
    id: 'ds-1',
    leagueId: 'league-1',
    status: 'paused',
    draftType: 'snake',
    rounds: 15,
    teamCount: 12,
    thirdRoundReversal: false,
    timerSeconds: 90,
    timerEndAt: null,
    pausedRemainingSeconds: 60,
    slotOrder: Array.from({ length: 12 }, (_, i) => ({
      slot: i + 1,
      rosterId: i === 0 ? 'real-human' : `placeholder-${i + 1}`,
      displayName: `Team ${i + 1}`,
    })),
    tradedPicks: [],
    version: 1,
    picks: [],
    currentPick: null,
    timer: { state: 'paused', remainingSeconds: 60 } as unknown as DraftSessionSnapshot['timer'],
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('PreDraftSlotSetupCard', () => {
  it('shows placeholder count in the header chip', () => {
    render(<PreDraftSlotSetupCard leagueId="league-1" session={makeSession()} />)
    expect(screen.getByTestId('predraft-slot-counts')).toHaveTextContent('1/12 real · 11 placeholder')
    expect(screen.getByTestId('predraft-slot-fill-button')).toBeInTheDocument()
  })

  it('shows ready state when no placeholders remain', () => {
    const allReal = makeSession({
      slotOrder: Array.from({ length: 12 }, (_, i) => ({
        slot: i + 1,
        rosterId: `real-${i + 1}`,
        displayName: `Team ${i + 1}`,
      })),
    })
    render(<PreDraftSlotSetupCard leagueId="league-1" session={allReal} />)
    expect(screen.getByTestId('predraft-slot-ready')).toBeInTheDocument()
    expect(screen.queryByTestId('predraft-slot-fill-button')).toBeNull()
  })

  it('clicking the button posts to the route and reports created count on success', async () => {
    const onSlotOrderUpdated = vi.fn()
    const nextSlotOrder = Array.from({ length: 12 }, (_, i) => ({
      slot: i + 1,
      rosterId: i === 0 ? 'real-human' : `real-new-${i + 1}`,
      displayName: `Team ${i + 1}`,
    }))
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        createdCount: 11,
        replacedCount: 11,
        alreadyMaterializedCount: 1,
        slotOrder: nextSlotOrder,
      }),
    })

    render(
      <PreDraftSlotSetupCard
        leagueId="league-1"
        session={makeSession()}
        onSlotOrderUpdated={onSlotOrderUpdated}
      />,
    )

    fireEvent.click(screen.getByTestId('predraft-slot-fill-button'))
    await waitFor(() => expect(screen.getByTestId('predraft-slot-success')).toBeInTheDocument())
    expect(screen.getByTestId('predraft-slot-success')).toHaveTextContent('11 placeholder teams')
    expect(onSlotOrderUpdated).toHaveBeenCalledWith(nextSlotOrder)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/leagues/league-1/setup/materialize-slots')
    expect(init).toMatchObject({ method: 'POST' })
  })

  it('shows error state when the route fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    })
    render(<PreDraftSlotSetupCard leagueId="league-1" session={makeSession()} />)
    fireEvent.click(screen.getByTestId('predraft-slot-fill-button'))
    await waitFor(() => expect(screen.getByTestId('predraft-slot-error')).toBeInTheDocument())
    expect(screen.getByTestId('predraft-slot-error')).toHaveTextContent('boom')
  })

  it('renders nothing breaking when session is null', () => {
    render(<PreDraftSlotSetupCard leagueId="league-1" session={null} />)
    expect(screen.getByTestId('predraft-slot-setup-card')).toBeInTheDocument()
    // Counts are zero / zero with no crash
    expect(screen.getByTestId('predraft-slot-counts')).toHaveTextContent('0/0 real · 0 placeholder')
  })
})
