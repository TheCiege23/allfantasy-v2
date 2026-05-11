import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DraftIntroGate } from '@/components/draft/DraftIntroGate'

describe('DraftIntroGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render overlay when status has no video url', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ seen: false, draftTypeKey: 'snake', videoUrl: null }),
    } as Response)

    render(
      <DraftIntroGate
        leagueId="league-1"
        draftSessionId="draft-1"
        shouldPlayIntro={true}
      />,
    )

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/leagues/league-1/draft/draft-1/intro-status', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
    })

    expect(screen.queryByTestId('draft-intro-overlay')).not.toBeInTheDocument()
  })

  it('renders overlay when unseen and video is available', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        seen: false,
        draftTypeKey: 'snake',
        videoUrl: '/media/create-league/drafts/videos/Snake Draft.mp4',
        posterUrl: '/images/draft-types/snake-draft.png',
      }),
    } as Response)

    render(
      <DraftIntroGate
        leagueId="league-1"
        draftSessionId="draft-1"
        shouldPlayIntro={true}
      />,
    )

    await screen.findByTestId('draft-intro-overlay')
  })

  it('marks intro seen on dismiss', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
        seen: false,
        draftTypeKey: 'snake',
        videoUrl: '/media/create-league/drafts/videos/Snake Draft.mp4',
        posterUrl: '/images/draft-types/snake-draft.png',
      }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response)

    render(
      <DraftIntroGate
        leagueId="league-1"
        draftSessionId="draft-1"
        shouldPlayIntro={true}
      />,
    )

    const closeButton = await screen.findByTestId('draft-intro-close')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/leagues/league-1/draft/draft-1/intro-seen', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    })
  })
})
