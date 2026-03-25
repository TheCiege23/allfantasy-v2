"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Trophy,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react"
import { useUserTimezone } from "@/hooks/useUserTimezone"
import { downloadCsv } from "@/lib/admin-dashboard/CsvExport"

type LeagueOverviewKind = "by_sport" | "largest" | "recent" | "flagged"
type SportCount = { sport: string; count: number }
type LeagueRow = {
  id: string
  name: string | null
  sport: string
  leagueSize: number | null
  userId: string
  createdAt: string
  status: string | null
  syncError: string | null
}

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAF: "NCAA Football",
  NCAAB: "NCAA Basketball",
  SOCCER: "Soccer",
}

export default function AdminLeagueOverview() {
  const { formatInTimezone } = useUserTimezone()
  const [kind, setKind] = useState<LeagueOverviewKind>("recent")
  const [bySport, setBySport] = useState<SportCount[]>([])
  const [chartBySport, setChartBySport] = useState<SportCount[]>([])
  const [leagues, setLeagues] = useState<LeagueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<LeagueRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sportFilter, setSportFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "size_desc">("created_desc")
  const [page, setPage] = useState(1)
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const PAGE_SIZE = 10

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, sportRes] = await Promise.all([
        fetch(`/api/admin/dashboard/leagues?kind=${kind}&limit=100`, { cache: "no-store" }),
        fetch(`/api/admin/dashboard/leagues?kind=by_sport&limit=100`, { cache: "no-store" }),
      ])
      const json = await res.json().catch(() => ({}))
      const sportJson = await sportRes.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load")
      if (sportRes.ok) {
        setChartBySport((sportJson.data || []).map((d: { sport: string; count: number }) => ({ sport: d.sport, count: d.count })))
      }
      if (json.kind === "by_sport") {
        setBySport((json.data || []).map((d: { sport: string; count: number }) => ({ sport: d.sport, count: d.count })))
        setLeagues([])
      } else {
        setBySport([])
        setLeagues(json.data || [])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load leagues")
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    load()
  }, [load])

  const filteredLeagues = (() => {
    let list = [...leagues]
    if (sportFilter !== "all") list = list.filter((r) => r.sport === sportFilter)
    if (sortBy === "created_desc") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (sortBy === "created_asc") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    if (sortBy === "size_desc") list.sort((a, b) => (b.leagueSize ?? 0) - (a.leagueSize ?? 0))
    return list
  })()
  const maxPage = Math.max(1, Math.ceil(filteredLeagues.length / PAGE_SIZE))
  const pagedLeagues = filteredLeagues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > maxPage) setPage(maxPage)
  }, [page, maxPage])

  useEffect(() => {
    if (kind === "by_sport") setSelectedLeagueIds([])
  }, [kind])

  useEffect(() => {
    setSelectedLeagueIds((prev) => prev.filter((id) => leagues.some((l) => l.id === id)))
  }, [leagues])

  const fmtDate = (iso: string) => {
    try {
      return formatInTimezone(iso, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return iso
    }
  }

  const handleDeleteLeague = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/leagues/${deleteConfirm.id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to delete league")
      setDeleteConfirm(null)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete league")
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDeleteLeagues = async () => {
    if (selectedLeagueIds.length === 0) return
    if (!confirm(`Delete ${selectedLeagueIds.length} selected leagues? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const results = await Promise.all(
        selectedLeagueIds.map(async (id) => {
          const res = await fetch(`/api/admin/leagues/${id}`, { method: "DELETE" })
          return res.ok
        })
      )
      const deletedCount = results.filter(Boolean).length
      setError(deletedCount > 0 ? null : "Failed to delete selected leagues")
      setSelectedLeagueIds([])
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete selected leagues")
    } finally {
      setBulkDeleting(false)
    }
  }

  const exportVisibleCsv = () => {
    downloadCsv(
      "admin-leagues-visible.csv",
      ["id", "name", "sport", "leagueSize", "userId", "createdAt", "status", "syncError"],
      filteredLeagues.map((row) => [
        row.id,
        row.name ?? "",
        row.sport,
        row.leagueSize ?? "",
        row.userId,
        row.createdAt,
        row.status ?? "",
        row.syncError ?? "",
      ])
    )
  }

  const exportSelectedCsv = () => {
    const selected = leagues.filter((row) => selectedLeagueIds.includes(row.id))
    downloadCsv(
      "admin-leagues-selected.csv",
      ["id", "name", "sport", "leagueSize", "userId", "createdAt", "status", "syncError"],
      selected.map((row) => [
        row.id,
        row.name ?? "",
        row.sport,
        row.leagueSize ?? "",
        row.userId,
        row.createdAt,
        row.status ?? "",
        row.syncError ?? "",
      ])
    )
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              League Overview
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              By sport, largest, recent, or flagged
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as LeagueOverviewKind)
              setPage(1)
            }}
            data-testid="admin-leagues-kind-filter"
            className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--text) 5%, transparent)",
              color: "var(--text)",
            }}
          >
            <option value="by_sport">By sport</option>
            <option value="largest">Largest leagues</option>
            <option value="recent">Recently created</option>
            <option value="flagged">Flagged (sync error)</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            data-testid="admin-leagues-refresh"
            className="h-10 w-10 flex items-center justify-center rounded-xl border hover:opacity-80 transition disabled:opacity-50"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--muted)" }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Active leagues by sport
          </div>
          <div className="space-y-2">
            {chartBySport.map((row) => {
              const max = Math.max(1, ...chartBySport.map((x) => x.count))
              const width = `${Math.max(4, Math.round((row.count / max) * 100))}%`
              return (
                <button
                  key={row.sport}
                  type="button"
                  onClick={() => {
                    setSportFilter(row.sport)
                    if (kind === "by_sport") setKind("recent")
                  }}
                  onMouseEnter={() => {}}
                  title={`${SPORT_LABELS[row.sport] ?? row.sport}: ${row.count}`}
                  className="w-full text-left"
                  data-testid={`admin-leagues-sport-bar-${row.sport}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "var(--text)" }}>{SPORT_LABELS[row.sport] ?? row.sport}</span>
                    <span style={{ color: "var(--muted)" }}>{row.count}</span>
                  </div>
                  <div className="h-2 rounded bg-black/30 overflow-hidden">
                    <div className="h-2 rounded bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all" style={{ width }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border p-3 flex flex-wrap items-center gap-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
          <select
            value={sportFilter}
            onChange={(e) => {
              setSportFilter(e.target.value)
              setPage(1)
            }}
            data-testid="admin-leagues-sport-filter"
            className="h-9 rounded-lg border px-2 text-sm"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
          >
            <option value="all">All sports</option>
            {Object.keys(SPORT_LABELS).map((sport) => (
              <option key={sport} value={sport}>{SPORT_LABELS[sport]}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as "created_desc" | "created_asc" | "size_desc")
              setPage(1)
            }}
            data-testid="admin-leagues-sort"
            className="h-9 rounded-lg border px-2 text-sm"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="size_desc">Largest size</option>
          </select>
          <button
            type="button"
            onClick={() => setSportFilter("all")}
            className="h-9 rounded-lg border px-3 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-leagues-clear-filters"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={exportVisibleCsv}
            className="h-9 rounded-lg border px-3 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-leagues-export-visible"
          >
            Export visible CSV
          </button>
          <button
            type="button"
            onClick={exportSelectedCsv}
            disabled={selectedLeagueIds.length === 0}
            className="h-9 rounded-lg border px-3 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-leagues-export-selected"
          >
            Export selected CSV
          </button>
        </div>
      </div>

      {selectedLeagueIds.length > 0 && kind !== "by_sport" && (
        <div
          className="rounded-xl border p-3 flex items-center gap-2"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}
          data-testid="admin-leagues-bulk-bar"
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedLeagueIds.length} selected</span>
          <button
            type="button"
            onClick={handleBulkDeleteLeagues}
            disabled={bulkDeleting}
            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "#fda4af" }}
            data-testid="admin-leagues-bulk-delete"
          >
            {bulkDeleting ? "Deleting..." : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedLeagueIds([])}
            className="rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-leagues-bulk-clear"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && bySport.length === 0 && leagues.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      ) : kind === "by_sport" ? (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Sport
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Active leagues
                  </th>
                </tr>
              </thead>
              <tbody>
                {bySport.map((row) => (
                  <tr key={row.sport} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                      {SPORT_LABELS[row.sport] ?? row.sport}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                      {row.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    <input
                      type="checkbox"
                      checked={pagedLeagues.length > 0 && pagedLeagues.every((l) => selectedLeagueIds.includes(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const next = new Set(selectedLeagueIds)
                          pagedLeagues.forEach((l) => next.add(l.id))
                          setSelectedLeagueIds(Array.from(next))
                        } else {
                          setSelectedLeagueIds((prev) => prev.filter((id) => !pagedLeagues.some((l) => l.id === id)))
                        }
                      }}
                      data-testid="admin-leagues-select-page"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    League
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                    Sport
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--muted)" }}>
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--muted)" }}>
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leagues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                      No leagues found
                    </td>
                  </tr>
                ) : (
                  pagedLeagues.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeagueIds.includes(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedLeagueIds((prev) => Array.from(new Set([...prev, row.id])))
                            else setSelectedLeagueIds((prev) => prev.filter((id) => id !== row.id))
                          }}
                          data-testid={`admin-leagues-select-${row.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[180px]" style={{ color: "var(--text)" }}>
                            {row.name || `League ${row.id.slice(0, 8)}`}
                          </span>
                          {row.syncError && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="h-3 w-3" />
                              Error
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                        {SPORT_LABELS[row.sport] ?? row.sport}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell tabular-nums" style={{ color: "var(--muted)" }}>
                        {row.leagueSize ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: "var(--muted)" }}>
                        {fmtDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/app/league/${row.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                            style={{
                              borderColor: "var(--border)",
                              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                              color: "var(--accent)",
                            }}
                            data-testid={`admin-leagues-view-league-${row.id}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View league
                          </Link>
                          <Link
                            href={`/admin?tab=users&q=${encodeURIComponent(row.userId)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                            style={{
                              borderColor: "var(--border)",
                              background: "color-mix(in srgb, var(--text) 6%, transparent)",
                              color: "var(--text)",
                            }}
                            data-testid={`admin-leagues-view-user-${row.id}`}
                          >
                            View user
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(row)}
                            data-testid={`admin-leagues-delete-${row.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
                            title="Delete league"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-leagues-page-prev"
            >
              Prev
            </button>
            <span className="text-xs" style={{ color: "var(--muted)" }}>Page {page} / {maxPage}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
              className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              data-testid="admin-leagues-page-next"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                Delete league?
              </h3>
              <button
                type="button"
                onClick={() => !deleting && setDeleteConfirm(null)}
                className="p-1 rounded hover:opacity-80"
                style={{ color: "var(--muted)" }}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--text)" }}>{deleteConfirm.name || deleteConfirm.id}</strong> will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !deleting && setDeleteConfirm(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLeague}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                    Deleting…
                  </>
                ) : (
                  "Delete league"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
