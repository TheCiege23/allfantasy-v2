'use client'

import { AlertTriangle, X } from 'lucide-react'
import type { AIAction } from '@/lib/chimmy-actions'
import { ChimmyWorkflowPreviewCard } from './ChimmyWorkflowPreviewCard'

interface ChimmyActionConfirmModalProps {
  action: AIAction
  onConfirm: (action: AIAction) => void
  onCancel: () => void
}

/**
 * Confirmation modal shown before executing a 'confirmed' or destructive AI action.
 * Displays a ChimmyWorkflowPreviewCard summarising exactly what will happen.
 */
export function ChimmyActionConfirmModal({
  action,
  onConfirm,
  onCancel,
}: ChimmyActionConfirmModalProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 sm:items-center sm:p-6 sm:pb-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      {/* Panel */}
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-2">
            {action.isDestructive && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />
            )}
            <h2
              id="confirm-modal-title"
              className="text-sm font-semibold text-white"
            >
              {action.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-white/40 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Description */}
        <p className="px-5 pt-2 text-xs text-white/60">{action.description}</p>

        {/* Workflow Preview */}
        <div className="px-5 pt-3">
          <ChimmyWorkflowPreviewCard action={action} />
        </div>

        {/* Destructive warning */}
        {action.isDestructive && (
          <div className="mx-5 mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
            <p className="text-xs text-yellow-300">
              This action cannot be undone. Please review before confirming.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-5 py-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(action)}
            className={[
              'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-95',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
              action.isDestructive
                ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500',
            ].join(' ')}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
