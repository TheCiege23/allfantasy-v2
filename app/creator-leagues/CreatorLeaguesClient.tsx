"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Trophy } from "lucide-react"
import { CreatorLeagueDiscoveryCard } from "@/components/discovery/CreatorLeagueDiscoveryCard"
import { getDiscoverySports } from "@/lib/public-discovery"
import type { DiscoveryCard } from "@/lib/public-discovery/types"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAB: "NCAA Basketball",
  NCAAF: "NCAA Football",
  SOCCER: "Soccer",
}

export function CreatorLeaguesClient() {
  const [sport, setSport] = useState("")
  const [leagues, setLeagues] = useState<DiscoveryCard[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchLeagues = useCallback(
    (p: number) => {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("format", "creator")
      if (sport) params.set("sport", sport)
      params.set("page", String(p))
      params.set("limit", "12")
      fetch(`/api/discover/leagues?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setLeagues(d.leagues ?? [])
          setTotal(d.total ?? 0)
          setTotalPages(d.totalPages ?? 1)
        })
        .catch(() => {
          setLeagues([])
          setTotal(0)
          setTotalPages(0)
        })
        .finally(() => setLoading(false))
    },
    [sport]
  )

  useEffect(() => {
    fetchLeagues(page)
  }, [page, fetchLeagues])

  const sports = getDiscoverySports().map((s) => ({
    value: s.value,
    label: SPORT_LABELS[s.value] ?? s.label,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          Sport:
        </span>
        <button
          type="button"
          onClick={() => {
            setSport("")
            setPage(1)
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!sport ? "opacity-100" : "opacity-60"}`}
          style={{
            background: !sport ? "var(--accent)" : "var(--panel)",
            color: !sport ? "var(--bg)" : "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          All
        </button>
        {sports.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => {
              setSport(s.value)
              setPage(1)
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sport === s.value ? "opacity-100" : "opacity-60"}`}
            style={{
              background: sport === s.value ? "var(--accent)" : "var(--panel)",
              color: sport === s.value ? "var(--bg)" : "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      ) : leagues.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <p className="font-medium" style={{ color: "var(--text)" }}>
            No creator leagues yet
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Leagues from verified creators and influencers will appear here.
          </p>
          <Link href="/creators" className="text-sm font-medium mt-3 inline-block" style={{ color: "var(--accent)" }}>
            Browse creators →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {total} league{total !== 1 ? "s" : ""}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <li key={`${league.source}-${league.id}`}>
                <CreatorLeagueDiscoveryCard league={league} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-2 mt-8" aria-label="Pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm" style={{ color: "var(--muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
