import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import ChimmyQuickActionStrip from '@/components/chimmy-surfaces/ChimmyQuickActionStrip'
import type { AIAction, AIActionContext } from '@/lib/chimmy-actions'

vi.mock('@/components/chimmy-actions', () => ({
  useAIAction: () => ({
    execute: vi.fn().mockResolvedValue(undefined),
    isExecuting: false,
    executingActionId: null,
  }),
  ChimmyActionConfirmModal: ({
    action,
    onConfirm,
    onCancel,
  }: {
    action: AIAction
    onConfirm: (action: AIAction) => void
    onCancel: () => void
  }) => (
    <div role="dialog">
      <button onClick={() => onConfirm(action)}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
  ChimmyDisabledActionTooltip: ({
    reason,
    children,
  }: {
    reason: string
    children: React.ReactNode
  }) => (
    <div>
      {children}
      <div role="tooltip">{reason}</div>
    </div>
  ),
}))

const context: AIActionContext = {
  userId: 'u1',
  role: 'member',
  sport: 'NFL',
  leagueType: 'redraft',
  leagueId: 'l1',
  teamId: 't1',
  subscriptionState: {
    hasPremium: false,
    hasCommissioner: false,
    hasAdmin: false,
  },
  leagueState: {
    isLocked: false,
    isWaiverOpen: true,
    isLineupLocked: false,
    isDraftActive: false,
    isDraftComplete: true,
    isTradeDeadlinePast: false,
    isInPlayoffs: false,
  },
  rosterState: {
    hasIR: true,
    hasIL: false,
    hasTaxi: false,
    hasDevy: false,
  },
}

function makeAction(overrides: Partial<AIAction> = {}): AIAction {
  return {
    id: overrides.id ?? 'a1',
    type: overrides.type ?? 'open_deep_dive',
    label: overrides.label ?? 'Open Deep Dive',
    description: overrides.description ?? 'Open details',
    surface: overrides.surface ?? 'dashboard',
    leagueId: overrides.leagueId ?? 'l1',
    teamId: overrides.teamId ?? 't1',
    sport: overrides.sport ?? 'NFL',
    leagueType: overrides.leagueType ?? 'redraft',
    safetyClass: overrides.safetyClass ?? 'instant',
    requiresConfirmation: overrides.requiresConfirmation ?? false,
    requiresCommissioner: overrides.requiresCommissioner ?? false,
    requiresPremium: overrides.requiresPremium ?? false,
    requiredPermissions: overrides.requiredPermissions ?? ['member'],
    isAvailable: overrides.isAvailable ?? true,
    disabledReason: overrides.disabledReason ?? null,
    payload: overrides.payload ?? {},
    prefillTarget: overrides.prefillTarget ?? null,
    prefillData: overrides.prefillData,
    deepDiveHref: overrides.deepDiveHref ?? null,
    isDestructive: overrides.isDestructive ?? false,
    premiumBadgeLabel: overrides.premiumBadgeLabel,
  }
}

describe('ChimmyQuickActionStrip', () => {
  it('opens a confirmation modal for confirm-required actions', () => {
    const actions: AIAction[] = [
      makeAction({
        id: 'confirm-1',
        label: 'Claim Now',
        type: 'claim_player',
        requiresConfirmation: true,
        safetyClass: 'confirmed',
      }),
    ]

    render(<ChimmyQuickActionStrip actions={actions} context={context} />)

    fireEvent.click(screen.getByRole('button', { name: 'Claim Now' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows disabled tooltip reason on hover', () => {
    const actions: AIAction[] = [
      makeAction({
        id: 'disabled-1',
        label: 'Move To IR',
        type: 'move_to_ir',
        isAvailable: false,
        disabledReason: 'This league does not have an IR slot.',
      }),
    ]

    render(<ChimmyQuickActionStrip actions={actions} context={context} />)
    expect(screen.getByRole('tooltip')).toHaveTextContent('This league does not have an IR slot.')
  })
})
