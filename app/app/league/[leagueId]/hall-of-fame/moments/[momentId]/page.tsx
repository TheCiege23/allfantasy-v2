"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"

interface MomentDetail {
  id: string
  leagueId: string
  sport: string
  season: string
  headline: string
  summary: string | null
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  relatedMatchupId: string | null
  significanceScore: number
  createdAt: string
}

export default function HallOfFameMomentDetailPage() {
  const params = useParams<{ leagueId: string; momentId: string }>()
  const leagueId = params?.leagueId ?? ""
  const momentId = params?.momentId ?? ""
  const [moment, setMoment] = useState<MomentDetail | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId || !momentId) return
    setLoading(true)
    setError(null)
    fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/hall-of-fame/moments/${encodeURIComponent(momentId)}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.moment) setMoment(data.moment)
        else setError("Moment not found")
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [leagueId, momentId])

  const tellStory = () => {
    if (!leagueId || !momentId) return
    setNarrative(null)
    setNarrativeLoading(true)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/hall-of-fame/tell-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "moment", id: momentId }),
    })
      .then((r) => r.json())
      .then((data) => setNarrative(data?.narrative ?? "No explanation available."))
      .catch(() => setNarrative("Could not load explanation."))
      .finally(() => setNarrativeLoading(false))
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-white/50">Loading moment…</p>
      </div>
    )
  }

  if (error || !moment) {
    return (
      <div className="space-y-4 p-4">
        <Link
          href={`/app/league/${leagueId}`}
          className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to league
        </Link>
        <p className="text-red-300">{error ?? "Moment not found"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <Link
        href={`/app/league/${leagueId}`}
        className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to league
      </Link>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
        <h1 className="text-lg font-bold text-white">{moment.headline}</h1>
        <div className="text-xs text-zinc-400">
          {moment.sport} · {moment.season} · Significance:{" "}
          {moment.significanceScore.toFixed(2)}
        </div>
        {moment.summary && (
          <p className="text-sm text-zinc-300">{moment.summary}</p>
        )}
        <p className="text-xs text-zinc-500">
          Recorded: {new Date(moment.createdAt).toLocaleDateString()}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={narrativeLoading}
            onClick={tellStory}
          >
            <BookOpen className="h-4 w-4" />
            {narrativeLoading ? "Loading…" : "Tell me why this matters"}
          </button>
        </div>

        {moment.relatedManagerIds.length > 0 && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Related managers · Legacy</p>
            <div className="flex flex-wrap gap-2">
              {moment.relatedManagerIds.map((managerId) => (
                <a
                  key={managerId}
                  href={`/app/league/${encodeURIComponent(leagueId)}/legacy/breakdown?entityType=MANAGER&entityId=${encodeURIComponent(managerId)}`}
                  className="text-xs text-amber-400 hover:underline"
                >
                  {managerId} — legacy
                </a>
              ))}
            </div>
          </div>
        )}

        {narrative && (
          <div className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300 border border-zinc-700">
            {narrative}
          </div>
        )}
      </div>
    </div>
  )
}
