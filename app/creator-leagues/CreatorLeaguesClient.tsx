"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Search, Trophy, Users } from "lucide-react"
import { VerifiedCreatorBadge } from "@/components/creator/VerifiedCreatorBadge"
import { CreatorLeagueDiscoveryCard } from "@/components/discovery/CreatorLeagueDiscoveryCard"
import { getDiscoverySports } from "@/lib/public-discovery/discovery-sports"
import type { DiscoveryCard } from "@/lib/public-discovery/types"
import type { CreatorProfileDto } from "@/lib/creator-system/types"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAB: "NCAA Basketball",
  NCAAF: "NCAA Football",
  SOCCER: "Soccer",
}

const SORT_OPTIONS = [
  { value: "popularity", label: "Popular" },
  { value: "filling_fast", label: "Filling fast" },
  { value: "newest", label: "Newest" },
] as const

type CreatorLeaguesApiResponse = {
  ok?: boolean
  leagues?: DiscoveryCard[]
  total?: number
  totalPages?: number
  page?: number
  featuredCreators?: CreatorProfileDto[]
}

export function CreatorLeaguesClient() {
  const [sport, setSport] = useState("")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("popularity")
  const [leagues, setLeagues] = useState<DiscoveryCard[]>([])
  const [featuredCreators, setFeaturedCreators] = useState<CreatorProfileDto[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchLeagues = useCallback(
    (p: number) => {
      setLoading(true)
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (sport) params.set("sport", sport)
      params.set("sort", sort)
      params.set("page", String(p))
      params.set("limit", "12")
      params.set("creatorLimit", "6")
      fetch(`/api/creator-leagues?${params.toString()}`)
        .then((r) => r.json())
        .then((d: CreatorLeaguesApiResponse) => {
          setLeagues(d.leagues ?? [])
          setTotal(d.total ?? 0)
          setTotalPages(d.totalPages ?? 1)
          setFeaturedCreators(d.featuredCreators ?? [])
        })
        .catch(() => {
          setLeagues([])
          setFeaturedCreators([])
          setTotal(0)
          setTotalPages(0)
        })
        .finally(() => setLoading(false))
    },
    [query, sort, sport]
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
      <form
        className="rounded-2xl border p-3 sm:p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          fetchLeagues(1)
        }}
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creator or league"
              data-testid="creator-leagues-search-input"
              className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
            />
          </div>
          <select
            value={sort}
            onChange={(event) => {
              const nextSort = event.target.value as (typeof SORT_OPTIONS)[number]["value"]
              setSort(nextSort)
              setPage(1)
            }}
            data-testid="creator-leagues-sort"
            className="h-10 rounded-lg border px-3 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
            aria-label="Sort"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={sport}
            onChange={(event) => {
              setSport(event.target.value)
              setPage(1)
            }}
            data-testid="creator-leagues-sport"
            className="h-10 rounded-lg border px-3 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
            aria-label="Sport"
          >
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            data-testid="creator-leagues-search-submit"
            className="h-10 rounded-lg px-4 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Search
          </button>
        </div>
      </form>

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

      {featuredCreators.length > 0 && (
        <section
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          data-testid="creator-leagues-featured-creators"
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Creator profiles and stats
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Verified creators and their current community stats.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCreators.map((creator) => (
              <li
                key={creator.id}
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 40%, transparent)" }}
                data-testid={`creator-leagues-featured-creator-${creator.slug}`}
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/creators/${encodeURIComponent(creator.slug)}`}
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {creator.displayName ?? creator.handle}
                  </Link>
                  {creator.isVerified ? (
                    <VerifiedCreatorBadge
                      handle={creator.slug}
                      badge={creator.verificationBadge}
                      linkToProfile={false}
                      showLabel={false}
                      size="sm"
                    />
                  ) : null}
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                  @{creator.handle}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    <Users className="mr-1 inline h-3 w-3" />
                    {creator.followerCount ?? 0} followers
                  </span>
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    {creator.leagueCount ?? 0} leagues
                  </span>
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    {creator.totalLeagueMembers ?? 0} members
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
