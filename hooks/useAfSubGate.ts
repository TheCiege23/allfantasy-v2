'use client'

import { useCallback, useMemo } from 'react'
import { useSubscriptionGateOptional } from '@/hooks/useSubscriptionGate'
import { getUpgradeUrl, type FeatureKey } from '@/lib/monetization/entitlements'

export function useAfSubGate(defaultFeatureKey: FeatureKey) {
  const ctx = useSubscriptionGateOptional()

  const handleApiResponse = useCallback(
    async (response: Response): Promise<boolean> => {
      if (response.status === 402) {
        if (ctx) {
          ctx.gate(defaultFeatureKey)
        } else if (typeof window !== 'undefined') {
          window.location.assign(getUpgradeUrl(defaultFeatureKey))
        }
        return false
      }
      return true
    },
    [ctx, defaultFeatureKey]
  )

  return useMemo(
    () => ({
      handleApiResponse,
      gate: ctx?.gate ?? ((k: FeatureKey) => window.location.assign(getUpgradeUrl(k))),
      close: ctx?.close ?? (() => {}),
      state:
        ctx?.state ?? {
          isOpen: false,
          featureKey: null,
          featureLabel: undefined,
          highlightFeature: undefined,
        },
    }),
    [ctx, handleApiResponse]
  )
}
