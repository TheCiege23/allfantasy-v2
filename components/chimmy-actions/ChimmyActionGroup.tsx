'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AIAction, AIActionContext } from '@/lib/chimmy-actions'
import { confirmAIActionIfNeeded } from '@/lib/chimmy-actions'
import { trackAIActionEvent, trackAIActionShown } from '@/lib/chimmy-actions'
import { ChimmyPrimaryActionButton } from './ChimmyPrimaryActionButton'
import { ChimmySecondaryActionButton } from './ChimmySecondaryActionButton'
import { ChimmyActionConfirmModal } from './ChimmyActionConfirmModal'
import { ChimmyDisabledActionTooltip } from './ChimmyDisabledActionTooltip'
import { ChimmyPremiumLockedAction } from './ChimmyPremiumLockedAction'
import { useAIAction } from './useAIAction'

interface ChimmyActionGroupProps {
  /** The recommended primary action */
  primaryAction: AIAction
  /** Optional secondary / follow-up actions */
  secondaryActions?: AIAction[]
  /** Full AI context — passed to executor for validation */
  context: AIActionContext
  /** Callback after any action completes successfully */
  onSuccess?: (action: AIAction) => void
  /** Callback if an action fails */
  onError?: (action: AIAction, error: string) => void
  className?: string
}

/**
 * Orchestrates primary + secondary Chimmy actions.
 * Owns confirm-modal state, premium gate display, disabled tooltip.
 * Hands off execution to useAIAction which handles the full lifecycle.
 */
export function ChimmyActionGroup({
  primaryAction,
  secondaryActions = [],
  context,
  onSuccess,
  onError,
  className = '',
}: ChimmyActionGroupProps) {
  const [pendingConfirm, setPendingConfirm] = useState<AIAction | null>(null)
  const { execute, isExecuting, executingActionId } = useAIAction()
  const trackedShownIds = useRef<Set<string>>(new Set())
  const allActions = useMemo(() => [primaryAction, ...secondaryActions], [primaryAction, secondaryActions])

  useEffect(() => {
    const untracked = allActions.filter((action) => !trackedShownIds.current.has(action.id))
    if (untracked.length === 0) return

    for (const action of untracked) trackedShownIds.current.add(action.id)
    trackAIActionShown(untracked, context, { source: 'chimmy_action_group' }).catch(() => {})
  }, [allActions, context])

  function handleActionClick(action: AIAction) {
    if (!action.isAvailable) return

    if (confirmAIActionIfNeeded(action)) {
      setPendingConfirm(action)
    } else {
      runAction(action)
    }
  }

  async function runAction(action: AIAction) {
    await execute(action, context, {
      onSuccess: () => onSuccess?.(action),
      onError: (err: string) => onError?.(action, err),
    })
  }

  function handleConfirm(action: AIAction) {
    trackAIActionEvent({
      action,
      context,
      event: 'confirmed',
      metadata: { source: 'confirm_modal' },
    }).catch(() => {})
    setPendingConfirm(null)
    runAction(action)
  }

  function handleCancelPendingConfirm() {
    if (pendingConfirm) {
      trackAIActionEvent({
        action: pendingConfirm,
        context,
        event: 'dismissed',
        metadata: { source: 'confirm_modal' },
      }).catch(() => {})
    }
    setPendingConfirm(null)
  }

  function renderPrimaryButton() {
    const action = primaryAction
    const isLoading = isExecuting && executingActionId === action.id

    if (action.requiresPremium && !action.isAvailable && action.disabledReason?.includes('Pro')) {
      return (
        <ChimmyPremiumLockedAction
          action={action}
          badgeLabel={action.premiumBadgeLabel ?? 'AllFantasy Pro'}
        />
      )
    }

    if (!action.isAvailable && action.disabledReason) {
      return (
        <ChimmyDisabledActionTooltip reason={action.disabledReason}>
          <ChimmyPrimaryActionButton
            action={action}
            onClick={() => {}}
            isLoading={isLoading}
          />
        </ChimmyDisabledActionTooltip>
      )
    }

    return (
      <ChimmyPrimaryActionButton
        action={action}
        onClick={handleActionClick}
        isLoading={isLoading}
      />
    )
  }

  return (
    <>
      <div className={['flex flex-wrap items-center gap-2', className].join(' ')}>
        {renderPrimaryButton()}

        {secondaryActions.map((action) => {
          const isLoading = isExecuting && executingActionId === action.id

          if (!action.isAvailable && action.disabledReason) {
            return (
              <ChimmyDisabledActionTooltip key={action.id} reason={action.disabledReason}>
                <ChimmySecondaryActionButton
                  action={action}
                  onClick={() => {}}
                  isLoading={isLoading}
                />
              </ChimmyDisabledActionTooltip>
            )
          }

          return (
            <ChimmySecondaryActionButton
              key={action.id}
              action={action}
              onClick={handleActionClick}
              isLoading={isLoading}
            />
          )
        })}
      </div>

      {pendingConfirm && (
        <ChimmyActionConfirmModal
          action={pendingConfirm}
          onConfirm={handleConfirm}
          onCancel={handleCancelPendingConfirm}
        />
      )}
    </>
  )
}
