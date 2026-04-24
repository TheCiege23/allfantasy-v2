import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CommissionerPickEditorPanel } from '@/components/app/draft-room/CommissionerPickEditorPanel'
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
      rosterId: `roster-${i + 1}`,
      displayName: `Team ${i + 1}`,
    })),
    tradedPicks: [],
    version: 5,
    picks: [
      {
        id: 'pick-1',
        overall: 1,
        round: 1,
        slot: 1,
        rosterId: 'roster-1',
        displayName: 'Team 1',
        playerName: 'Old Player',
        position: 'RB',
        team: 'DAL',
        byeWeek: 9,
        playerId: 'pid-1',
        playerImageUrl: null,
        tradedPickMeta: null,
        source: 'user',
        pickLabel: '1.01',
        createdAt: new Date().toISOString(),
      },
    ],
    currentPick: null,
    timer: { state: 'paused', remainingSeconds: 60 } as unknown as DraftSessionSnapshot['timer'],
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const players = [
  { id: 'pid-A', name: 'New Star', position: 'WR', team: 'KC', byeWeek: 10, imageUrl: null },
  { id: 'pid-B', name: 'Backup', position: 'TE', team: 'SF', byeWeek: 9, imageUrl: null },
]

describe('CommissionerPickEditorPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('shows paused locked state when draft is in_progress', () => {
    render(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession({ status: 'in_progress' })}
        players={players}
        onSnapshotUpdated={vi.fn()}
      />,
    )
    expect(screen.getByTestId('commish-edit-locked-paused')).toHaveTextContent('Pause the draft')
    expect(screen.queryByTestId('commish-edit-panel')).toBeNull()
  })

  it('shows auction locked state', () => {
    render(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession({ draftType: 'auction' })}
        players={players}
        onSnapshotUpdated={vi.fn()}
      />,
    )
    expect(screen.getByTestId('commish-edit-locked-auction')).toBeInTheDocument()
  })

  it('REMOVE: posts expected payload and calls onSnapshotUpdated', async () => {
    const onUpdate = vi.fn()
    const nextSnap = makeSession({ version: 6 })
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, session: nextSnap }),
    })

    render(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession()}
        players={players}
        onSnapshotUpdated={onUpdate}
      />,
    )

    fireEvent.change(screen.getByTestId('commish-edit-action'), {
      target: { value: 'REMOVE_PLAYER_FROM_PICK' },
    })
    fireEvent.change(screen.getByTestId('commish-edit-overall'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('commish-edit-reason'), { target: { value: 'wrong player' } })
    fireEvent.click(screen.getByTestId('commish-edit-submit'))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(nextSnap))
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe('/api/leagues/league-1/draft/commissioner/pick-edit')
    const sentBody = JSON.parse(call[1].body)
    expect(sentBody).toMatchObject({
      action: 'REMOVE_PLAYER_FROM_PICK',
      overallPickNumber: 1,
      reason: 'wrong player',
      force: false,
    })
    expect(screen.getByTestId('commish-edit-success')).toBeInTheDocument()
  })

  it('handles 409 ROSTER_ELIGIBILITY: shows warning + Force anyway resubmits with force=true', async () => {
    const onUpdate = vi.fn()
    const nextSnap = makeSession({ version: 7 })
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'No K slot',
          code: 'ROSTER_ELIGIBILITY',
          warnings: [{ message: 'No K slot available on roster' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, session: nextSnap }),
      })

    render(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession()}
        players={players}
        onSnapshotUpdated={onUpdate}
      />,
    )

    fireEvent.change(screen.getByTestId('commish-edit-action'), {
      target: { value: 'REPLACE_PLAYER_ON_PICK' },
    })
    fireEvent.change(screen.getByTestId('commish-edit-overall'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('commish-edit-player'), { target: { value: 'pid-A' } })
    fireEvent.click(screen.getByTestId('commish-edit-submit'))

    await waitFor(() => expect(screen.getByTestId('commish-edit-warning')).toBeInTheDocument())
    expect(screen.getByTestId('commish-edit-warning')).toHaveTextContent('No K slot available on roster')
    expect(onUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('commish-edit-force-anyway'))
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(nextSnap))

    const secondCall = fetchMock.mock.calls[1]
    const secondBody = JSON.parse(secondCall[1].body)
    expect(secondBody.force).toBe(true)
  })

  it('prefills overall from selectedOverall and calls onSelectedOverallConsumed', () => {
    const consumed = vi.fn()
    const { rerender } = render(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession()}
        players={players}
        selectedOverall={null}
        onSelectedOverallConsumed={consumed}
        onSnapshotUpdated={vi.fn()}
      />,
    )
    const overallInput = screen.getByTestId('commish-edit-overall') as HTMLInputElement
    expect(overallInput.value).toBe('')

    rerender(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession()}
        players={players}
        selectedOverall={7}
        onSelectedOverallConsumed={consumed}
        onSnapshotUpdated={vi.fn()}
      />,
    )
    expect(overallInput.value).toBe('7')
    expect(consumed).toHaveBeenCalledTimes(1)

    // Same value re-passed must not re-clobber a manual edit
    fireEvent.change(overallInput, { target: { value: '99' } })
    rerender(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={makeSession()}
        players={players}
        selectedOverall={7}
        onSelectedOverallConsumed={consumed}
        onSnapshotUpdated={vi.fn()}
      />,
    )
    expect(overallInput.value).toBe('99')
    expect(consumed).toHaveBeenCalledTimes(1)
  })

  it('shows hint when REPLACE targets an empty pick', () => {
    const sess = makeSession({ picks: [] })
    render(
      <CommissionerPickEditorPanel
        leagueId="league-1"
        session={sess}
        players={players}
        onSnapshotUpdated={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('commish-edit-action'), {
      target: { value: 'REPLACE_PLAYER_ON_PICK' },
    })
    fireEvent.change(screen.getByTestId('commish-edit-overall'), { target: { value: '1' } })
    expect(screen.getByTestId('commish-edit-guardrail')).toHaveTextContent('use Assign instead')
  })
})
