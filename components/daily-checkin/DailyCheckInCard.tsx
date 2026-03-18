"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageCircle, Flame, Check } from "lucide-react"

export interface DailyCheckInCardProps {
  className?: string
  /** If true, record daily_checkin on click before navigating (default true). */
  recordOnClick?: boolean
}

interface DailyCheckInState {
  daily: { label: string; prompt: string }
  chimmyHref: string
  completedToday: boolean
  currentStreak: number
  longestStreak: number
  activeDaysCount: number
}

/**
 * Daily engagement card: "Ask Chimmy" today's insight.
 * Fetches daily prompt and streak; CTA opens Chimmy with prompt pre-filled.
 */
export function DailyCheckInCard({
  className = "",
  recordOnClick = true,
}: DailyCheckInCardProps) {
  const [data, setData] = useState<DailyCheckInState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/daily-checkin", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.daily) setData(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleClick = async (e: React.MouseEvent) => {
    if (recordOnClick) {
      e.preventDefault()
      const href = data?.chimmyHref ?? "/af-legacy?tab=chat"
      try {
        await fetch("/api/daily-checkin", { method: "POST" })
        const res = await fetch("/api/daily-checkin", { cache: "no-store" })
        const updated = await res.json()
        if (updated.daily) setData(updated)
      } catch {
        // ignore
      }
      window.location.href = href
    }
  }

  if (loading || !data) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}
        style={{ minHeight: "120px" }}
      >
        <div className="animate-pulse flex flex-col gap-2">
          <div className="h-5 w-32 bg-white/10 rounded" />
          <div className="h-4 w-full bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-emerald-500/20 p-2">
          <MessageCircle className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
            {data.daily.label}
          </p>
          <p className="mt-0.5 text-sm text-white/90">
            Ask Chimmy: &ldquo;{data.daily.prompt.slice(0, 60)}
            {data.daily.prompt.length > 60 ? "…" : ""}&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={data.chimmyHref}
              onClick={handleClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              {data.completedToday ? (
                <>
                  <Check className="h-4 w-4" />
                  Ask again
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Ask Chimmy
                </>
              )}
            </Link>
            {data.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400/90">
                <Flame className="h-3.5 w-3.5" />
                {data.currentStreak} day streak
                {data.longestStreak > data.currentStreak && (
                  <span className="text-white/50">(best: {data.longestStreak})</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
