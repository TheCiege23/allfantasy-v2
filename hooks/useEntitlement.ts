'use client'

/**
 * PROMPT 252 — Frontend hook for subscription entitlement. Enforce gating on client.
 * PROMPT 273 — Refetch on window focus (throttled) so subscription state stays in sync when user returns from another tab (e.g. after purchase elsewhere).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { FOCUS_REFETCH_THROTTLE_MS } from '@/lib/state-consistency/refresh-triggers'
import type { SubscriptionFeatureId, SubscriptionPlanId } from '@/lib/subscription/types'
import {
  buildFeatureUpgradePath,
  hasFeatureAccessForPlans,
} from '@/lib/subscription/feature-access'

export interface EntitlementState {
  plans: string[]
  status: 'active' | 'grace' | 'past_due' | 'expired' | 'none'
  currentPeriodEnd: string | null
  gracePeriodEnd: string | null
  message: string
  requiredPlan?: string | null
  upgradePath?: string
}

export interface UseEntitlementResult {
  entitlement: EntitlementState | null
  loading: boolean
  featureAccess: boolean
  hasAccess: (featureId: SubscriptionFeatureId) => boolean
  isActiveOrGrace: boolean
  upgradePath: string
  refetch: () => Promise<void>
}

const ALLOWED_PLAN_IDS = new Set<SubscriptionPlanId>(['pro', 'commissioner', 'war_room', 'all_access'])

function toPlanIds(plans: string[] | undefined): SubscriptionPlanId[] {
  return (plans ?? []).filter((plan): plan is SubscriptionPlanId =>
    ALLOWED_PLAN_IDS.has(plan as SubscriptionPlanId)
  )
}

export function useEntitlement(featureId?: SubscriptionFeatureId): UseEntitlementResult {
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null)
  const [hasFeatureAccess, setHasFeatureAccess] = useState<boolean | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const lastFocusRefetch = useRef(0)

  const fetchEntitlement = useCallback(async () => {
    setLoading(true)
    try {
      const url = featureId
        ? `/api/subscription/entitlements?feature=${encodeURIComponent(featureId)}`
        : '/api/subscription/entitlements'
      const res = await fetch(url)
      if (!res.ok) {
        setEntitlement(null)
        setHasFeatureAccess(false)
        return
      }
      const data = await res.json()
      if (data.entitlement) {
        setEntitlement({
          plans: data.entitlement.plans ?? [],
          status: data.entitlement.status ?? 'none',
          currentPeriodEnd: data.entitlement.currentPeriodEnd ?? null,
          gracePeriodEnd: data.entitlement.gracePeriodEnd ?? null,
          message: data.message ?? 'Upgrade to access this feature.',
          requiredPlan: data.requiredPlan ?? null,
          upgradePath:
            data.upgradePath ??
            (featureId ? buildFeatureUpgradePath(featureId) : '/pricing'),
        })
      } else {
        setEntitlement(null)
      }
      setHasFeatureAccess(data.hasAccess)
    } catch {
      setEntitlement(null)
      setHasFeatureAccess(false)
    } finally {
      setLoading(false)
    }
  }, [featureId])

  useEffect(() => {
    fetchEntitlement()
  }, [fetchEntitlement])

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusRefetch.current < FOCUS_REFETCH_THROTTLE_MS) return
      lastFocusRefetch.current = now
      void fetchEntitlement()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchEntitlement])

  const isActiveOrGrace = entitlement?.status === 'active' || entitlement?.status === 'grace'
  const featureAccess =
    hasFeatureAccess ??
    (featureId && entitlement
      ? hasFeatureAccessForPlans(
          toPlanIds(entitlement.plans),
          entitlement.status,
          featureId
        )
      : false)
  const upgradePath =
    entitlement?.upgradePath ??
    (featureId ? buildFeatureUpgradePath(featureId) : '/pricing')

  const hasAccess = useCallback(
    (fid: SubscriptionFeatureId): boolean => {
      if (fid === featureId && hasFeatureAccess !== undefined) return hasFeatureAccess
      if (!entitlement) return false
      return hasFeatureAccessForPlans(
        toPlanIds(entitlement.plans),
        entitlement.status,
        fid
      )
    },
    [entitlement, featureId, hasFeatureAccess]
  )

  return {
    entitlement,
    loading,
    featureAccess,
    hasAccess,
    isActiveOrGrace,
    upgradePath,
    refetch: fetchEntitlement,
  }
}
