import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeagueConceptIntroGate } from '@/components/league/LeagueConceptIntroGate'

describe('LeagueConceptIntroGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not fetch or render when shouldPlayIntro is false', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ seen: false }),
    } as Response)

    render(
      <LeagueConceptIntroGate
        leagueId="league-1"
        shouldPlayIntro={false}
        leagueType="redraft"
        settings={{}}
      />,
    )

    expect(screen.queryByTestId('concept-intro-overlay')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  it('renders overlay when handoff is true and intro is unseen', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ seen: false }),
    } as Response)

    render(
      <LeagueConceptIntroGate
        leagueId="league-1"
        shouldPlayIntro={true}
        leagueType="redraft"
        settings={{}}
      />,
    )

    await screen.findByTestId('concept-intro-overlay')
    expect(fetchSpy).toHaveBeenCalledWith('/api/leagues/league-1/intro-status', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
  })

  it('marks intro seen when dismissed', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ seen: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)

    render(
      <LeagueConceptIntroGate
        leagueId="league-1"
        shouldPlayIntro={true}
        leagueType="redraft"
        settings={{}}
      />,
    )

    const closeButton = await screen.findByTestId('concept-intro-close')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/leagues/league-1/intro-seen', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    })
  })
})
