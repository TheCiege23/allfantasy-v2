"use client"

import { useEffect, useCallback, useState } from "react"

export interface RecordBookRow {
  recordId: string
  sport: string
  leagueId: string
  recordType: string
  recordLabel: string
  holderId: string
  value: number
  season: string
  rank: number
  createdAt: string
}

export function useRecordBook(args: {
  leagueId: string
  recordType?: string | null
  season?: string | null
  sport?: string | null
}) {
  const { leagueId, recordType, season, sport } = args
  const [records, setRecords] = useState<RecordBookRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (recordType) params.set("recordType", recordType)
      if (season) params.set("season", season)
      if (sport) params.set("sport", sport)
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/record-book?${params}`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load record book")
        setRecords([])
        return
      }
      const list = (data?.records ?? []).map((r: RecordBookRow & { createdAt?: Date }) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      }))
      setRecords(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [leagueId, recordType, season, sport])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { records, loading, error, refresh }
}
