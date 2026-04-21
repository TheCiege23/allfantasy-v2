import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('@/components/chimmy-surfaces/ChimmyAlertPreferencesPanel', () => ({
  default: () => <div data-testid="chimmy-alert-preferences-panel">chimmy panel</div>,
}))

import AlertSettingsClient from '@/app/alerts/settings/AlertSettingsClient'

describe('AlertSettingsClient', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      json: async () => ({
        injuryAlerts: true,
        performanceAlerts: true,
        lineupAlerts: true,
      }),
    })
  })

  it('renders Chimmy preferences section after loading', async () => {
    render(<AlertSettingsClient />)

    await waitFor(() => {
      expect(screen.getByText('Chimmy alert controls')).toBeInTheDocument()
    })

    expect(screen.getByTestId('chimmy-alert-preferences-panel')).toBeInTheDocument()
    expect(screen.getByText(/Fine-tune Chimmy frequency/i)).toBeInTheDocument()
  })
})
