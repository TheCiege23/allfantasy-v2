'use client'

/**
 * PROMPT 252 — Frontend hook for subscription entitlement. Enforce gating on client.
 * PROMPT 273 — Refetch on window focus (throttled) so subscription state stays in sync when user returns from another tab (e.g. after purchase elsewhere).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { FOCUS_REFETCH_THROTTLE_MS } from '@/lib/state-consistency/refresh-triggers'
import type { SubscriptionFeatureId } from '@/lib/subscription/types'

export interface EntitlementState {
  plans: string[]
  status: 'active' | 'grace' | 'past_due' | 'expired' | 'none'
  currentPeriodEnd: string | null
  gracePeriodEnd: string | null
  message: string
}

export interface UseEntitlementResult {
  entitlement: EntitlementState | null
  loading: boolean
  hasAccess: (featureId: SubscriptionFeatureId) => boolean
  isActiveOrGrace: boolean
  refetch: () => Promise<void>
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

  const hasAccess = useCallback(
    (fid: SubscriptionFeatureId): boolean => {
      if (fid === featureId && hasFeatureAccess !== undefined) return hasFeatureAccess
      if (!entitlement || !isActiveOrGrace) return false
      const pro = ['trade_analyzer', 'ai_chat', 'ai_waivers', 'planning_tools', 'player_ai_recommendations', 'matchup_explanations', 'player_comparison_explanations', 'guillotine_ai', 'salary_cap_ai', 'survivor_ai', 'zombie_ai']
      const comm = ['advanced_scoring', 'advanced_playoff_setup', 'ai_collusion_detection', 'ai_tanking_detection', 'storyline_creation', 'league_rankings', 'draft_rankings', 'ai_team_managers', 'commissioner_automation']
      const war = ['draft_strategy_build', 'draft_prep', 'future_planning', 'multi_year_strategy', 'draft_board_intelligence', 'roster_construction_planning', 'ai_planning_3_5_year']
      const plans = entitlement.plans
      if (pro.includes(fid)) return plans.includes('pro') || plans.includes('all_access')
      if (comm.includes(fid)) return plans.includes('commissioner') || plans.includes('all_access')
      if (war.includes(fid)) return plans.includes('war_room') || plans.includes('all_access')
      return false
    },
    [entitlement, featureId, hasFeatureAccess, isActiveOrGrace]
  )

  return { entitlement, loading, hasAccess, isActiveOrGrace, refetch: fetchEntitlement }
}
