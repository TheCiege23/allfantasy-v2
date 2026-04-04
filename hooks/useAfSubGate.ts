'use client'

import { useCallback, useMemo } from 'react'
import { useSubscriptionGateOptional } from '@/hooks/useSubscriptionGate'
import { getUpgradeUrl } from '@/lib/monetization/entitlements'
import type { SubscriptionFeatureId } from '@/lib/subscription/types'

export function useAfSubGate(defaultFeatureId: SubscriptionFeatureId) {
  const ctx = useSubscriptionGateOptional()

  const handleApiResponse = useCallback(
    async (response: Response, featureIdOverride?: SubscriptionFeatureId): Promise<boolean> => {
      const fid = featureIdOverride ?? defaultFeatureId

      if (response.status === 402) {
        if (ctx) {
          ctx.gate(fid)
        } else if (typeof window !== 'undefined') {
          window.location.assign(getUpgradeUrl(fid))
        }
        return false
      }

      if (response.status === 403) {
        try {
          const payload = (await response.clone().json()) as {
            code?: string
            upgradePath?: string
          }
          if (payload.code === 'feature_not_entitled') {
            if (ctx) {
              ctx.gate(fid)
            } else if (typeof window !== 'undefined') {
              const path =
                typeof payload.upgradePath === 'string' && payload.upgradePath.startsWith('/')
                  ? payload.upgradePath
                  : getUpgradeUrl(fid)
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
    [ctx, defaultFeatureId]
  )

  return useMemo(
    () => ({
      handleApiResponse,
      gate: ctx?.gate ?? ((k: SubscriptionFeatureId) => window.location.assign(getUpgradeUrl(k))),
      close: ctx?.close ?? (() => {}),
      state:
        ctx?.state ?? {
          isOpen: false,
          featureId: null,
          featureLabel: undefined,
          highlightFeature: undefined,
        },
    }),
    [ctx, handleApiResponse]
  )
}
