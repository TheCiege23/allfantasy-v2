"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react"

interface RecordDetail {
  recordId: string
  leagueId: string
  sport: string
  recordType: string
  recordLabel: string
  holderId: string
  value: number
  season: string
  createdAt: string
}

export default function RecordBookDetailPage() {
  const params = useParams<{ leagueId: string; recordId: string }>()
  const leagueId = params?.leagueId ?? ""
  const recordId = params?.recordId ?? ""
  const [record, setRecord] = useState<RecordDetail | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId || !recordId) return
    setLoading(true)
    setError(null)
    fetch(
      `/api/leagues/${encodeURIComponent(leagueId)}/record-book/${encodeURIComponent(recordId)}`,
      { cache: "no-store" }
    )
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(data?.error ?? "Failed to load record")
        }
        return data
      })
      .then((data) => {
        if (data?.recordId) setRecord(data)
        else setError("Record not found")
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load record"))
      .finally(() => setLoading(false))
  }, [leagueId, recordId])

  const tellStory = () => {
    if (!leagueId || !recordId) return
    setNarrative(null)
    setNarrativeLoading(true)
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
      .then((data) => setNarrative(data?.narrative ?? "No explanation available."))
      .catch((e) =>
        setNarrative(e instanceof Error ? e.message : "Could not load explanation.")
      )
      .finally(() => setNarrativeLoading(false))
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-white/50">Loading record…</div>
      </div>
    )
  }
  if (error || !record) {
    return (
      <div className="p-4">
        <p className="text-red-200">{error ?? "Record not found"}</p>
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}?tab=Record%20Books`}
          className="mt-2 inline-flex items-center gap-1 text-cyan-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Record Books
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/app/league/${encodeURIComponent(leagueId)}?tab=Record%20Books`}
        className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Record Books
      </Link>
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-10 w-10 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white">{record.recordLabel}</h1>
            <p className="text-sm text-white/70">{record.season} · {record.sport}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-xs text-zinc-500">Holder</span>
            <p className="font-medium text-white">{record.holderId}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Value</span>
            <p className="font-mono text-emerald-400">{record.value}</p>
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
            disabled={narrativeLoading}
            onClick={tellStory}
          >
            <Sparkles className="h-4 w-4" /> {narrativeLoading ? "…" : "Why this record?"}
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
