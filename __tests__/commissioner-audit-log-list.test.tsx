import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CommissionerAuditLogList } from '@/components/app/draft-room/CommissionerAuditLogList'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const slotOrder = Array.from({ length: 12 }, (_, i) => ({
  slot: i + 1,
  rosterId: `roster-${i + 1}`,
  displayName: `Team ${i + 1}`,
}))

function page(items: any[], nextCursor: string | null = null) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ items, nextCursor }),
  }
}

function assignRow(overrides: any = {}) {
  return {
    id: 'a1',
    action: 'ASSIGN_PLAYER_TO_PICK',
    overallPickNumber: 1,
    round: 1,
    actorUserId: 'user-abc12345',
    oldRosterId: null,
    newRosterId: 'roster-1',
    oldPlayerId: null,
    oldPlayerName: null,
    newPlayerId: 'pid',
    newPlayerName: 'Saquon Barkley',
    reason: 'Slice 3 smoke test',
    metadata: {},
    createdAt: '2026-04-24T12:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('CommissionerAuditLogList', () => {
  it('renders loading state then shows rows', async () => {
    fetchMock.mockResolvedValueOnce(page([assignRow()]))
    render(<CommissionerAuditLogList leagueId="league-1" slotOrder={slotOrder} />)
    await waitFor(() => expect(screen.getByTestId('commish-audit-row-a1')).toBeInTheDocument())
    expect(screen.getByText(/Assigned player/)).toBeInTheDocument()
    expect(screen.getByText(/Saquon Barkley/)).toBeInTheDocument()
    expect(screen.getByText(/Team 1/)).toBeInTheDocument()
    expect(screen.getByText(/Slice 3 smoke test/)).toBeInTheDocument()
  })

  it('renders empty state when no items', async () => {
    fetchMock.mockResolvedValueOnce(page([]))
    render(<CommissionerAuditLogList leagueId="league-1" />)
    await waitFor(() => expect(screen.getByText(/No audit entries yet/)).toBeInTheDocument())
  })

  it('applies action filter on change', async () => {
    fetchMock.mockResolvedValueOnce(page([assignRow()]))
    render(<CommissionerAuditLogList leagueId="league-1" />)
    await waitFor(() => expect(screen.getByTestId('commish-audit-row-a1')).toBeInTheDocument())
    fetchMock.mockResolvedValueOnce(page([]))
    fireEvent.change(screen.getByTestId('commish-audit-filter'), {
      target: { value: 'CHANGE_PICK_OWNER' },
    })
    await waitFor(() => {
      const url = fetchMock.mock.calls[1][0] as string
      expect(url).toContain('action=CHANGE_PICK_OWNER')
    })
  })

  it('loads more on button click with cursor', async () => {
    fetchMock.mockResolvedValueOnce(page([assignRow({ id: 'p1' })], 'cursor-xyz'))
    render(<CommissionerAuditLogList leagueId="league-1" />)
    await waitFor(() => expect(screen.getByTestId('commish-audit-row-p1')).toBeInTheDocument())
    fetchMock.mockResolvedValueOnce(page([assignRow({ id: 'p2' })]))
    fireEvent.click(screen.getByTestId('commish-audit-load-more'))
    await waitFor(() => expect(screen.getByTestId('commish-audit-row-p2')).toBeInTheDocument())
    const secondUrl = fetchMock.mock.calls[1][0] as string
    expect(secondUrl).toContain('cursor=cursor-xyz')
    // First row still present
    expect(screen.getByTestId('commish-audit-row-p1')).toBeInTheDocument()
  })

  it('refetches when refreshKey changes', async () => {
    fetchMock.mockResolvedValue(page([assignRow()]))
    const { rerender } = render(<CommissionerAuditLogList leagueId="league-1" refreshKey={1} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    rerender(<CommissionerAuditLogList leagueId="league-1" refreshKey={2} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('shows error banner on failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    })
    render(<CommissionerAuditLogList leagueId="league-1" />)
    await waitFor(() => expect(screen.getByTestId('commish-audit-error')).toBeInTheDocument())
    expect(screen.getByTestId('commish-audit-error')).toHaveTextContent('boom')
  })
})
