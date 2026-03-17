"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { LeagueDiscoveryCard } from "./LeagueDiscoveryCard"
import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface RecommendedLeaguesSectionProps {
  sport?: string | null
  limit?: number
}

export function RecommendedLeaguesSection({ sport = null, limit = 6 }: RecommendedLeaguesSectionProps) {
  const [leagues, setLeagues] = useState<DiscoveryCard[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecommended = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (sport) params.set("sport", sport)
    params.set("limit", String(limit))
    fetch(`/api/discover/recommended?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.leagues)) setLeagues(d.leagues)
        else setLeagues([])
      })
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false))
  }, [sport, limit])

  useEffect(() => {
    fetchRecommended()
  }, [fetchRecommended])

  if (loading) {
    return (
      <section className="rounded-xl border p-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Sparkles className="h-5 w-5" style={{ color: "var(--muted)" }} />
          Recommended for you
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      </section>
    )
  }

  if (leagues.length === 0) return null

  return (
    <section className="rounded-xl border p-6" style={{ borderColor: "var(--border)" }}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Sparkles className="h-5 w-5" style={{ color: "var(--muted)" }} />
        Recommended for you
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Leagues filling up — join before they’re full.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => (
          <LeagueDiscoveryCard key={`${league.source}-${league.id}`} league={league} />
        ))}
      </div>
    </section>
  )
}
