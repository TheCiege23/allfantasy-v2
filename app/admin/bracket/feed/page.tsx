"use client"

import { useEffect, useMemo, useState } from "react"

type FeedEvent = {
  id: string
  tournamentId: string
  leagueId: string | null
  eventType: string
  headline: string
  detail?: string | null
  metadata?: any
  createdAt: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  UPSET_BUSTED: "Upset busted",
  BIG_UPSET: "Big upset",
  CHAMP_ELIMINATED: "Champion eliminated",
  PERFECT_TRACKER: "Perfect bracket tracker",
  LEAD_CHANGE: "Lead change",
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

export default function AdminBracketFeedPage() {
  const [tournamentId, setTournamentId] = useState("")
  const [leagueId, setLeagueId] = useState("")
  const [eventType, setEventType] = useState<string>("")
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null)

  const filteredTypes = useMemo(
    () => ["", "UPSET_BUSTED", "BIG_UPSET", "CHAMP_ELIMINATED", "PERFECT_TRACKER", "LEAD_CHANGE"],
    [],
  )

  async function load(reset = false) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tournamentId.trim()) params.set("tournamentId", tournamentId.trim())
      if (leagueId.trim()) params.set("leagueId", leagueId.trim())
      if (eventType) params.set("eventType", eventType)
      params.set("limit", "50")
      if (!reset && lastCreatedAt) params.set("before", lastCreatedAt)

      const res = await fetch(`/api/admin/bracket/feed?${params.toString()}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load feed events")
        return
      }

      const newEvents: FeedEvent[] = data.events || []
      setHasMore((data.count || 0) === 50)

      if (reset) {
        setEvents(newEvents)
      } else {
        setEvents((prev) => [...prev, ...newEvents])
      }

      if (newEvents.length > 0) {
        const last = newEvents[newEvents.length - 1]
        setLastCreatedAt(last.createdAt)
      }
    } catch {
      setError("Failed to load feed events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load with no filters; admin can refine via controls.
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleApplyFilters() {
    setLastCreatedAt(null)
    load(true)
  }

  function badgeColor(type: string): { bg: string; border: string; text: string } {
    switch (type) {
      case "UPSET_BUSTED":
        return { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.4)", text: "#f97373" }
      case "BIG_UPSET":
        return { bg: "rgba(234,179,8,0.10)", border: "rgba(234,179,8,0.4)", text: "#eab308" }
      case "CHAMP_ELIMINATED":
        return { bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.4)", text: "#c4b5fd" }
      case "PERFECT_TRACKER":
        return { bg: "rgba(56,189,248,0.10)", border: "rgba(56,189,248,0.4)", text: "#22d3ee" }
      case "LEAD_CHANGE":
        return { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.4)", text: "#4ade80" }
      default:
        return { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.4)", text: "#e5e7eb" }
    }
  }

  return (
    <div className="mode-surface mode-readable min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Bracket Feed — Admin</h1>
            <p className="text-xs text-white/50">
              Inspect live upset alerts, champ eliminations, perfect‑bracket updates, and lead changes.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">Tournament ID</label>
              <input
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full rounded-md bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none"
                placeholder="optional"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">League ID</label>
              <input
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                className="w-full rounded-md bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none"
                placeholder="optional"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/60">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value)
                }}
                className="w-full rounded-md bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none"
              >
                {filteredTypes.map((t) => (
                  <option key={t || "any"} value={t}>
                    {t ? EVENT_TYPE_LABELS[t] || t : "Any"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
              >
                Apply Filters
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          {loading && events.length === 0 && (
            <div className="py-8 text-center text-xs text-white/50">
              Loading feed events…
            </div>
          )}

          {!loading && events.length === 0 && !error && (
            <div className="py-8 text-center text-xs text-white/40">
              No events found for the current filters.
            </div>
          )}

          {events.map((ev) => {
            const style = badgeColor(ev.eventType)
            const label = EVENT_TYPE_LABELS[ev.eventType] || ev.eventType
            return (
              <div
                key={ev.id}
                className="rounded-lg px-3 py-2.5 space-y-1.5"
                style={{ background: "rgba(15,23,42,0.95)", border: `1px solid ${style.border}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {label}
                    </span>
                    <span className="text-[11px] font-semibold text-white truncate">
                      {ev.headline}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/35 whitespace-nowrap">
                    {formatTime(ev.createdAt)}
                  </span>
                </div>
                {ev.detail && (
                  <div className="text-[11px] text-white/65">
                    {ev.detail}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-[10px] text-white/35">
                  <span>
                    TID: <span className="text-white/60">{ev.tournamentId}</span>
                  </span>
                  {ev.leagueId && (
                    <span>
                      LID: <span className="text-white/60">{ev.leagueId}</span>
                    </span>
                  )}
                  {ev.metadata?.champPct != null && (
                    <span>
                      champ%: <span className="text-white/60">{ev.metadata.champPct}</span>
                    </span>
                  )}
                  {ev.metadata?.bustedPct != null && (
                    <span>
                      busted%: <span className="text-white/60">{ev.metadata.bustedPct}</span>
                    </span>
                  )}
                  {ev.metadata?.seedDiff != null && (
                    <span>
                      seedΔ: <span className="text-white/60">{ev.metadata.seedDiff}</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {events.length > 0 && (
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setEvents([])
                  setLastCreatedAt(null)
                  load(true)
                }}
                className="px-3 py-1.5 rounded-md text-[11px] font-semibold border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
              >
                Refresh
              </button>
              {hasMore && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => load(false)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold border border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 disabled:opacity-50"
                >
                  {loading ? "Loading more…" : "Load more"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

