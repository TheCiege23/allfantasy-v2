"use client"

import { useEffect, useCallback, useState } from "react"

export interface AwardRow {
  awardId: string
  leagueId: string
  sport: string
  season: string
  awardType: string
  awardLabel: string
  managerId: string
  score: number
  createdAt: string
}

export function useAwards(args: {
  leagueId: string
  season?: string | null
  awardType?: string | null
}) {
  const { leagueId, season, awardType } = args
  const [awards, setAwards] = useState<AwardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (season) params.set("season", season)
      if (awardType) params.set("awardType", awardType)
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/awards?${params}`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load awards")
        setAwards([])
        return
      }
      const list = (data?.awards ?? []).map((a: AwardRow & { createdAt?: Date }) => ({
        ...a,
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : "",
      }))
      setAwards(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setAwards([])
    } finally {
      setLoading(false)
    }
  }, [leagueId, season, awardType])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { awards, loading, error, refresh }
}
