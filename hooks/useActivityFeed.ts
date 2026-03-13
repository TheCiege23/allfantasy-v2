"use client"

import { useCallback, useEffect, useState } from "react"
import type { ActivityFeedItem } from "@/lib/activity/placeholder"
import { mergeWithPlaceholderActivity } from "@/lib/activity/placeholder"

export function useActivityFeed(options?: { limit?: number; leagueId?: string }) {
  const limit = options?.limit ?? 50
  const leagueId = options?.leagueId ?? undefined
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit) })
      if (leagueId) params.set("leagueId", leagueId)
      const res = await fetch(`/api/shared/activity?${params}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      const raw = Array.isArray(json?.items) ? json.items : []
      setItems(mergeWithPlaceholderActivity(raw))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity")
      setItems(mergeWithPlaceholderActivity([]))
    } finally {
      setLoading(false)
    }
  }, [limit, leagueId])

  useEffect(() => {
    load()
    const timer = setInterval(load, 90_000)
    return () => clearInterval(timer)
  }, [load])

  return { items, loading, error, refresh: load }
}
