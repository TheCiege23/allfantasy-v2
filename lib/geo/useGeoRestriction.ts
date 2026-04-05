"use client"

import { useCallback, useEffect, useState } from "react"

import type { RestrictionLevel } from "@/lib/geo/restrictedStates"

export type GeoRestrictionHookState = {
  loading: boolean
  stateCode: string | null
  stateName: string | null
  country: string | null
  isVpnOrProxy: boolean
  restrictionLevel: RestrictionLevel | null
  isPaidBlocked: boolean
  isFullyBlocked: boolean
  error: string | null
  refresh: () => void
}

export function useGeoRestriction(): GeoRestrictionHookState {
  const [loading, setLoading] = useState(true)
  const [stateCode, setStateCode] = useState<string | null>(null)
  const [stateName, setStateName] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [isVpnOrProxy, setIsVpnOrProxy] = useState(false)
  const [restrictionLevel, setRestrictionLevel] = useState<RestrictionLevel | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    void fetch("/api/geo/check", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Geo check failed")
        return res.json() as Promise<{
          stateCode: string | null
          stateName: string | null
          country: string | null
          isVpnOrProxy: boolean
          restrictionLevel: RestrictionLevel | null
        }>
      })
      .then((data) => {
        setStateCode(data.stateCode)
        setStateName(data.stateName)
        setCountry(data.country)
        setIsVpnOrProxy(Boolean(data.isVpnOrProxy))
        setRestrictionLevel(data.restrictionLevel)
      })
      .catch(() => {
        setError("unavailable")
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    loading,
    stateCode,
    stateName,
    country,
    isVpnOrProxy,
    restrictionLevel,
    isPaidBlocked: restrictionLevel === "paid_block",
    isFullyBlocked: restrictionLevel === "full_block",
    error,
    refresh: load,
  }
}
