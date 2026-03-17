"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Inbox, Search } from "lucide-react"
import { FindLeagueCard } from "@/components/discovery/FindLeagueCard"
import { RecommendedLeaguesSection } from "@/components/discovery/RecommendedLeaguesSection"
import { getDiscoverySports } from "@/lib/public-discovery"
import type {
  DiscoveryCard,
  DiscoveryFormat,
  DiscoverySort,
  EntryFeeFilter,
  VisibilityFilter,
  DraftTypeFilter,
  DraftStatusFilter,
} from "@/lib/public-discovery/types"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAB: "NCAA Basketball",
  NCAAF: "NCAA Football",
  SOCCER: "Soccer",
}

const LEAGUE_TYPE_OPTIONS: { value: DiscoveryFormat; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bracket", label: "Bracket" },
  { value: "creator", label: "Creator" },
]

const DRAFT_TYPE_OPTIONS: { value: DraftTypeFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "snake", label: "Snake" },
  { value: "linear", label: "Linear" },
  { value: "auction", label: "Auction" },
]

const DRAFT_STATUS_OPTIONS: { value: DraftStatusFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "pre_draft", label: "Pre-draft" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
]

const ENTRY_FEE_OPTIONS: { value: EntryFeeFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
]

const SORT_OPTIONS: { value: DiscoverySort; label: string }[] = [
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest" },
  { value: "filling_fast", label: "Filling fast" },
]

const VISIBILITY_OPTIONS: { value: VisibilityFilter; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "all", label: "Public & private" },
]

export function FindLeagueClient() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [sport, setSport] = useState("")
  const [leagueType, setLeagueType] = useState<DiscoveryFormat>("all")
  const [draftType, setDraftType] = useState<DraftTypeFilter>("all")
  const [teamCountMin, setTeamCountMin] = useState("")
  const [teamCountMax, setTeamCountMax] = useState("")
  const [draftStatus, setDraftStatus] = useState<DraftStatusFilter>("all")
  const [entryFee, setEntryFee] = useState<EntryFeeFilter>("all")
  const [aiEnabled, setAiEnabled] = useState(false)
  const [visibility, setVisibility] = useState<VisibilityFilter>("public")
  const [sort, setSort] = useState<DiscoverySort>("popularity")
  const [page, setPage] = useState(1)
  const [leagues, setLeagues] = useState<DiscoveryCard[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const buildParams = useCallback(
    (p: number) => {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (sport) params.set("sport", sport)
      params.set("format", leagueType)
      params.set("sort", sort)
      params.set("entryFee", entryFee)
      params.set("visibility", visibility)
      const tMin = teamCountMin.trim() ? parseInt(teamCountMin, 10) : undefined
      const tMax = teamCountMax.trim() ? parseInt(teamCountMax, 10) : undefined
      if (tMin != null && !Number.isNaN(tMin)) params.set("teamCountMin", String(tMin))
      if (tMax != null && !Number.isNaN(tMax)) params.set("teamCountMax", String(tMax))
      if (aiEnabled) params.set("aiEnabled", "true")
      params.set("page", String(p))
      params.set("limit", "12")
      return params
    },
    [query, sport, leagueType, sort, entryFee, visibility, teamCountMin, teamCountMax, aiEnabled]
  )

  const fetchLeagues = useCallback(
    (p: number) => {
      setLoading(true)
      const params = buildParams(p)
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
    [buildParams]
  )

  useEffect(() => {
    fetchLeagues(page)
  }, [page, fetchLeagues])

  useEffect(() => {
    const s = searchParams?.get("sport") ?? ""
    const f = (searchParams?.get("format") as DiscoveryFormat) ?? "all"
    if (s) setSport(s)
    if (f !== "all" && f !== leagueType) setLeagueType(f)
  }, [searchParams])

  const handleSearch = () => {
    setPage(1)
    fetchLeagues(1)
  }

  const sports = getDiscoverySports().map((s) => ({
    value: s.value,
    label: SPORT_LABELS[s.value] ?? s.label,
  }))

  return (
    <div className="space-y-8">
      <RecommendedLeaguesSection sport={sport || undefined} limit={6} />
      {/* Search — mobile first */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search leagues…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 rounded-lg border px-3 py-2.5 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel)",
              color: "var(--text)",
            }}
            aria-label="Search leagues"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="text-sm font-medium flex items-center gap-2 sm:hidden"
          style={{ color: "var(--accent)" }}
        >
          {showFilters ? "Hide filters" : "Show filters"}
        </button>
      </div>

      {/* Filters — collapsible on mobile */}
      <div
        className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${showFilters ? "block" : "hidden sm:grid"}`}
        role="group"
        aria-label="League filters"
      >
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Sport
          </span>
          <select
            value={sport}
            onChange={(e) => {
              setSport(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            <option value="">All sports</option>
            {sports.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            League type
          </span>
          <select
            value={leagueType}
            onChange={(e) => {
              setLeagueType(e.target.value as DiscoveryFormat)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {LEAGUE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Draft type
          </span>
          <select
            value={draftType}
            onChange={(e) => {
              setDraftType(e.target.value as DraftTypeFilter)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {DRAFT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Team count
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min={2}
              max={24}
              placeholder="Min"
              value={teamCountMin}
              onChange={(e) => {
                setTeamCountMin(e.target.value)
                setPage(1)
              }}
              className="w-20 rounded-lg border px-2 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
            />
            <input
              type="number"
              min={2}
              max={24}
              placeholder="Max"
              value={teamCountMax}
              onChange={(e) => {
                setTeamCountMax(e.target.value)
                setPage(1)
              }}
              className="w-20 rounded-lg border px-2 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Draft status
          </span>
          <select
            value={draftStatus}
            onChange={(e) => {
              setDraftStatus(e.target.value as DraftStatusFilter)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {DRAFT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Entry fee
          </span>
          <select
            value={entryFee}
            onChange={(e) => {
              setEntryFee(e.target.value as EntryFeeFilter)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {ENTRY_FEE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            AI features
          </span>
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => {
                setAiEnabled(e.target.checked)
                setPage(1)
              }}
              className="rounded border"
              style={{ borderColor: "var(--border)" }}
            />
            <span className="text-sm" style={{ color: "var(--text)" }}>
              AI enabled
            </span>
          </label>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Visibility
          </span>
          <select
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value as VisibilityFilter)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as DiscoverySort)
              setPage(1)
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Results */}
      <section>
        {loading ? (
          <div className="flex items-center justify-center py-16">
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
              Try changing sport, league type, or search.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              {total} league{total !== 1 ? "s" : ""} found
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leagues.map((league) => (
                <FindLeagueCard key={`${league.source}-${league.id}`} league={league} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav
                className="flex flex-wrap items-center justify-center gap-2 mt-8"
                aria-label="Pagination"
              >
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
      </section>
    </div>
  )
}
