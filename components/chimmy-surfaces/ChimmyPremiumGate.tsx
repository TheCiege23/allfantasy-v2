'use client'

import React from 'react'
import { useAISurface } from './AISurfaceContext'
import ChimmyUpgradeLockCard from './ChimmyUpgradeLockCard'

export interface ChimmyPremiumGateProps {
  /** Which tier is required */
  requiredTier?: 'premium' | 'commissioner' | 'admin'
  featureLabel: string
  featureDescription?: string
  ctaLabel?: string
  onUpgrade?: () => void
  children: React.ReactNode
}

/**
 * ChimmyPremiumGate — renders children only when the subscription state
 * satisfies the required tier. Otherwise renders the upgrade lock card.
 */
export default function ChimmyPremiumGate({
  requiredTier = 'premium',
  featureLabel,
  featureDescription,
  ctaLabel,
  onUpgrade,
  children,
}: ChimmyPremiumGateProps) {
  const { subscriptionState } = useAISurface()

  const allowed =
    requiredTier === 'admin'       ? subscriptionState.hasAdmin :
    requiredTier === 'commissioner'? subscriptionState.hasCommissioner :
    subscriptionState.hasPremium

  if (allowed) return <>{children}</>

  return (
    <ChimmyUpgradeLockCard
      featureLabel={featureLabel}
      description={featureDescription}
      requiredTier={requiredTier === 'commissioner' ? 'Commissioner' : requiredTier === 'admin' ? 'Admin' : 'Pro'}
      ctaLabel={ctaLabel}
      onUpgrade={onUpgrade}
    />
  )
}
