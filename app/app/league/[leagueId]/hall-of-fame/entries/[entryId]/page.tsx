"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"

interface EntryDetail {
  id: string
  entityType: string
  entityId: string
  sport: string
  leagueId: string | null
  season: string | null
  category: string
  title: string
  summary: string | null
  inductedAt: string
  score: number
  metadata: unknown
}

export default function HallOfFameEntryDetailPage() {
  const params = useParams<{ leagueId: string; entryId: string }>()
  const leagueId = params?.leagueId ?? ""
  const entryId = params?.entryId ?? ""
  const [entry, setEntry] = useState<EntryDetail | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId || !entryId) return
    setLoading(true)
    setError(null)
    fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/hall-of-fame/entries/${encodeURIComponent(entryId)}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.entry) setEntry(data.entry)
        else setError("Entry not found")
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [leagueId, entryId])

  const tellStory = () => {
    if (!leagueId || !entryId) return
    setNarrative(null)
    setNarrativeLoading(true)
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/hall-of-fame/tell-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "entry", id: entryId }),
    })
      .then((r) => r.json())
      .then((data) => setNarrative(data?.narrative ?? "No explanation available."))
      .catch(() => setNarrative("Could not load explanation."))
      .finally(() => setNarrativeLoading(false))
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-white/50">Loading induction…</p>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="space-y-4 p-4">
        <Link
          href={`/app/league/${leagueId}`}
          className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to league
        </Link>
        <p className="text-red-300">{error ?? "Entry not found"}</p>
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
        <h1 className="text-lg font-bold text-white">{entry.title}</h1>
        <div className="text-xs text-zinc-400">
          {entry.category.replace(/_/g, " ")} · {entry.sport}
          {entry.season ? ` · ${entry.season}` : ""} · Score: {entry.score.toFixed(2)}
        </div>
        {entry.summary && (
          <p className="text-sm text-zinc-300">{entry.summary}</p>
        )}
        <p className="text-xs text-zinc-500">
          Inducted: {new Date(entry.inductedAt).toLocaleDateString()}
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
          {(entry.entityType === "MANAGER" || entry.entityType === "TEAM") && (
            <a
              href={`/app/league/${encodeURIComponent(leagueId)}/legacy/breakdown?entityType=${encodeURIComponent(entry.entityType)}&entityId=${encodeURIComponent(entry.entityId)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/25"
            >
              View legacy score
            </a>
          )}
        </div>

        {narrative && (
          <div className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300 border border-zinc-700">
            {narrative}
          </div>
        )}
      </div>
    </div>
  )
}
