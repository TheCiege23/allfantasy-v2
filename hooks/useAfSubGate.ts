'use client'

import { useCallback, useMemo } from 'react'
import { useSubscriptionGateOptional } from '@/hooks/useSubscriptionGate'
import { getUpgradeUrl, type FeatureKey } from '@/lib/monetization/entitlements'

export function useAfSubGate(defaultFeatureKey: FeatureKey) {
  const ctx = useSubscriptionGateOptional()

  const handleApiResponse = useCallback(
    async (response: Response, featureKeyOverride?: FeatureKey): Promise<boolean> => {
      const key = featureKeyOverride ?? defaultFeatureKey

      if (response.status === 402) {
        if (ctx) {
          ctx.gate(key)
        } else if (typeof window !== 'undefined') {
          window.location.assign(getUpgradeUrl(key))
        }
        return false
      }

      // FeatureGateService — premium features return 403 + feature_not_entitled (see lib/subscription/FeatureGateService)
      if (response.status === 403) {
        try {
          const payload = (await response.clone().json()) as {
            code?: string
            upgradePath?: string
          }
          if (payload.code === 'feature_not_entitled') {
            if (ctx) {
              ctx.gate(key)
            } else if (typeof window !== 'undefined') {
              const path =
                typeof payload.upgradePath === 'string' && payload.upgradePath.startsWith('/')
                  ? payload.upgradePath
                  : getUpgradeUrl(key)
              window.location.assign(path)
            }
            return false
          }
        } catch {
          /* not JSON or unknown shape — let caller handle */
        }
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
