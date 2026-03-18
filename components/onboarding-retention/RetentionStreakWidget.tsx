"use client"

import { useState, useEffect, useRef } from "react"
import { Flame } from "lucide-react"

interface StreakData {
  currentStreak: number
  longestStreak: number
  activeDaysCount: number
  todayActive: boolean
}

export interface RetentionStreakWidgetProps {
  className?: string
}

/**
 * Shows engagement streak (consecutive days with app activity). Non-gambling; encourages daily use.
 * Records app_open on mount once per session so viewing the app counts as activity.
 */
export function RetentionStreakWidget({ className = "" }: RetentionStreakWidgetProps) {
  const [data, setData] = useState<StreakData | null>(null)
  const recordedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/retention/streak", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.currentStreak !== undefined) setData(d)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (recordedRef.current) return
    recordedRef.current = true
    fetch("/api/engagement/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "app_open" }),
    })
      .then((r) => {
        if (r.ok) {
          fetch("/api/retention/streak", { cache: "no-store" })
            .then((res) => res.json())
            .then((d) => setData(d))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  if (!data) return null
  if (data.currentStreak === 0 && data.longestStreak === 0) return null

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 ${className}`}
    >
      <Flame className="h-5 w-5 text-amber-400 shrink-0" />
      <div>
        <span className="text-sm font-medium text-amber-200">
          {data.currentStreak} day streak
        </span>
        {data.longestStreak > data.currentStreak && (
          <span className="ml-1.5 text-xs text-white/50">
            (best: {data.longestStreak})
          </span>
        )}
      </div>
    </div>
  )
}
