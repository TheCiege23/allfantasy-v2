"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useLegacyScoreLeaderboard } from "@/hooks/useLegacyScoreLeaderboard"
import { Award, Shield } from "lucide-react"
import type { LegacyScoreRecordRow } from "@/hooks/useLegacyScoreLeaderboard"
import type { LeagueTabProps } from "@/components/app/tabs/types"

const SPORTS = ["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"] as const

export default function LegacyTab({ leagueId }: LeagueTabProps) {
  const [sportFilter, setSportFilter] = useState("")
  const [explainId, setExplainId] = useState<string | null>(null)
  const [explainNarrative, setExplainNarrative] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState<string | null>(null)
  const [runLoading, setRunLoading] = useState(false)

  const { records, total, loading, error, refresh } = useLegacyScoreLeaderboard({
    leagueId,
    sport: sportFilter || null,
    entityType: "MANAGER",
  })

  const runEngine = useCallback(() => {
    setRunLoading(true)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/legacy-score/run`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then(() => refresh())
      .finally(() => setRunLoading(false))
  }, [leagueId, refresh])

  const explain = useCallback(
    (entityId: string) => {
      if (explainId === entityId && explainNarrative !== null) {
        setExplainId(null)
        setExplainNarrative(null)
        setExplainLoading(null)
        return
      }
      setExplainId(entityId)
      setExplainNarrative(null)
      setExplainLoading(entityId)
      fetch(`/api/leagues/${encodeURIComponent(leagueId)}/legacy-score/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "MANAGER", entityId }),
      })
        .then((r) => r.json())
        .then((data) => {
          setExplainNarrative(data?.narrative ?? "No explanation available.")
          setExplainLoading(null)
        })
        .catch(() => {
          setExplainNarrative("Could not load explanation.")
          setExplainLoading(null)
        })
    },
    [leagueId, explainId, explainNarrative]
  )

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Legacy Score</h2>
            <p className="text-xs text-white/60">
              Long-term greatness: championships, playoffs, consistency, rivalry, dynasty.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="">All sports</option>
              {SPORTS.map((s) => (
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
              Refresh
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={runLoading}
              onClick={runEngine}
            >
              {runLoading ? "Running…" : "Run legacy engine"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-amber-200/80">
          See also: Hall of Fame tab for inductions and moments. Legacy scores are computed
          from season history, championships, playoffs, and consistency.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/app/league/${encodeURIComponent(leagueId)}?tab=Hall of Fame`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
          >
            <Award className="h-3.5 w-3.5" /> Hall of Fame
          </Link>
          <Link
            href={`/app/league/${encodeURIComponent(leagueId)}?tab=Settings`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
          >
            <Shield className="h-3.5 w-3.5" /> Trust scores (Reputation)
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-white/50">Loading legacy leaderboard…</div>
      )}

      {!loading && records.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80">
            Legacy leaderboard ({total})
          </h3>
          <div className="space-y-2">
            {records.slice(0, 25).map((r, idx) => (
              <LegacyScoreCard
                key={r.id}
                rank={idx + 1}
                record={r}
                leagueId={leagueId}
                explainId={explainId}
                explainNarrative={explainNarrative}
                explainLoading={explainLoading}
                onExplain={() => explain(r.entityId)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          No legacy scores yet. Click &quot;Run legacy engine&quot; to compute scores from
          league history (championships, playoffs, consistency).
        </div>
      )}
    </div>
  )
}

function LegacyScoreCard({
  rank,
  record,
  leagueId,
  explainId,
  explainNarrative,
  explainLoading,
  onExplain,
}: {
  rank: number
  record: LegacyScoreRecordRow
  leagueId: string
  explainId: string | null
  explainNarrative: string | null
  explainLoading: string | null
  onExplain: () => void
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 w-6">#{rank}</span>
          <span className="font-medium text-white">
            {record.entityType} {record.entityId}
          </span>
          <span className="text-xs text-zinc-400">{record.sport}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-amber-400">
            {record.overallLegacyScore.toFixed(0)}
          </span>
          <Link
            href={`/app/league/${encodeURIComponent(leagueId)}/legacy/breakdown?entityType=MANAGER&entityId=${encodeURIComponent(record.entityId)}`}
            className="text-xs text-amber-400 hover:underline"
          >
            Why is this score high?
          </Link>
          <button
            type="button"
            className="text-xs text-amber-400 hover:underline disabled:opacity-50"
            disabled={explainLoading === record.entityId}
            onClick={onExplain}
          >
            {explainLoading === record.entityId
              ? "…"
              : explainId === record.entityId && explainNarrative
                ? "Hide"
                : "AI explain"}
          </button>
        </div>
      </div>
      {explainId === record.entityId && explainNarrative && (
        <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
          {explainNarrative}
        </div>
      )}
    </div>
  )
}
