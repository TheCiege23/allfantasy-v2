"use client"

import { useCallback, useEffect, useState } from "react"
import { FOCUS_REFETCH_THROTTLE_MS } from "@/lib/state-consistency/refresh-triggers"
import { POST_PURCHASE_SYNC_EVENT } from "@/lib/state-consistency/post-purchase-sync-events"
import { addStateRefreshListener } from "@/lib/state-consistency/state-events"
import type { EntitlementSnapshot } from "@/lib/subscription/EntitlementResolver"
import {
  expandPlansWithBundle,
  hasFeatureAccessForPlans,
  isActiveOrGraceStatus,
} from "@/lib/subscription/feature-access"
import type { SubscriptionFeatureId, SubscriptionPlanId } from "@/lib/subscription/types"

type EntitlementsApiResponse = {
  entitlement?: EntitlementSnapshot
}

export type EntitlementsState = {
  loading: boolean
  snapshot: EntitlementSnapshot | null
  error: string | null
  hasCommissioner: boolean
  hasPro: boolean
  hasWarRoom: boolean
  hasAllAccess: boolean
  hasAnyPaid: boolean
}

const INITIAL_STATE: EntitlementsState = {
  loading: true,
  snapshot: null,
  error: null,
  hasCommissioner: false,
  hasPro: false,
  hasWarRoom: false,
  hasAllAccess: false,
  hasAnyPaid: false,
}

function computeFlags(snap: EntitlementSnapshot): Omit<EntitlementsState, "loading" | "error"> {
  const plans = snap.plans ?? []
  const isActive = isActiveOrGraceStatus(snap.status)
  const expanded = expandPlansWithBundle(plans as SubscriptionPlanId[])
  return {
    snapshot: snap,
    hasCommissioner:
      isActive && (expanded.includes("commissioner") || expanded.includes("all_access")),
    hasPro: isActive && (expanded.includes("pro") || expanded.includes("all_access")),
    hasWarRoom:
      isActive && (expanded.includes("war_room") || expanded.includes("all_access")),
    hasAllAccess: isActive && plans.includes("all_access"),
    hasAnyPaid: isActive && plans.length > 0,
  }
}

export function useEntitlements() {
  const [state, setState] = useState<EntitlementsState>(INITIAL_STATE)

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch("/api/subscription/entitlements", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load entitlements")
      const data = (await res.json()) as EntitlementsApiResponse
      const snap = data.entitlement
      if (!snap) {
        setState({
          ...INITIAL_STATE,
          loading: false,
          error: null,
        })
        return
      }
      setState({
        ...computeFlags(snap),
        loading: false,
        error: null,
      })
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onPostPurchaseSync = () => {
      void refresh()
    }
    window.addEventListener(POST_PURCHASE_SYNC_EVENT, onPostPurchaseSync as EventListener)
    return () =>
      window.removeEventListener(POST_PURCHASE_SYNC_EVENT, onPostPurchaseSync as EventListener)
  }, [refresh])

  useEffect(
    () => addStateRefreshListener(["subscriptions", "auth", "all"], () => void refresh()),
    [refresh]
  )

  useEffect(() => {
    let last = 0
    const onForeground = () => {
      const now = Date.now()
      if (now - last < FOCUS_REFETCH_THROTTLE_MS) return
      last = now
      void refresh()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      onForeground()
    }
    window.addEventListener("focus", onForeground)
    window.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("focus", onForeground)
      window.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [refresh])

  const canUse = useCallback(
    (featureId: SubscriptionFeatureId): boolean => {
      const snap = state.snapshot
      if (!snap) return false
      return hasFeatureAccessForPlans(
        snap.plans as SubscriptionPlanId[],
        snap.status,
        featureId
      )
    },
    [state.snapshot]
  )

  return { ...state, refresh, canUse }
}
