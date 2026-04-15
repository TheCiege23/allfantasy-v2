'use client'

/**
 * ChimmyQuickActionStrip — Pattern B
 * Compact horizontal strip of action buttons for dense surfaces
 * (draft room, waiver wire, matchup page).
 * Horizontally scrollable on mobile; wraps on desktop.
 */

import { Sparkles } from 'lucide-react'
import type { AIAction, AIActionContext } from '@/lib/chimmy-actions'
import { confirmAIActionIfNeeded } from '@/lib/chimmy-actions'
import React, { useState } from 'react'
import { ChimmyActionConfirmModal } from '@/components/chimmy-actions'
import { useAIAction } from '@/components/chimmy-actions'
import { ChimmyDisabledActionTooltip } from '@/components/chimmy-actions'

export interface ChimmyQuickActionStripProps {
  /** Actions to render — first is styling as primary */
  actions: AIAction[]
  context: AIActionContext
  /** Optional label shown at the start of the strip */
  label?: string
  /** Ultra-compact mode: icon only, no text (supply aria-label via action.label) */
  iconOnly?: boolean
  onSuccess?: (action: AIAction) => void
  className?: string
}

export default function ChimmyQuickActionStrip({
  actions,
  context,
  label,
  iconOnly = false,
  onSuccess,
  className = '',
}: ChimmyQuickActionStripProps) {
  const [pendingConfirm, setPendingConfirm] = useState<AIAction | null>(null)
  const { execute, isExecuting, executingActionId } = useAIAction()

  if (actions.length === 0) return null

  function handleClick(action: AIAction) {
    if (!action.isAvailable) return
    if (confirmAIActionIfNeeded(action)) {
      setPendingConfirm(action)
    } else {
      run(action)
    }
  }

  async function run(action: AIAction) {
    await execute(action, context, { onSuccess: () => onSuccess?.(action) })
  }

  return (
    <>
      <div
        className={[
          'flex items-center gap-1.5 overflow-x-auto scrollbar-none',
          className,
        ].join(' ')}
        role="group"
        aria-label={label ?? 'Quick actions'}
      >
        {/* Optional Chimmy prefix */}
        {label && (
          <span className="mr-1 shrink-0 text-xs font-semibold text-white/30 uppercase tracking-wide">
            {label}
          </span>
        )}

        {actions.map((action, idx) => {
          const isPrimary = idx === 0
          const isLoading = isExecuting && executingActionId === action.id

          const btn = (
            <button
              key={action.id}
              type="button"
              disabled={!action.isAvailable || isLoading}
              onClick={() => handleClick(action)}
              className={[
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg transition-all active:scale-95',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500',
                iconOnly ? 'h-8 w-8 justify-center' : 'px-3 py-1.5 text-xs font-medium',
                !action.isAvailable
                  ? 'cursor-not-allowed opacity-40'
                  : isPrimary
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                    : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white',
              ].join(' ')}
              aria-label={action.label}
              title={!action.isAvailable ? (action.disabledReason ?? action.label) : action.label}
            >
              {isLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              ) : isPrimary ? (
                <Sparkles className={iconOnly ? 'h-3.5 w-3.5' : 'h-3 w-3 shrink-0'} aria-hidden="true" />
              ) : null}
              {!iconOnly && <span>{action.label}</span>}
            </button>
          )

          if (!action.isAvailable && action.disabledReason) {
            return (
              <ChimmyDisabledActionTooltip key={action.id} reason={action.disabledReason}>
                {btn}
              </ChimmyDisabledActionTooltip>
            )
          }

          return btn
        })}
      </div>

      {pendingConfirm && (
        <ChimmyActionConfirmModal
          action={pendingConfirm}
          onConfirm={(a) => { setPendingConfirm(null); run(a) }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </>
  )
}
