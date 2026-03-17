'use client'

/**
 * PROMPT 258 — Locked feature card: explains why locked and offers upgrade + optional token CTA.
 */

import Link from 'next/link'
import { Lock } from 'lucide-react'

export interface LockedFeatureCardProps {
  featureName: string
  requiredPlan: string
  /** Optional: token cost for single-use fallback; when set, show "Or use N tokens" link */
  tokenCost?: number
  onUpgradeClick?: () => void
  /** PROMPT 267: optional callback when token link is clicked (analytics) */
  onTokenClick?: () => void
  className?: string
}

export function LockedFeatureCard({
  featureName,
  requiredPlan,
  tokenCost,
  onUpgradeClick,
  onTokenClick,
  className = '',
}: LockedFeatureCardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-5 ${className}`}
      role="region"
      aria-label={`${featureName} is locked`}
    >
      <div className="flex items-center gap-3 text-cyan-400">
        <Lock className="h-8 w-8 shrink-0" />
        <h3 className="text-lg font-semibold text-white">{featureName} is locked</h3>
      </div>
      <p className="mt-2 text-sm text-white/70">
        This feature requires {requiredPlan}. Subscribe to unlock it, or use tokens for a one-time use.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {onUpgradeClick ? (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-500"
          >
            <Lock className="h-4 w-4" />
            Unlock with {requiredPlan}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-500"
          >
            <Lock className="h-4 w-4" />
            View plans
          </Link>
        )}
        {tokenCost != null && tokenCost > 0 && (
          <Link
            href="/tokens"
            onClick={onTokenClick}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-300 hover:bg-amber-500/20"
          >
            Or use {tokenCost} token{tokenCost !== 1 ? 's' : ''} for one-time use
          </Link>
        )}
      </div>
    </div>
  )
}
