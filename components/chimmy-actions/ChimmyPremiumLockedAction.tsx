'use client'

import { Lock, Sparkles } from 'lucide-react'
import type { AIAction } from '@/lib/chimmy-actions'

interface ChimmyPremiumLockedActionProps {
  action: AIAction
  /** The badge label, e.g. "AllFantasy Pro" or "Commissioner+" */
  badgeLabel?: string
  /** Called when the user clicks the upgrade CTA */
  onUpgrade?: () => void
}

/**
 * Renders a premium-locked AI action with an upgrade call-to-action.
 * Shown in place of the normal action button when the user lacks the required subscription.
 */
export function ChimmyPremiumLockedAction({
  action,
  badgeLabel = 'AllFantasy Pro',
  onUpgrade,
}: ChimmyPremiumLockedActionProps) {
  return (
    <div className="relative inline-flex items-stretch overflow-hidden rounded-lg border border-indigo-500/30 bg-indigo-900/20">
      {/* Dimmed action label */}
      <div className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white/30 select-none">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{action.label}</span>
      </div>

      {/* Upgrade overlay */}
      <button
        type="button"
        onClick={onUpgrade}
        className="flex items-center gap-1.5 border-l border-indigo-500/30 bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 active:scale-95"
        aria-label={`Upgrade to ${badgeLabel} to unlock ${action.label}`}
      >
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{badgeLabel}</span>
      </button>
    </div>
  )
}
