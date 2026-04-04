'use client'

import { getEntitlement } from '@/lib/monetization/entitlements'
import type { FeatureKey } from '@/lib/monetization/entitlements'

const PLAN_SHORT_LABELS: Record<string, string> = {
  af_commissioner: 'Commissioner',
  af_pro: 'AF Pro',
  af_war_room: 'War Room',
  af_all_access: 'All-Access',
}

export function SubscriptionGateBadge({
  featureKey,
  onClick,
  size = 'xs',
}: {
  featureKey: FeatureKey
  onClick?: () => void
  size?: 'xs' | 'sm'
}) {
  const def = getEntitlement(featureKey)
  const planLabel = PLAN_SHORT_LABELS[def.requiredPlan[0] ?? ''] ?? 'Subscription'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${def.label} requires ${planLabel}`}
      className={[
        'inline-flex items-center gap-1 rounded-full border border-amber-500/25',
        'bg-amber-500/10 font-semibold text-amber-300/80',
        'transition hover:border-amber-400/40 hover:text-amber-200',
        'focus:outline-none focus:ring-1 focus:ring-amber-400/30',
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      ].join(' ')}
    >
      🔒 {planLabel}
    </button>
  )
}
