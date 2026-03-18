"use client"

import { useEffect, useState, useCallback } from "react"
import { ScrollText, RefreshCw, Loader2, AlertTriangle } from "lucide-react"

type AuditEntry = {
  id: string
  adminUserId: string
  action: string
  targetType: string | null
  targetId: string | null
  details: unknown
  createdAt: string
}

export default function AdminAuditPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/audit?limit=100", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load audit log")
      setEntries(json.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit log")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
            style={{
              background: "linear-gradient(to bottom right, var(--accent), color-mix(in srgb, var(--accent) 70%, black))",
            }}
          >
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Audit log
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Admin actions: bans, mutes, league deletions
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="h-10 w-10 flex items-center justify-center rounded-xl border hover:opacity-80 transition disabled:opacity-50"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--text) 5%, transparent)",
          }}
          title="Refresh"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            style={{ color: "var(--muted)" }}
          />
        </button>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: "color-mix(in srgb, var(--text) 5%, transparent)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    Time
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    Admin
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    Action
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    Target
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell"
                    style={{ color: "var(--muted)" }}
                  >
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      No audit entries yet
                    </td>
                  </tr>
                ) : (
                  entries.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t hover:bg-white/[0.02]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: "var(--muted)" }}
                      >
                        {fmtDate(row.createdAt)}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs truncate max-w-[120px]"
                        style={{ color: "var(--text)" }}
                        title={row.adminUserId}
                      >
                        {row.adminUserId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                        {row.action}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                        {row.targetType && row.targetId
                          ? `${row.targetType}:${row.targetId.slice(0, 8)}…`
                          : "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-xs hidden md:table-cell max-w-[200px] truncate"
                        style={{ color: "var(--muted)" }}
                        title={
                          row.details && typeof row.details === "object"
                            ? JSON.stringify(row.details)
                            : String(row.details)
                        }
                      >
                        {row.details && typeof row.details === "object"
                          ? JSON.stringify(row.details).slice(0, 60) + (JSON.stringify(row.details).length > 60 ? "…" : "")
                          : row.details != null
                            ? String(row.details).slice(0, 40)
                            : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
