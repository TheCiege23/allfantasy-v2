"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { LeagueDiscoveryCard } from "./LeagueDiscoveryCard"
import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface RecommendedLeaguesSectionProps {
  sport?: string | null
  limit?: number
}

interface RecommendationItem {
  league: DiscoveryCard
  explanation: string | null
}

export function RecommendedLeaguesSection({ sport = null, limit = 6 }: RecommendedLeaguesSectionProps) {
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [personalized, setPersonalized] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRecommended = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (sport) params.set("sport", sport)
    params.set("limit", String(limit))
    fetch(`/api/discover/recommendations?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.leagues)) {
          setItems(
            d.leagues.map((x: { league: DiscoveryCard; explanation?: string | null }) => ({
              league: x.league,
              explanation: x.explanation ?? null,
            }))
          )
          setPersonalized(!!d.personalized)
        } else {
          setItems([])
        }
      })
      .catch(() => setItems([]))
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

  if (items.length === 0) return null

  return (
    <section className="rounded-xl border p-6" style={{ borderColor: "var(--border)" }}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Sparkles className="h-5 w-5" style={{ color: "var(--muted)" }} />
        Recommended for you
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {personalized
          ? "Based on your favorite sports, past leagues, and league types."
          : "Leagues filling up — join before they're full."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ league, explanation }) => (
          <div key={`${league.source}-${league.id}`} className="flex flex-col gap-2">
            <LeagueDiscoveryCard league={league} />
            {explanation && (
              <p className="text-xs px-1" style={{ color: "var(--muted)" }}>
                {explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
