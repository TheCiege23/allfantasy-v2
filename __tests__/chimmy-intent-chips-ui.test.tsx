import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChimmyIntentChips from '@/components/chimmy/ChimmyIntentChips'

describe('ChimmyIntentChips', () => {
  it('renders chips when flag is on and no user message exists', () => {
    render(
      React.createElement(ChimmyIntentChips, {
        enabled: true,
        hasUserMessage: false,
        leagueId: 'league-1',
        leagueName: 'Alpha League',
        surface: 'league',
        assistantMode: 'deep_analysis',
        onSendPrompt: () => undefined,
      })
    )

    expect(screen.getByTestId('chimmy-quick-prompt-chip-trade-help')).toBeInTheDocument()
  })

  it('does not render chips when feature flag is off', () => {
    render(
      React.createElement(ChimmyIntentChips, {
        enabled: false,
        hasUserMessage: false,
        leagueId: 'league-1',
        leagueName: 'Alpha League',
        surface: 'league',
        assistantMode: 'deep_analysis',
        onSendPrompt: () => undefined,
      })
    )

    expect(screen.queryByTestId('chimmy-quick-prompt-chip-trade-help')).not.toBeInTheDocument()
  })

  it('hides chips after first user message exists', () => {
    const { rerender } = render(
      React.createElement(ChimmyIntentChips, {
        enabled: true,
        hasUserMessage: false,
        leagueId: 'league-1',
        leagueName: 'Alpha League',
        surface: 'league',
        assistantMode: 'deep_analysis',
        onSendPrompt: () => undefined,
      })
    )

    expect(screen.getByTestId('chimmy-quick-prompt-chip-trade-help')).toBeInTheDocument()

    rerender(
      React.createElement(ChimmyIntentChips, {
        enabled: true,
        hasUserMessage: true,
        leagueId: 'league-1',
        leagueName: 'Alpha League',
        surface: 'league',
        assistantMode: 'deep_analysis',
        onSendPrompt: () => undefined,
      })
    )

    expect(screen.queryByTestId('chimmy-quick-prompt-chip-trade-help')).not.toBeInTheDocument()
  })

  it('clicking a chip sends prompt and emits safe chip_click analytics', () => {
    const onSendPrompt = vi.fn()
    const onTrackEvent = vi.fn()

    render(
      React.createElement(ChimmyIntentChips, {
        enabled: true,
        hasUserMessage: false,
        leagueId: 'league-9',
        leagueName: 'Alpha League',
        surface: 'war_room',
        assistantMode: 'commissioner_view',
        source: 'war_room',
        onSendPrompt,
        onTrackEvent,
      })
    )

    fireEvent.click(screen.getByTestId('chimmy-quick-prompt-chip-trade-help'))

    expect(onSendPrompt).toHaveBeenCalledTimes(1)
    expect(onSendPrompt).toHaveBeenCalledWith(expect.stringContaining('Alpha League'))

    expect(onTrackEvent).toHaveBeenCalledTimes(1)
    const event = onTrackEvent.mock.calls[0]?.[0] as Record<string, any>

    expect(event.event_name).toBe('chip_click')
    expect(event.league_id).toBe('league-9')
    expect(event.surface).toBe('war_room')
    expect(event.mode).toBe('commissioner_view')
    expect(event.topic).toBe('trade')

    expect(event.metadata.chipLabel).toBe('Trade Help')
    expect(event.metadata.chipTopic).toBe('trade')
    expect(event.metadata.surface).toBe('war_room')
    expect(event.metadata.assistantMode).toBe('commissioner_view')

    expect(event.metadata.prompt).toBeUndefined()
    expect(event.metadata.response).toBeUndefined()
    expect(event.metadata.rawPrompt).toBeUndefined()
    expect(event.metadata.rawResponse).toBeUndefined()
  })

  it('does not inject league context into prompts when leagueName is unavailable', () => {
    const onSendPrompt = vi.fn()

    render(
      React.createElement(ChimmyIntentChips, {
        enabled: true,
        hasUserMessage: false,
        leagueId: null,
        leagueName: null,
        surface: 'dashboard',
        assistantMode: 'fast_take',
        onSendPrompt,
      })
    )

    fireEvent.click(screen.getByTestId('chimmy-quick-prompt-chip-trade-help'))

    const prompt = onSendPrompt.mock.calls[0]?.[0] as string
    expect(prompt).not.toContain('null')
    expect(prompt).not.toContain('undefined')
    expect(prompt).not.toContain('Alpha League')
  })
})
