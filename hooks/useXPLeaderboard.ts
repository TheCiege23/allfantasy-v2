"use client"

import { useEffect, useCallback, useState } from "react"

export interface XPLeaderboardRow {
  managerId: string
  totalXP: number
  currentTier: string
  rank: number
}

export function useXPLeaderboard(args: { tier?: string; limit?: number } = {}) {
  const { tier, limit = 50 } = args
  const [leaderboard, setLeaderboard] = useState<XPLeaderboardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tier) params.set("tier", tier)
      params.set("limit", String(limit))
      const res = await fetch(`/api/xp/leaderboard?${params}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load XP leaderboard")
        setLeaderboard([])
        return
      }
      setLeaderboard(data?.leaderboard ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }, [tier, limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { leaderboard, loading, error, refresh }
}
