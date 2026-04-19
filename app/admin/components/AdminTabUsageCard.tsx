"use client"

import { useEffect, useState } from "react"
import { BarChart3, Loader2, RefreshCw } from "lucide-react"

type TabRow = {
  tab: string
  views: number
  uniqueSessions: number
  uniqueUsers: number
  lastSeen: string | null
}

type Response = {
  ok: true
  days: number
  since: string
  totalViews: number
  rowsScanned: number
  truncated: boolean
  tabs: TabRow[]
  zeroViewTabs: string[]
}

const DAY_OPTIONS = [7, 30, 90]

/** Color-code by pct-of-max so you see at a glance which tabs are cold. */
function heatClass(pct: number): string {
  if (pct >= 0.5) return "bg-emerald-500/15 text-emerald-200"
  if (pct >= 0.2) return "bg-sky-500/12 text-sky-200"
  if (pct >= 0.05) return "bg-amber-500/12 text-amber-100"
  return "bg-rose-500/12 text-rose-200"
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  const hrs = ms / 3_600_000
  if (hrs < 1) return `${Math.max(1, Math.round(ms / 60_000))}m ago`
  if (hrs < 48) return `${Math.round(hrs)}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export function AdminTabUsageCard() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(next = days) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/tab-usage?days=${next}`, { cache: "no-store" })
      const json = (await res.json()) as Response | { ok: false; error?: string }
      if (!res.ok || !json.ok) throw new Error(("error" in json && json.error) || "Failed to load tab usage")
      setData(json)
    } catch (e: any) {
      setError(e?.message || "Failed to load tab usage")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const maxViews = data?.tabs[0]?.views ?? 0

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 3%, transparent)" }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-400" />
          <h3 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            Admin tab usage
          </h3>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            which tabs are actually used — decides what to cut
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              disabled={loading}
              className="rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60"
              style={{
                borderColor: "var(--border)",
                background:
                  days === d
                    ? "color-mix(in srgb, var(--accent, #8b5cf6) 18%, transparent)"
                    : "transparent",
                color: days === d ? "var(--accent, #a78bfa)" : "var(--muted)",
              }}
            >
              {d}d
            </button>
          ))}
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="ml-1 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            title="Refresh"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center py-8" style={{ color: "var(--muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <Stat label="Total views" value={data.totalViews.toLocaleString()} />
            <Stat label="Tabs used" value={String(data.tabs.filter((t) => t.views > 0 && t.tab !== "other").length)} />
            <Stat label="Zero-view tabs" value={String(data.zeroViewTabs.length)} />
            <Stat label="Window" value={`last ${data.days}d`} />
          </div>

          <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Tab</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Views</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Sessions</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Users</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.tabs.map((t) => {
                  const pct = maxViews > 0 ? t.views / maxViews : 0
                  return (
                    <tr key={t.tab} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${heatClass(pct)}`}>
                          {t.tab}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: "var(--text)" }}>{t.views.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: "var(--muted)" }}>{t.uniqueSessions}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: "var(--muted)" }}>{t.uniqueUsers}</td>
                      <td className="px-3 py-1.5 text-right" style={{ color: "var(--muted)" }}>{fmtRelative(t.lastSeen)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {data.zeroViewTabs.length > 0 ? (
            <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
              <span className="font-semibold text-rose-300">Zero views in {data.days}d:</span>{" "}
              {data.zeroViewTabs.join(", ")} — candidates to remove or hide.
            </p>
          ) : null}

          {data.truncated ? (
            <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
              Result capped at 50k rows — widen the window cautiously.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md border px-2 py-1.5"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  )
}
