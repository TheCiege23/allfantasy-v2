'use client'

import { useCallback, type ReactNode } from 'react'
import { useSubscriptionGateOptional } from '@/hooks/useSubscriptionGate'
import { SubscriptionGateBadge } from '@/components/subscription/SubscriptionGateBadge'
import { SubscriptionGateModal } from '@/components/subscription/SubscriptionGateModal'
import { getUpgradeUrlForFeature } from '@/lib/subscription/featureGating'
import type { SubscriptionFeatureId } from '@/lib/subscription/types'

export type PremiumGateProps = {
  featureId: SubscriptionFeatureId
  hasAccess: boolean
  mode?: 'hide' | 'disable' | 'overlay' | 'replace'
  children: ReactNode
  upgradeCTA?: string
  onGated?: () => void
}

export function PremiumGate({
  featureId,
  hasAccess,
  mode = 'disable',
  children,
  upgradeCTA,
  onGated,
}: PremiumGateProps) {
  const ctx = useSubscriptionGateOptional()

  const handleLockedClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (ctx) {
        ctx.gate(featureId)
      } else if (typeof window !== 'undefined') {
        window.location.assign(getUpgradeUrlForFeature(featureId))
      }
      onGated?.()
    },
    [ctx, featureId, onGated]
  )

  if (hasAccess) {
    return <>{children}</>
  }

  if (mode === 'hide') {
    return null
  }

  if (mode === 'replace') {
    return (
      <>
        <div
          className="cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center transition hover:bg-white/[0.04]"
          onClick={handleLockedClick}
          onKeyDown={(e) => e.key === 'Enter' && handleLockedClick(e)}
          role="button"
          tabIndex={0}
          aria-label={`${upgradeCTA ?? 'Upgrade'} to access this feature`}
        >
          <div className="mb-2 text-2xl">🔒</div>
          <p className="text-sm font-semibold text-white/70">
            {upgradeCTA ?? 'Upgrade to unlock'}
          </p>
          <div className="mt-2 flex justify-center">
            <SubscriptionGateBadge featureId={featureId} />
          </div>
        </div>

        {ctx ? (
          <SubscriptionGateModal
            isOpen={ctx.state.isOpen}
            onClose={ctx.close}
            featureId={ctx.state.featureId ?? featureId}
          />
        ) : null}
      </>
    )
  }

  if (mode === 'overlay') {
    return (
      <>
        <div className="relative">
          <div className="pointer-events-none select-none opacity-30">{children}</div>
          <div
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl bg-black/20 backdrop-blur-[1px] transition hover:bg-black/30"
            onClick={handleLockedClick}
            onKeyDown={(e) => e.key === 'Enter' && handleLockedClick(e)}
            role="button"
            tabIndex={0}
            aria-label="This feature requires an upgrade"
          >
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-lg">🔒</span>
              <SubscriptionGateBadge featureId={featureId} />
            </div>
          </div>
        </div>

        {ctx ? (
          <SubscriptionGateModal
            isOpen={ctx.state.isOpen}
            onClose={ctx.close}
            featureId={ctx.state.featureId ?? featureId}
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      <div
        className="relative cursor-not-allowed select-none opacity-50"
        onClick={handleLockedClick}
        onKeyDown={(e) => e.key === 'Enter' && handleLockedClick(e)}
        role="button"
        tabIndex={0}
        aria-disabled="true"
        aria-label="This feature requires an upgrade"
      >
        <div className="pointer-events-none">{children}</div>
        <div className="absolute -right-1 -top-1">
          <SubscriptionGateBadge featureId={featureId} size="xs" />
        </div>
      </div>

      {ctx ? (
        <SubscriptionGateModal
          isOpen={ctx.state.isOpen}
          onClose={ctx.close}
          featureId={ctx.state.featureId ?? featureId}
        />
      ) : null}
    </>
  )
}
