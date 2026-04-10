import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ChatComposer } from '../app/dashboard/components/chat/ChatComposer'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

describe('ChatComposer mention UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens Global Broadcast modal when @global suggestion is selected', async () => {
    render(
      <ChatComposer
        leagueId="league-1"
        chatType="league"
        isCommissioner
        commissionerLeagues={[{ id: 'league-1', name: 'Alpha League', teamCount: 12 }]}
        onSend={async () => {}}
      />
    )

    const textarea = screen.getByTestId('league-chat-textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '@g', selectionStart: 2 } })
    fireEvent.keyUp(textarea, { key: 'g', target: { selectionStart: 2 } })

    const globalOption = await screen.findByRole('button', { name: /@global/i })
    fireEvent.click(globalOption)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /global broadcast/i })).toBeInTheDocument()
    })
    expect(textarea.value).toBe('')
  })

  it('inserts @chimmy token from mention autocomplete', async () => {
    render(
      <ChatComposer
        leagueId="league-1"
        chatType="league"
        isCommissioner
        commissionerLeagues={[]}
        onSend={async () => {}}
      />
    )

    const textarea = screen.getByTestId('league-chat-textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '@c', selectionStart: 2 } })
    fireEvent.keyUp(textarea, { key: 'c', target: { selectionStart: 2 } })

    const chimmyOption = await screen.findByRole('button', { name: /@chimmy/i })
    fireEvent.click(chimmyOption)

    await waitFor(() => {
      expect(textarea.value).toBe('@chimmy ')
    })
  })

  it('shows @all suggestion in league chat and not in dm chat', async () => {
    const { rerender } = render(
      <ChatComposer
        leagueId="league-1"
        chatType="league"
        isCommissioner
        commissionerLeagues={[]}
        onSend={async () => {}}
      />
    )

    let textarea = screen.getByTestId('league-chat-textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '@a', selectionStart: 2 } })
    fireEvent.keyUp(textarea, { key: 'a', target: { selectionStart: 2 } })

    expect(await screen.findByRole('button', { name: /@all/i })).toBeInTheDocument()

    rerender(
      <ChatComposer
        leagueId="league-1"
        chatType="dm"
        isCommissioner
        commissionerLeagues={[]}
        onSend={async () => {}}
      />
    )

    textarea = screen.getByTestId('league-chat-textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '@a', selectionStart: 2 } })
    fireEvent.keyUp(textarea, { key: 'a', target: { selectionStart: 2 } })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /@all/i })).toBeNull()
    })
  })
})
