"use client"

import { useEffect, useCallback, useState } from "react"
import { apiGet } from "@/lib/api"

export interface LegacyScoreRecordRow {
  id: string
  entityType: string
  entityId: string
  sport: string
  leagueId: string | null
  overallLegacyScore: number
  championshipScore: number
  playoffScore: number
  consistencyScore: number
  rivalryScore: number
  awardsScore: number
  dynastyScore: number
  updatedAt: string
}

type LeaderboardResponse = {
  leagueId: string
  records: LegacyScoreRecordRow[]
  total: number
}

export function useLegacyScoreLeaderboard(args: {
  leagueId: string
  sport?: string | null
  entityType?: string | null
}) {
  const { leagueId, sport, entityType } = args
  const [records, setRecords] = useState<LegacyScoreRecordRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const ep = new URLSearchParams()
      if (sport) ep.set("sport", sport)
      if (entityType) ep.set("entityType", entityType)
      ep.set("limit", "50")
      const data = await apiGet<LeaderboardResponse>(
        `/api/leagues/${encodeURIComponent(leagueId)}/legacy-score?${ep}`
      )
      setRecords(data?.records ?? [])
      setTotal(data?.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load legacy leaderboard")
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [leagueId, sport, entityType])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { records, total, loading, error, refresh }
}
