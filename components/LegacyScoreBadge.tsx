"use client"

import { useState, useEffect } from "react"

interface LegacyScoreData {
  overallLegacyScore: number
  entityType: string
  entityId: string
}

/**
 * Fetches and displays legacy score (0–100) for a manager/team in a league.
 */
export function LegacyScoreBadge({
  leagueId,
  entityType = "MANAGER",
  entityId,
  showScore = true,
  className = "",
}: {
  leagueId: string
  entityType?: string
  entityId: string
  showScore?: boolean
  className?: string
}) {
  const [data, setData] = useState<LegacyScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId || !entityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const url = `/api/leagues/${encodeURIComponent(leagueId)}/legacy-score?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.record) setData(res.record)
        else setData(null)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [leagueId, entityType, entityId])

  if (loading) {
    return (
      <span
        className={`inline-block h-4 w-12 animate-pulse rounded bg-amber-500/10 ${className}`}
        title="Loading legacy score…"
      />
    )
  }
  if (!data) return null

  const score = data.overallLegacyScore
  const tier =
    score >= 80 ? "elite" : score >= 60 ? "strong" : score >= 40 ? "solid" : "building"
  const colorClass =
    tier === "elite"
      ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
      : tier === "strong"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : tier === "solid"
          ? "border-white/20 bg-white/5 text-white/70"
          : "border-white/10 bg-white/5 text-white/50"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${colorClass} ${className}`}
      title={`Legacy score: ${score.toFixed(0)}/100`}
    >
      Legacy {showScore ? score.toFixed(0) : ""}
    </span>
  )
}
