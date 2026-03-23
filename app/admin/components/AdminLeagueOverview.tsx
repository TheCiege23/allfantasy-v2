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
  const [leagues, setLeagues] = useState<LeagueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<LeagueRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/dashboard/leagues?kind=${kind}&limit=25`,
        { cache: "no-store" }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load")
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
            onChange={(e) => setKind(e.target.value as LeagueOverviewKind)}
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
            className="h-10 w-10 flex items-center justify-center rounded-xl border hover:opacity-80 transition disabled:opacity-50"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--muted)" }} />
          </button>
        </div>
      </div>

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
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                      No leagues found
                    </td>
                  </tr>
                ) : (
                  leagues.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: "var(--border)" }}>
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
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View league
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(row)}
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
