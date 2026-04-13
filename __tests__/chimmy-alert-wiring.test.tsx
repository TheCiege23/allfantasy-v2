import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── vi.hoisted: declare mock refs before the module registry runs ─────────────
const mockActions = vi.hoisted(() => ({
  dismiss: vi.fn(async () => {}),
  snooze: vi.fn(async () => {}),
  markDone: vi.fn(async () => {}),
  markRead: vi.fn(async () => {}),
}))

vi.mock('@/hooks/useChimmyAlertActions', () => ({
  useChimmyAlertActions: () => mockActions,
  // re-export ChimmySnoozePreset type passthrough (not needed at runtime)
}))

// ── Shared fixtures ───────────────────────────────────────────────────────────

const baseAlert = {
  alertId: 'alert-abc-001',
  dedupeKey: 'dedupe-abc-001',
  class: 'lineup' as const,
  type: 'lineup_incomplete',
  title: 'Set your lineup',
  message: 'You have unfilled spots',
  severity: 'urgent' as const,
  confidenceScore: 88,
  urgencyScore: 82,
  channels: ['in_app_banner', 'notification_center'] as const,
  primaryChannel: 'in_app_banner' as const,
  dismissible: true,
  snoozable: true,
  repeatable: true,
  repeatCooldownMinutes: 90,
  expiresAt: null,
  leagueId: 'league-1',
  teamId: null,
  sport: 'NFL',
  leagueType: 'redraft',
  roleScope: 'member' as const,
  actions: [{ label: 'Set Lineup', href: '/leagues/league-1/lineup' }],
  metadata: {},
}

// ── ChimmyAlertCard wiring ────────────────────────────────────────────────────

describe('ChimmyAlertCard action wiring', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls dismiss lifecycle and fires onDismiss prop', async () => {
    const { default: ChimmyAlertCard } = await import(
      '@/components/chimmy-surfaces/ChimmyAlertCard'
    )
    const onDismiss = vi.fn()
    render(
      <ChimmyAlertCard alert={baseAlert as any} onDismiss={onDismiss} />,
    )

    const dismissBtn = screen.getByText('Dismiss')
    fireEvent.click(dismissBtn)

    await waitFor(() => expect(mockActions.dismiss).toHaveBeenCalledWith(baseAlert))
    expect(onDismiss).toHaveBeenCalledWith(baseAlert)
  })

  it('calls markDone lifecycle when Done button clicked', async () => {
    const { default: ChimmyAlertCard } = await import(
      '@/components/chimmy-surfaces/ChimmyAlertCard'
    )
    const onDone = vi.fn()
    render(<ChimmyAlertCard alert={baseAlert as any} onDone={onDone} />)

    const doneBtn = screen.getByText('Done')
    fireEvent.click(doneBtn)

    await waitFor(() => expect(mockActions.markDone).toHaveBeenCalledWith(baseAlert))
    expect(onDone).toHaveBeenCalledWith(baseAlert)
  })

  it('hides card after dismiss', async () => {
    const { default: ChimmyAlertCard } = await import(
      '@/components/chimmy-surfaces/ChimmyAlertCard'
    )
    render(<ChimmyAlertCard alert={baseAlert as any} />)

    expect(screen.getByText('Set your lineup')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Dismiss'))

    await waitFor(() =>
      expect(screen.queryByText('Set your lineup')).not.toBeInTheDocument(),
    )
  })

  it('hides card after Done', async () => {
    const { default: ChimmyAlertCard } = await import(
      '@/components/chimmy-surfaces/ChimmyAlertCard'
    )
    render(<ChimmyAlertCard alert={baseAlert as any} />)

    fireEvent.click(screen.getByText('Done'))

    await waitFor(() =>
      expect(screen.queryByText('Set your lineup')).not.toBeInTheDocument(),
    )
  })
})

// ── ChimmyAlertFeedItem wiring ────────────────────────────────────────────────

describe('ChimmyAlertFeedItem action wiring', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls markRead lifecycle when "Mark read" clicked', async () => {
    const { default: ChimmyAlertFeedItem } = await import(
      '@/components/chimmy-surfaces/ChimmyAlertFeedItem'
    )
    const onMarkRead = vi.fn()
    render(
      <ChimmyAlertFeedItem
        alert={baseAlert as any}
        defaultUnread
        onMarkRead={onMarkRead}
      />,
    )

    fireEvent.click(screen.getByText('Mark read'))

    await waitFor(() => expect(mockActions.markRead).toHaveBeenCalledWith(baseAlert))
    expect(onMarkRead).toHaveBeenCalledWith(baseAlert)
  })

  it('calls dismiss and hides feed item', async () => {
    const { default: ChimmyAlertFeedItem } = await import(
      '@/components/chimmy-surfaces/ChimmyAlertFeedItem'
    )
    const onDismiss = vi.fn()
    render(
      <ChimmyAlertFeedItem
        alert={baseAlert as any}
        defaultUnread
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByText('Dismiss'))

    await waitFor(() => expect(mockActions.dismiss).toHaveBeenCalledWith(baseAlert))
    expect(onDismiss).toHaveBeenCalledWith(baseAlert)
    await waitFor(() =>
      expect(screen.queryByText('Set your lineup')).not.toBeInTheDocument(),
    )
  })
})

// ── ChimmySnoozeAction duration picker ───────────────────────────────────────

describe('ChimmySnoozeAction duration picker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens duration menu on click', async () => {
    const { default: ChimmySnoozeAction } = await import(
      '@/components/chimmy-surfaces/ChimmySnoozeAction'
    )
    render(<ChimmySnoozeAction onSnooze={vi.fn()} />)

    fireEvent.click(screen.getByText('Snooze'))

    expect(screen.getByText('1 hour')).toBeInTheDocument()
    expect(screen.getByText('15 minutes')).toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
  })

  it('calls onSnooze with selected preset and closes menu', async () => {
    const { default: ChimmySnoozeAction } = await import(
      '@/components/chimmy-surfaces/ChimmySnoozeAction'
    )
    const onSnooze = vi.fn()
    render(<ChimmySnoozeAction onSnooze={onSnooze} />)

    fireEvent.click(screen.getByText('Snooze'))
    fireEvent.click(screen.getByText('4 hours'))

    expect(onSnooze).toHaveBeenCalledWith('4h')
    expect(screen.queryByText('15 minutes')).not.toBeInTheDocument()
  })
})
