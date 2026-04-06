"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Trophy, Sparkles } from "lucide-react"

interface AwardDetail {
  awardId: string
  leagueId: string
  sport: string
  season: string
  awardType: string
  awardLabel: string
  managerId: string
  score: number
  createdAt: string
}

export default function AwardDetailPage() {
  const params = useParams<{ leagueId: string; awardId: string }>()
  const leagueId = params?.leagueId ?? ""
  const awardId = params?.awardId ?? ""
  const [award, setAward] = useState<AwardDetail | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId || !awardId) return
    setLoading(true)
    setError(null)
    fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/awards/${encodeURIComponent(awardId)}`,
      { cache: "no-store" }
    )
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(data?.error ?? "Failed to load award")
        }
        return data
      })
      .then((data) => {
        if (data?.awardId) setAward(data)
        else setError("Award not found")
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load award"))
      .finally(() => setLoading(false))
  }, [leagueId, awardId])

  const tellStory = () => {
    if (!leagueId || !awardId) return
    setNarrative(null)
    setNarrativeLoading(true)
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
        setNarrative(data?.narrative ?? "No explanation available.")
      })
      .catch((e) =>
        setNarrative(e instanceof Error ? e.message : "Could not load explanation.")
      )
      .finally(() => setNarrativeLoading(false))
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-white/50">Loading award…</div>
      </div>
    )
  }
  if (error || !award) {
    return (
      <div className="p-4">
        <p className="text-red-200">{error ?? "Award not found"}</p>
        <Link
          href={`/league/${encodeURIComponent(leagueId)}?tab=Awards`}
          className="mt-2 inline-flex items-center gap-1 text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Awards
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/league/${encodeURIComponent(leagueId)}?tab=Awards`}
        className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Awards
      </Link>
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-10 w-10 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-white">{award.awardLabel}</h1>
            <p className="text-sm text-white/70">{award.season} · {award.sport}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-xs text-zinc-500">Winner</span>
            <p className="font-medium text-white">{award.managerId}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Score</span>
            <p className="font-mono text-amber-400">{award.score.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
            disabled={narrativeLoading}
            onClick={tellStory}
          >
            <Sparkles className="h-4 w-4" /> {narrativeLoading ? "…" : "Why did they win?"}
          </button>
          {narrative && (
            <div className="mt-2 rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300">
              {narrative}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
