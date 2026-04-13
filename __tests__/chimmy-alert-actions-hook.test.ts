import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useChimmyAlertActions } from '@/hooks/useChimmyAlertActions'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const baseAlert = {
  alertId: 'alert-abc-001',
  dedupeKey: 'dedupe-abc-001',
  class: 'lineup' as const,
  type: 'lineup_incomplete',
}

describe('useChimmyAlertActions', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true })
  })

  it('dismiss sends dismissed lifecycle event', async () => {
    const { result } = renderHook(() => useChimmyAlertActions())
    await result.current.dismiss(baseAlert as any, { muteType: true })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/alerts/lifecycle',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.event).toBe('dismissed')
    expect(body.muteType).toBe(true)
    expect(body.alertType).toBe('lineup_incomplete')
  })

  it('snooze sends snoozed event with duration', async () => {
    const { result } = renderHook(() => useChimmyAlertActions())
    await result.current.snooze(baseAlert as any, '4h')

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.event).toBe('snoozed')
    expect(body.snoozeDuration).toBe('4h')
  })

  it('markDone sends acted_on event', async () => {
    const { result } = renderHook(() => useChimmyAlertActions())
    await result.current.markDone(baseAlert as any)

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.event).toBe('acted_on')
  })
})
