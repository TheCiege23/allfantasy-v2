"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Inbox } from "lucide-react"
import { DiscoverySearchBar } from "./DiscoverySearchBar"
import { DiscoveryFilters } from "./DiscoveryFilters"
import { LeagueDiscoveryCard } from "./LeagueDiscoveryCard"
import { TrendingLeaguesSection } from "./TrendingLeaguesSection"
import { RecommendedLeaguesSection } from "./RecommendedLeaguesSection"
import { CreatorDiscoverySection } from "./CreatorDiscoverySection"
import type { DiscoveryCard, DiscoveryFormat, DiscoverySort, EntryFeeFilter } from "@/lib/public-discovery/types"

export interface PublicLeagueDiscoveryPageProps {
  defaultSport?: string
}

export function PublicLeagueDiscoveryPage({ defaultSport = "" }: PublicLeagueDiscoveryPageProps) {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [sport, setSport] = useState(defaultSport)
  const [format, setFormat] = useState<DiscoveryFormat>("all")
  const [sort, setSort] = useState<DiscoverySort>("popularity")
  const [entryFee, setEntryFee] = useState<EntryFeeFilter>("all")
  const [page, setPage] = useState(1)
  const [leagues, setLeagues] = useState<DiscoveryCard[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchLeagues = useCallback(
    (p: number) => {
      setLoading(true)
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (sport) params.set("sport", sport)
      params.set("format", format)
      params.set("sort", sort)
      params.set("entryFee", entryFee)
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
    [query, sport, format, sort, entryFee]
  )

  useEffect(() => {
    fetchLeagues(page)
  }, [page, fetchLeagues])

  useEffect(() => {
    if (defaultSport) setSport(defaultSport)
  }, [defaultSport])

  useEffect(() => {
    const s = searchParams?.get("sport") ?? ""
    const f = (searchParams?.get("format") as DiscoveryFormat) ?? "all"
    if (s) setSport(s)
    if (f !== format) setFormat(f)
  }, [searchParams])

  const handleSearch = () => {
    setPage(1)
    fetchLeagues(1)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DiscoverySearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
        />
        <DiscoveryFilters
          sport={sport}
          format={format}
          sort={sort}
          entryFee={entryFee}
          onSportChange={(v) => { setSport(v); setPage(1) }}
          onFormatChange={(v) => { setFormat(v); setPage(1) }}
          onSortChange={(v) => { setSort(v); setPage(1) }}
          onEntryFeeChange={(v) => { setEntryFee(v); setPage(1) }}
        />
      </div>

      <TrendingLeaguesSection sport={sport || undefined} limit={6} />
      <RecommendedLeaguesSection sport={sport || undefined} limit={6} />
      <CreatorDiscoverySection sport={sport || undefined} limit={6} />

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>
          All leagues
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : leagues.length === 0 ? (
          <div
            className="rounded-xl border border-dashed p-12 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <Inbox className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--muted)" }} />
            <p className="font-medium" style={{ color: "var(--text)" }}>
              No leagues match your filters
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Try changing sport, format, or search terms.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leagues.map((league) => (
                <LeagueDiscoveryCard key={`${league.source}-${league.id}`} league={league} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
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
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
