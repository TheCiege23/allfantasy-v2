"use client"

import { useEffect, useState, useCallback } from "react"
import { Server, Database, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"

type ApiStatus = { status: string; latency?: number; lastCheck: string }
type Health = {
  api: Record<string, ApiStatus>
  database: "healthy" | "degraded" | "down"
  databaseLatencyMs?: number
}

const API_LABELS: Record<string, string> = {
  sleeper: "Sleeper",
  yahoo: "Yahoo",
  mfl: "MFL",
  fantrax: "Fantrax",
  fantasycalc: "FantasyCalc",
  thesportsdb: "TheSportsDB",
  espn: "ESPN",
  openai: "OpenAI",
  grok: "Grok",
}

function statusBadge(status: string) {
  const ok = status === "active" || status === "healthy"
  const warn = status === "timeout" || status === "degraded"
  if (ok)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle className="h-3 w-3" />
        OK
      </span>
    )
  if (warn)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="h-3 w-3" />
        {status}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="h-3 w-3" />
      {status}
    </span>
  )
}

export default function AdminSystemPanel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/system/health", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load health")
      setHealth({
        api: json.api || {},
        database: json.database || "down",
        databaseLatencyMs: json.databaseLatencyMs,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 shadow-lg">
            <Server className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              System health
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              API and database status
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-medium hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Database */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <Database className="h-4 w-4" style={{ color: "var(--muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Database
          </span>
          {health && (
            <span className="ml-2">
              {statusBadge(health.database)}
              {health.databaseLatencyMs != null && (
                <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
                  {health.databaseLatencyMs}ms
                </span>
              )}
            </span>
          )}
        </div>
      </section>

      {/* APIs */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            External APIs
          </span>
        </div>
        {loading && !health ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : health ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Service</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(health.api).map(([key, val]) => (
                  <tr key={key} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2 font-medium" style={{ color: "var(--text)" }}>
                      {API_LABELS[key] ?? key}
                    </td>
                    <td className="px-4 py-2">{statusBadge(val.status)}</td>
                    <td className="px-4 py-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                      {val.latency != null ? `${val.latency}ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
