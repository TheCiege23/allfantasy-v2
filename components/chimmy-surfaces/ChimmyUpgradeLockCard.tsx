'use client'

import React from 'react'
import { Lock, Sparkles } from 'lucide-react'

export interface ChimmyUpgradeLockCardProps {
  featureLabel: string
  description?: string
  ctaLabel?: string
  onUpgrade?: () => void
  /** Required tier label for display */
  requiredTier?: string
  className?: string
}

export default function ChimmyUpgradeLockCard({
  featureLabel,
  description,
  ctaLabel = 'Upgrade to unlock',
  onUpgrade,
  requiredTier = 'Pro',
  className = '',
}: ChimmyUpgradeLockCardProps) {
  return (
    <div className={`rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-center ${className}`}>
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Lock className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">{requiredTier} Feature</span>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Sparkles className="h-4 w-4 text-indigo-300" />
        <p className="text-sm font-semibold text-white">{featureLabel}</p>
      </div>

      {description && (
        <p className="text-sm text-white/50 leading-relaxed mb-3">{description}</p>
      )}

      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
