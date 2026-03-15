"use client"

import { useEffect, useCallback, useState } from "react"

export interface ManagerFranchiseProfileRow {
  profileId: string
  managerId: string
  totalCareerSeasons: number
  totalLeaguesPlayed: number
  championshipCount: number
  playoffAppearances: number
  careerWinPercentage: number
  gmPrestigeScore: number
  franchiseValue: number
  updatedAt: string
  tierLabel?: string
  tierBadgeColor?: string
}

export function useGMLeaderboard(args: {
  orderBy?: "franchiseValue" | "gmPrestigeScore"
  limit?: number
}) {
  const { orderBy = "franchiseValue", limit = 50 } = args
  const [profiles, setProfiles] = useState<ManagerFranchiseProfileRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("orderBy", orderBy)
      params.set("limit", String(limit))
      const res = await fetch(`/api/gm-economy/leaderboard?${params}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load")
        setProfiles([])
        setTotal(0)
        return
      }
      setProfiles(data?.profiles ?? [])
      setTotal(data?.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setProfiles([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [orderBy, limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profiles, total, loading, error, refresh }
}
