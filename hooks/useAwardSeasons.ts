"use client"

import { useEffect, useCallback, useState } from "react"

export function useAwardSeasons(leagueId: string) {
  const [seasons, setSeasons] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/awards/seasons`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load seasons")
        setSeasons([])
        return
      }
      setSeasons(data?.seasons ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setSeasons([])
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { seasons, loading, error, refresh }
}
