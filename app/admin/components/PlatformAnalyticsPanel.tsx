"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { getSportOptions } from "@/lib/platform-analytics"

type DateCount = { date: string; count: number; uniqueUsers?: number }

type PlatformData = {
  userGrowth: {
    dau: number
    mau: number
    signupsOverTime: DateCount[]
    activeUsersOverTime: DateCount[]
  }
  leagueGrowth: {
    totalLeagues: number
    leaguesCreatedOverTime: DateCount[]
    bySport: { sport: string; count: number }[]
  }
  toolUsage: {
    byToolKey: { toolKey: string; count: number; uniqueUsers: number }[]
    eventsOverTime: DateCount[]
  }
  aiRequests: { total: number; uniqueUsers: number; overTime: DateCount[] }
  revenue: { totalCents: number; transactionCount: number; overTime: DateCount[] }
  bracketParticipation: {
    totalEntries: number
    totalLeagues: number
    entriesOverTime: DateCount[]
  }
  draftActivity: { totalDrafts: number; uniqueUsers: number; overTime: DateCount[] }
  tradeVolume: { totalTrades: number; overTime: DateCount[] }
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function presetRange(preset: "7d" | "30d" | "90d"): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  if (preset === "7d") from.setDate(from.getDate() - 7)
  else if (preset === "30d") from.setDate(from.getDate() - 30)
  else from.setDate(from.getDate() - 90)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function PlatformAnalyticsPanel() {
  const [from, setFrom] = useState(() => presetRange("30d").from)
  const [to, setTo] = useState(() => presetRange("30d").to)
  const [sport, setSport] = useState("all")
  const [data, setData] = useState<PlatformData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from, to })
      if (sport && sport !== "all") params.set("sport", sport)
      const res = await fetch(`/api/admin/analytics/platform?${params}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load")
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [from, to, sport])

  useEffect(() => {
    load()
  }, [load])

  const sportOptions = getSportOptions()

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-base sm:text-xl font-semibold" style={{ color: "var(--text)" }}>
          Platform Analytics
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Date range</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
          />
          <span style={{ color: "var(--muted)" }}>–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
          />
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                const r = presetRange(p)
                setFrom(r.from)
                setTo(r.to)
              }}
              className="px-2 py-1 rounded text-xs font-medium border"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              {p}
            </button>
          ))}
          <label className="text-xs font-medium ml-2" style={{ color: "var(--muted)" }}>Sport</label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm border appearance-none pr-8"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)", color: "var(--text)" }}
          >
            {sportOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 mb-4">
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
          Select date range and click Apply
        </div>
      )}

      {data && (
        <>
          {/* User Growth */}
          <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>User Growth</h3>
              <button
                onClick={() => {
                  const headers = ["Date", "Signups", "Active Users"]
                  const rows = data.userGrowth.signupsOverTime.map((s, i) => [
                    s.date,
                    String(s.count),
                    String(data.userGrowth.activeUsersOverTime[i]?.count ?? 0),
                  ])
                  downloadCsv("platform_user_growth.csv", headers, rows)
                }}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Export CSV
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.userGrowth.dau}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>DAU</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.userGrowth.mau}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>MAU</div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.userGrowth.activeUsersOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} labelStyle={{ color: "var(--text)" }} />
                  <Line type="monotone" dataKey="count" name="Active users" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* League Growth */}
          <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>League Growth</h3>
              <button
                onClick={() => {
                  const headers = ["Date", "Leagues created"]
                  const rows = data.leagueGrowth.leaguesCreatedOverTime.map((r) => [r.date, String(r.count)])
                  downloadCsv("platform_league_growth.csv", headers, rows)
                }}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Export CSV
              </button>
            </div>
            <div className="mb-3 text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.leagueGrowth.totalLeagues} total leagues</div>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.leagueGrowth.leaguesCreatedOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="count" name="Leagues" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {data.leagueGrowth.bySport.length > 0 && (
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                By sport: {data.leagueGrowth.bySport.map((s) => `${s.sport}: ${s.count}`).join(", ")}
              </div>
            )}
          </section>

          {/* Tool Usage */}
          <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Tool Usage</h3>
              <button
                onClick={() => {
                  const headers = ["Tool", "Count", "Unique users"]
                  const rows = data.toolUsage.byToolKey.slice(0, 50).map((t) => [t.toolKey, String(t.count), String(t.uniqueUsers)])
                  downloadCsv("platform_tool_usage.csv", headers, rows)
                }}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Export CSV
              </button>
            </div>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.toolUsage.eventsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <Line type="monotone" dataKey="count" name="Events" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left py-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>Tool</th>
                    <th className="text-right py-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>Count</th>
                    <th className="text-right py-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>Unique users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.toolUsage.byToolKey.slice(0, 20).map((t) => (
                    <tr key={t.toolKey} style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }}>
                      <td className="py-1.5 truncate max-w-[200px]" style={{ color: "var(--text)" }}>{t.toolKey}</td>
                      <td className="py-1.5 text-right tabular-nums" style={{ color: "var(--text)" }}>{t.count}</td>
                      <td className="py-1.5 text-right tabular-nums" style={{ color: "var(--muted)" }}>{t.uniqueUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* AI Requests */}
          <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>AI Requests</h3>
              <button
                onClick={() => {
                  const headers = ["Date", "Count"]
                  const rows = data.aiRequests.overTime.map((r) => [r.date, String(r.count)])
                  downloadCsv("platform_ai_requests.csv", headers, rows)
                }}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Export CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.aiRequests.total}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Total requests</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.aiRequests.uniqueUsers}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Unique users</div>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.aiRequests.overTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <Line type="monotone" dataKey="count" name="AI requests" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Revenue Metrics */}
          <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Revenue Metrics (Bracket)</h3>
              <button
                onClick={() => {
                  const headers = ["Date", "Amount (cents)"]
                  const rows = data.revenue.overTime.map((r) => [r.date, String(r.count)])
                  downloadCsv("platform_revenue.csv", headers, rows)
                }}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Export CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>${(data.revenue.totalCents / 100).toFixed(2)}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Total (period)</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.revenue.transactionCount}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Transactions</div>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenue.overTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} formatter={(v: number | undefined) => [v != null ? `$${(Number(v) / 100).toFixed(2)}` : '—', "Revenue"]} />
                  <Bar dataKey="count" name="Revenue (¢)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Bracket & Draft & Trade summary */}
          <section className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Participation & Activity</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.bracketParticipation.totalEntries}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Bracket entries</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.bracketParticipation.totalLeagues}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Bracket leagues</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.draftActivity.totalDrafts}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Drafts (period)</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>{data.tradeVolume.totalTrades}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Total trades</div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
