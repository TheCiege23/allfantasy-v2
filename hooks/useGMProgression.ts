"use client"

import { useCallback, useEffect, useState } from "react"

export interface GMProgressionEventRow {
  eventId: string
  managerId: string
  sport: string
  eventType: string
  valueChange: number
  sourceReference: string | null
  createdAt: string
}

export function useGMProgression(args: {
  managerId: string | null
  sport?: string | null
  eventType?: string | null
  limit?: number
}) {
  const { managerId, sport = null, eventType = null, limit = 50 } = args
  const [events, setEvents] = useState<GMProgressionEventRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!managerId) {
      setEvents([])
      setTotal(0)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("managerId", managerId)
      params.set("limit", String(limit))
      if (sport) params.set("sport", sport)
      if (eventType) params.set("eventType", eventType)

      const res = await fetch(`/api/gm-economy/progression?${params.toString()}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load progression timeline")
        setEvents([])
        setTotal(0)
        return
      }
      setEvents(Array.isArray(data?.events) ? data.events : [])
      setTotal(Number(data?.total ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progression timeline")
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [eventType, limit, managerId, sport])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { events, total, loading, error, refresh }
}
