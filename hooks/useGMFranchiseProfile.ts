"use client"

import { useEffect, useCallback, useState } from "react"

export interface ManagerFranchiseProfileView {
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

export function useGMFranchiseProfile(managerId: string | null) {
  const [profile, setProfile] = useState<ManagerFranchiseProfileView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!managerId) {
      setProfile(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/gm-economy/profile?managerId=${encodeURIComponent(managerId)}`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load")
        setProfile(null)
        return
      }
      setProfile(data?.profile ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [managerId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profile, loading, error, refresh }
}
