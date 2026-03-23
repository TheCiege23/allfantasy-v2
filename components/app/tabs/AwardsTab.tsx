"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useAwards } from "@/hooks/useAwards"
import { useAwardSeasons } from "@/hooks/useAwardSeasons"
import type { AwardRow } from "@/hooks/useAwards"
import type { LeagueTabProps } from "@/components/app/tabs/types"
import { Trophy, RefreshCw, Sparkles } from "lucide-react"

export default function AwardsTab({ leagueId, isCommissioner = false }: LeagueTabProps & { isCommissioner?: boolean }) {
  const [seasonFilter, setSeasonFilter] = useState<string>("")
  const [runLoading, setRunLoading] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runStatusError, setRunStatusError] = useState(false)
  const [runSeason, setRunSeason] = useState<string>(new Date().getFullYear().toString())
  const [explainAwardId, setExplainAwardId] = useState<string | null>(null)
  const [explainNarrative, setExplainNarrative] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState<string | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)

  const { seasons, error: seasonsError, refresh: refreshSeasons } = useAwardSeasons(leagueId)
  const { awards, loading, error, refresh } = useAwards({
    leagueId,
    season: seasonFilter || undefined,
  })

  const runEngine = useCallback(async () => {
    setRunStatus(null)
    setRunStatusError(false)
    setRunLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/awards/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: runSeason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRunStatus(data?.error ?? "Failed to generate awards.")
        setRunStatusError(true)
        return
      }
      setRunStatus(
        typeof data?.awardsCreated === "number"
          ? `Generated ${data.awardsCreated} awards for ${runSeason}.`
          : `Generated awards for ${runSeason}.`
      )
      await Promise.all([refresh(), refreshSeasons()])
    } catch {
      setRunStatus("Failed to generate awards.")
      setRunStatusError(true)
    } finally {
      setRunLoading(false)
    }
  }, [leagueId, runSeason, refresh, refreshSeasons])

  const explain = useCallback(
    (awardId: string) => {
      if (explainAwardId === awardId && explainNarrative !== null) {
        setExplainAwardId(null)
        setExplainNarrative(null)
        setExplainLoading(null)
        setExplainError(null)
        return
      }
      setExplainAwardId(awardId)
      setExplainNarrative(null)
      setExplainError(null)
      setExplainLoading(awardId)
      fetch(`/api/leagues/${encodeURIComponent(leagueId)}/awards/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardId }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}))
          if (!r.ok) {
            throw new Error(data?.error ?? "Failed to explain award")
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
    [leagueId, explainAwardId, explainNarrative]
  )

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Season Awards</h2>
              <p className="text-xs text-white/60">
                GM of the Year, Best Draft, Waiver Wizard, Trade Master, and more.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                className="w-20 rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-sm"
                placeholder="Year"
                value={runSeason}
                onChange={(e) => setRunSeason(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl bg-amber-600 text-white px-3 py-2 text-sm disabled:opacity-60"
                disabled={runLoading || !isCommissioner}
                onClick={runEngine}
              >
                {runLoading ? "Running…" : "Generate awards"}
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
              : "border-cyan-500/30 bg-cyan-900/20 text-cyan-100"
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

      {loading && <div className="text-sm text-white/50">Loading awards…</div>}

      {!loading && awards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80">Awards</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {awards.map((a) => (
              <AwardCard
                key={a.awardId}
                leagueId={leagueId}
                award={a}
                explainAwardId={explainAwardId}
                explainNarrative={explainNarrative}
                explainLoading={explainLoading}
                onExplain={() => explain(a.awardId)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && awards.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          {isCommissioner
            ? 'No awards yet. Enter a season year and click "Generate awards" to compute GM of the Year, Best Draft, Waiver Wizard, and other awards from season data.'
            : 'No awards yet. Ask your commissioner to generate awards for a season.'}
        </div>
      )}
    </div>
  )
}

function AwardCard({
  leagueId,
  award,
  explainAwardId,
  explainNarrative,
  explainLoading,
  onExplain,
}: {
  leagueId: string
  award: AwardRow
  explainAwardId: string | null
  explainNarrative: string | null
  explainLoading: string | null
  onExplain: () => void
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <Link
              href={`/app/league/${encodeURIComponent(leagueId)}/awards/${encodeURIComponent(award.awardId)}`}
              className="font-medium text-white hover:underline"
            >
              {award.awardLabel}
            </Link>
            <p className="text-xs text-zinc-400">
              {award.season} · {award.managerId}
            </p>
            <p className="text-amber-400 font-mono text-sm">Score: {award.score.toFixed(2)}</p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
          disabled={explainLoading === award.awardId}
          onClick={onExplain}
        >
          <Sparkles className="h-3 w-3" /> {explainAwardId === award.awardId && explainNarrative ? "Hide" : "Explain"}
        </button>
      </div>
      {explainAwardId === award.awardId && explainNarrative && (
        <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
          {explainNarrative}
        </div>
      )}
    </div>
  )
}
