import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { ChimmyKPIReadout } from '@/components/admin/ChimmyKPIReadout'

const fetchMock = vi.fn()

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  }
}

function errResponse(body: unknown) {
  return {
    ok: false,
    status: 500,
    json: async () => body,
  }
}

describe('ChimmyKPIReadout', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders KPI fields and grouped sections from rollup', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({
        ok: true,
        truncated: false,
        rollup: {
          period: { from: '2026-04-22', to: '2026-04-28' },
          totals: {
            messages_sent: 12,
            responses_rendered: 10,
            chip_clicks: 6,
            followup_clicks: 4,
            helpful: 8,
            unhelpful: 2,
            helpful_rate: 0.8,
            chip_click_through_rate: 0.6,
            followup_click_through_rate: 0.4,
            formatter_fallback_count: 1,
            contract_validation_failure_count: 2,
            mode_changes: 3,
          },
          by_surface: [{ surface: 'dashboard', messages_sent: 5, responses_rendered: 4, chip_clicks: 2, followup_clicks: 1, helpful: 3, unhelpful: 1 }],
          by_mode: [{ mode: 'fast_take', messages_sent: 7, responses_rendered: 6, chip_clicks: 3, followup_clicks: 2, helpful: 5, unhelpful: 1 }],
          by_topic: [{ topic: 'trade', messages_sent: 4, helpful: 3, unhelpful: 1 }],
          by_day: [{ date: '2026-04-28', messages_sent: 2, responses_rendered: 2, chip_clicks: 1, followup_clicks: 1, helpful: 1, unhelpful: 0 }],
          event_count: 22,
        },
      })
    )

    render(React.createElement(ChimmyKPIReadout))

    await waitFor(() => {
      expect(screen.getByTestId('chimmy-kpi-messages')).toHaveTextContent('12')
    })

    expect(screen.getByTestId('chimmy-kpi-responses')).toHaveTextContent('10')
    expect(screen.getByTestId('chimmy-kpi-chip-clicks')).toHaveTextContent('6')
    expect(screen.getByTestId('chimmy-kpi-followup-clicks')).toHaveTextContent('4')
    expect(screen.getByTestId('chimmy-kpi-helpful')).toHaveTextContent('8')
    expect(screen.getByTestId('chimmy-kpi-unhelpful')).toHaveTextContent('2')
    expect(screen.getByTestId('chimmy-kpi-helpful-rate')).toHaveTextContent('80.0%')
    expect(screen.getByTestId('chimmy-kpi-formatter-fallback')).toHaveTextContent('1')
    expect(screen.getByTestId('chimmy-kpi-contract-failures')).toHaveTextContent('2')

    expect(screen.getByTestId('chimmy-kpi-by-surface')).toHaveTextContent('dashboard')
    expect(screen.getByTestId('chimmy-kpi-by-mode')).toHaveTextContent('fast_take')
    expect(screen.getByTestId('chimmy-kpi-by-topic')).toHaveTextContent('trade')
    expect(screen.getByTestId('chimmy-kpi-by-day')).toHaveTextContent('2026-04-28')

    const firstUrl = String(fetchMock.mock.calls[0][0])
    expect(firstUrl).toContain('/api/ai/analytics/rollup?')
    expect(firstUrl).toContain('from=')
    expect(firstUrl).toContain('to=')
  })

  it('shows empty-state labels when grouped buckets are empty', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({
        ok: true,
        truncated: false,
        rollup: {
          period: { from: '2026-04-22', to: '2026-04-28' },
          totals: {
            messages_sent: 0,
            responses_rendered: 0,
            chip_clicks: 0,
            followup_clicks: 0,
            helpful: 0,
            unhelpful: 0,
            helpful_rate: null,
            chip_click_through_rate: null,
            followup_click_through_rate: null,
            formatter_fallback_count: 0,
            contract_validation_failure_count: 0,
            mode_changes: 0,
          },
          by_surface: [],
          by_mode: [],
          by_topic: [],
          by_day: [],
          event_count: 0,
        },
      })
    )

    render(React.createElement(ChimmyKPIReadout))

    await waitFor(() => {
      expect(screen.getByTestId('chimmy-kpi-messages')).toHaveTextContent('0')
    })

    expect(screen.getByTestId('chimmy-kpi-by-surface')).toHaveTextContent('No surface data.')
    expect(screen.getByTestId('chimmy-kpi-by-mode')).toHaveTextContent('No mode data.')
    expect(screen.getByTestId('chimmy-kpi-by-topic')).toHaveTextContent('No topic data.')
    expect(screen.getByTestId('chimmy-kpi-by-day')).toHaveTextContent('No daily data.')
  })

  it('shows error state when API request fails', async () => {
    fetchMock.mockResolvedValueOnce(errResponse({ ok: false, error: 'boom' }))

    render(React.createElement(ChimmyKPIReadout))

    await waitFor(() => {
      expect(screen.getByTestId('chimmy-kpi-error')).toHaveTextContent('boom')
    })
  })

  it('does not render raw prompt/response text even if present in payload', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({
        ok: true,
        truncated: false,
        rollup: {
          period: { from: '2026-04-22', to: '2026-04-28' },
          totals: {
            messages_sent: 1,
            responses_rendered: 1,
            chip_clicks: 0,
            followup_clicks: 0,
            helpful: 1,
            unhelpful: 0,
            helpful_rate: 1,
            chip_click_through_rate: 0,
            followup_click_through_rate: 0,
            formatter_fallback_count: 0,
            contract_validation_failure_count: 0,
            mode_changes: 0,
          },
          by_surface: [],
          by_mode: [],
          by_topic: [],
          by_day: [],
          event_count: 2,
          // extra keys that should never display
          prompt: 'Who should I start this week?',
          rawResponse: 'Start player X',
          messageText: 'hidden message body',
          content: 'hidden content blob',
        },
      })
    )

    render(React.createElement(ChimmyKPIReadout))

    await waitFor(() => {
      expect(screen.getByTestId('chimmy-kpi-messages')).toHaveTextContent('1')
    })

    expect(screen.queryByText('Who should I start this week?')).toBeNull()
    expect(screen.queryByText('Start player X')).toBeNull()
    expect(screen.queryByText('hidden message body')).toBeNull()
    expect(screen.queryByText('hidden content blob')).toBeNull()
  })

  it('refreshes with updated date range', async () => {
    fetchMock.mockResolvedValue(okResponse({
      ok: true,
      truncated: false,
      rollup: {
        period: { from: '2026-04-22', to: '2026-04-28' },
        totals: {
          messages_sent: 2,
          responses_rendered: 2,
          chip_clicks: 1,
          followup_clicks: 1,
          helpful: 1,
          unhelpful: 1,
          helpful_rate: 0.5,
          chip_click_through_rate: 0.5,
          followup_click_through_rate: 0.5,
          formatter_fallback_count: 0,
          contract_validation_failure_count: 0,
          mode_changes: 0,
        },
        by_surface: [],
        by_mode: [],
        by_topic: [],
        by_day: [],
        event_count: 4,
      },
    }))

    render(React.createElement(ChimmyKPIReadout))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByTestId('chimmy-kpi-from'), { target: { value: '2026-04-20' } })
    fireEvent.change(screen.getByTestId('chimmy-kpi-to'), { target: { value: '2026-04-27' } })
    fireEvent.click(screen.getByTestId('chimmy-kpi-refresh'))

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    const lastUrl = String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0])
    expect(lastUrl).toContain('from=2026-04-20')
    expect(lastUrl).toContain('to=2026-04-27')
  })
})
