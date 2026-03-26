"use client"

import { useEffect, useState, useCallback } from "react"
import { Server, Database, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import AdminSocialPublishStatusPanel from "./AdminSocialPublishStatusPanel"

type ApiStatus = { status: string; latency?: number; lastCheck: string }
type SportsAlertLatencyType = {
  alertType: "injury_alert" | "performance_alert" | "lineup_alert"
  totalAlerts: number
  sampledAlerts: number
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
}
type SportsAlertLatency = {
  windowHours: number
  totalAlerts: number
  sampledAlerts: number
  p50Ms: number | null
  p95Ms: number | null
  p99Ms: number | null
  maxMs: number | null
  lastAlertAt: string | null
  byType: SportsAlertLatencyType[]
}
type Health = {
  api: Record<string, ApiStatus>
  database: "healthy" | "degraded" | "down"
  databaseLatencyMs?: number
  workerQueue: {
    status: "healthy" | "degraded" | "down"
    queued: number
    running: number
    failedLast24h: number
    lastCheck: string
  }
  sportsAlerts: SportsAlertLatency
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

const SPORTS_ALERT_TYPE_LABELS: Record<SportsAlertLatencyType["alertType"], string> = {
  injury_alert: "Injury alerts",
  performance_alert: "Performance alerts",
  lineup_alert: "Lineup alerts",
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

function formatLatency(value: number | null | undefined) {
  return value == null ? "—" : `${value}ms`
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
        workerQueue: json.workerQueue || {
          status: "down",
          queued: 0,
          running: 0,
          failedLast24h: 0,
          lastCheck: new Date().toISOString(),
        },
        sportsAlerts: json.sportsAlerts || {
          windowHours: 24,
          totalAlerts: 0,
          sampledAlerts: 0,
          p50Ms: null,
          p95Ms: null,
          p99Ms: null,
          maxMs: null,
          lastAlertAt: null,
          byType: [
            { alertType: "injury_alert", totalAlerts: 0, sampledAlerts: 0, p50Ms: null, p95Ms: null, maxMs: null },
            { alertType: "performance_alert", totalAlerts: 0, sampledAlerts: 0, p50Ms: null, p95Ms: null, maxMs: null },
            { alertType: "lineup_alert", totalAlerts: 0, sampledAlerts: 0, p50Ms: null, p95Ms: null, maxMs: null },
          ],
        },
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
          data-testid="admin-system-refresh"
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

      {/* Worker queue */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Worker queue
          </span>
        </div>
        {health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4" data-testid="admin-worker-queue-panel">
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
              <div className="text-xs" style={{ color: "var(--muted)" }}>Status</div>
              <div className="mt-1">{statusBadge(health.workerQueue.status)}</div>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
              <div className="text-xs" style={{ color: "var(--muted)" }}>Queued</div>
              <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{health.workerQueue.queued}</div>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
              <div className="text-xs" style={{ color: "var(--muted)" }}>Running</div>
              <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{health.workerQueue.running}</div>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
              <div className="text-xs" style={{ color: "var(--muted)" }}>Failed (24h)</div>
              <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{health.workerQueue.failedLast24h}</div>
            </div>
          </div>
        )}
      </section>

      {/* Sports alert latency */}
      <section
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
        data-testid="admin-sports-alert-latency-panel"
      >
        <div className="px-4 py-3" style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Sports alert delivery latency
          </span>
          {health?.sportsAlerts?.windowHours ? (
            <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
              Last {health.sportsAlerts.windowHours}h
            </span>
          ) : null}
        </div>
        {health && (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
                <div className="text-xs" style={{ color: "var(--muted)" }}>p50</div>
                <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }} data-testid="admin-sports-alert-latency-p50">
                  {formatLatency(health.sportsAlerts.p50Ms)}
                </div>
              </div>
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
                <div className="text-xs" style={{ color: "var(--muted)" }}>p95</div>
                <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }} data-testid="admin-sports-alert-latency-p95">
                  {formatLatency(health.sportsAlerts.p95Ms)}
                </div>
              </div>
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
                <div className="text-xs" style={{ color: "var(--muted)" }}>p99</div>
                <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                  {formatLatency(health.sportsAlerts.p99Ms)}
                </div>
              </div>
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 4%, transparent)" }}>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Max</div>
                <div className="mt-1 text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                  {formatLatency(health.sportsAlerts.maxMs)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
              <span>Total alerts: {health.sportsAlerts.totalAlerts}</span>
              <span>Sampled latencies: {health.sportsAlerts.sampledAlerts}</span>
              <span>
                Last alert: {health.sportsAlerts.lastAlertAt ? new Date(health.sportsAlerts.lastAlertAt).toLocaleString() : "—"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--text) 3%, transparent)" }}>
                    <th className="px-3 py-2 text-left uppercase" style={{ color: "var(--muted)" }}>Type</th>
                    <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Alerts</th>
                    <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>Samples</th>
                    <th className="px-3 py-2 text-right uppercase" style={{ color: "var(--muted)" }}>p95</th>
                  </tr>
                </thead>
                <tbody>
                  {health.sportsAlerts.byType.map((item) => (
                    <tr key={item.alertType} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                        {SPORTS_ALERT_TYPE_LABELS[item.alertType]}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>{item.totalAlerts}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>{item.sampledAlerts}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--text)" }}>{formatLatency(item.p95Ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <AdminSocialPublishStatusPanel />
    </div>
  )
}
