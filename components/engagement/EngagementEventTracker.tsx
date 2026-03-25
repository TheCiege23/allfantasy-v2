"use client"

import { useEffect, useRef } from "react"
import type { EngagementEventType, EngagementEventMeta } from "@/lib/engagement-engine"

interface EngagementEventTrackerProps {
  eventType: EngagementEventType
  meta?: EngagementEventMeta
  enabled?: boolean
  oncePerDayKey?: string
}

function getDateKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`
}

export default function EngagementEventTracker({
  eventType,
  meta,
  enabled = true,
  oncePerDayKey,
}: EngagementEventTrackerProps) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!enabled || firedRef.current) return

    let dedupeStorageKey: string | null = null
    if (oncePerDayKey && typeof window !== "undefined") {
      const today = getDateKey(new Date())
      dedupeStorageKey = `af:engagement:${oncePerDayKey}:${today}`
      if (window.localStorage.getItem(dedupeStorageKey) === "1") {
        firedRef.current = true
        return
      }
    }

    firedRef.current = true

    void fetch("/api/engagement/activity", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, meta }),
    })
      .then((response) => {
        if (!response.ok || !dedupeStorageKey || typeof window === "undefined") return
        window.localStorage.setItem(dedupeStorageKey, "1")
      })
      .catch(() => {})
  }, [enabled, eventType, meta, oncePerDayKey])

  return null
}
