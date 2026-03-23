"use client"

import { useEffect, useCallback, useState } from "react"

export interface XPEventRow {
  eventId: string
  managerId: string
  eventType: string
  xpValue: number
  sport: string
  createdAt: string
}

export function useXPEvents(
  managerId: string | null,
  options?: { sport?: string; eventType?: string; limit?: number }
) {
  const { sport, eventType, limit = 100 } = options ?? {}
  const [events, setEvents] = useState<XPEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!managerId) {
      setEvents([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ managerId })
      if (sport) params.set("sport", sport)
      if (eventType) params.set("eventType", eventType)
      params.set("limit", String(limit))
      const res = await fetch(`/api/xp/events?${params}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load XP events")
        setEvents([])
        return
      }
      const list = (data?.events ?? []).map((e: { createdAt?: string; [k: string]: unknown }) => ({
        ...e,
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : "",
      }))
      setEvents(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [managerId, sport, eventType, limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { events, loading, error, refresh }
}
