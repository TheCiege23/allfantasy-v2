"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useRecordBook } from "@/hooks/useRecordBook"
import { useRecordBookSeasons } from "@/hooks/useRecordBookSeasons"
import type { RecordBookRow } from "@/hooks/useRecordBook"
import type { LeagueTabProps } from "@/components/app/tabs/types"
import { BookOpen, RefreshCw, Sparkles } from "lucide-react"
import { RECORD_TYPES, RECORD_LABELS } from "@/lib/record-book-engine/types"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

export default function RecordBooksTab({ leagueId, isCommissioner = false }: LeagueTabProps & { isCommissioner?: boolean }) {
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("")
  const [seasonFilter, setSeasonFilter] = useState<string>("")
  const [sportFilter, setSportFilter] = useState<string>("")
  const [runSeasons, setRunSeasons] = useState<string>(new Date().getFullYear().toString())
  const [runLoading, setRunLoading] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runStatusError, setRunStatusError] = useState(false)
  const [explainRecordId, setExplainRecordId] = useState<string | null>(null)
  const [explainNarrative, setExplainNarrative] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState<string | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)

  const { seasons, error: seasonsError, refresh: refreshSeasons } = useRecordBookSeasons(leagueId)
  const { records, loading, error, refresh } = useRecordBook({
    leagueId,
    recordType: recordTypeFilter || undefined,
    season: seasonFilter || undefined,
    sport: sportFilter || undefined,
  })

  const runEngine = useCallback(async () => {
    setRunStatus(null)
    setRunStatusError(false)
    setRunLoading(true)
    const seasonsList = runSeasons.split(",").map((s) => s.trim()).filter(Boolean)
    const toRun = seasonsList.length > 0 ? seasonsList : [runSeasons]
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/record-book/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasons: toRun, sport: sportFilter || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRunStatus(data?.error ?? "Failed to build record book entries.")
        setRunStatusError(true)
        return
      }
      setRunStatus(
        typeof data?.entriesCreated === "number" && typeof data?.entriesUpdated === "number"
          ? `Record book run complete: ${data.entriesCreated} created, ${data.entriesUpdated} updated.`
          : "Record book run complete."
      )
      await Promise.all([refresh(), refreshSeasons()])
    } catch {
      setRunStatus("Failed to build record book entries.")
      setRunStatusError(true)
    } finally {
      setRunLoading(false)
    }
  }, [leagueId, runSeasons, sportFilter, refresh, refreshSeasons])

  const explain = useCallback(
    (recordId: string) => {
      if (explainRecordId === recordId && explainNarrative !== null) {
        setExplainRecordId(null)
        setExplainNarrative(null)
        setExplainLoading(null)
        setExplainError(null)
        return
      }
      setExplainRecordId(recordId)
      setExplainNarrative(null)
      setExplainError(null)
      setExplainLoading(recordId)
      fetch(`/api/leagues/${encodeURIComponent(leagueId)}/record-book/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}))
          if (!r.ok) {
            throw new Error(data?.error ?? "Failed to explain record")
          }
          return data
        })
        .then((data) => {
          setExplainNarrative(data?.narrative ?? "No explanation available.")
          setExplainLoading(null)
        })
        .catch((e) => {
          setExplainError(e instanceof Error ? e.message : "Could not load explanation.")
          setExplainLoading(null)
        })
    },
    [leagueId, explainRecordId, explainNarrative]
  )

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Record Books</h2>
              <p className="text-xs text-white/60">
                Highest score, longest win streak, biggest comeback, best draft, most championships.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RECORD_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="">All sports</option>
              {SUPPORTED_SPORTS.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
            >
              <option value="">All seasons</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-xl bg-zinc-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={loading}
              onClick={() => refresh()}
            >
              <RefreshCw className={`h-4 w-4 inline ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <div className="flex items-center gap-1">
              <input
                type="text"
                className="w-24 rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-sm"
                placeholder="Year or 2022,2023"
                value={runSeasons}
                onChange={(e) => setRunSeasons(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm disabled:opacity-60"
                disabled={runLoading || !isCommissioner}
                onClick={runEngine}
              >
                {runLoading ? "Running…" : "Build records"}
              </button>
            </div>
            {!isCommissioner && (
              <span className="text-xs text-zinc-500">Commissioner only</span>
            )}
          </div>
        </div>
      </div>

      {runStatus && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            runStatusError
              ? "border-red-500/30 bg-red-900/20 text-red-200"
              : "border-emerald-500/30 bg-emerald-900/20 text-emerald-100"
          }`}
        >
          {runStatus}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {seasonsError && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-200">
          {seasonsError}
        </div>
      )}
      {explainError && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-200">
          {explainError}
        </div>
      )}

      {loading && <div className="text-sm text-white/50">Loading record book…</div>}

      {!loading && records.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80">Record book leaderboard</h3>
          <div className="space-y-2">
            {records.map((r) => (
              <RecordRow
                key={r.recordId}
                leagueId={leagueId}
                record={r}
                explainRecordId={explainRecordId}
                explainNarrative={explainNarrative}
                explainLoading={explainLoading}
                onExplain={() => explain(r.recordId)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          {isCommissioner
            ? 'No records yet. Enter a season (or comma-separated years) and click "Build records" to detect highest score, longest win streak, biggest comeback, best draft, and most championships.'
            : 'No records yet. Ask your commissioner to build record books for this league.'}
        </div>
      )}
    </div>
  )
}

function RecordRow({
  leagueId,
  record,
  explainRecordId,
  explainNarrative,
  explainLoading,
  onExplain,
}: {
  leagueId: string
  record: RecordBookRow
  explainRecordId: string | null
  explainNarrative: string | null
  explainLoading: string | null
  onExplain: () => void
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 w-6">#{record.rank}</span>
          <Link
            href={`/app/league/${encodeURIComponent(leagueId)}/record-book/${encodeURIComponent(record.recordId)}`}
            className="font-medium text-white hover:underline"
          >
            {record.recordLabel}
          </Link>
          <span className="text-zinc-400 text-sm">{record.season}</span>
          <span className="text-emerald-400 font-mono text-sm">{record.holderId}</span>
          <span className="text-amber-400 font-mono text-sm">→ {record.value}</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
          disabled={explainLoading === record.recordId}
          onClick={onExplain}
        >
          <Sparkles className="h-3 w-3" /> {explainRecordId === record.recordId && explainNarrative ? "Hide" : "Explain"}
        </button>
      </div>
      {explainRecordId === record.recordId && explainNarrative && (
        <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
          {explainNarrative}
        </div>
      )}
    </div>
  )
}
