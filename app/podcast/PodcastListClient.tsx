"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Loader2 } from "lucide-react"
import { useUserTimezone } from "@/hooks/useUserTimezone"

type Episode = {
  id: string
  title: string
  createdAt: string
}

export default function PodcastListClient() {
  const { formatDateInTimezone } = useUserTimezone()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/podcast/episodes")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to load")
        return
      }
      setEpisodes(data.episodes ?? [])
    } catch {
      setError("Failed to load episodes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/podcast/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to generate")
        return
      }
      setEpisodes((prev) => [{ id: data.id, title: data.title, createdAt: data.createdAt }, ...prev])
      window.location.href = `/podcast/${data.id}`
    } catch {
      setError("Failed to generate podcast")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-8 py-12 text-center text-white/50">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        Loading...
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Generate new podcast
          </>
        )}
      </button>

      {episodes.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
          <p>No episodes yet. Click &quot;Generate new podcast&quot; to create one.</p>
        </div>
      )}

      <ul className="space-y-2">
        {episodes.map((ep) => (
          <li key={ep.id}>
            <Link
              href={`/podcast/${ep.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
            >
              <p className="font-medium text-white">{ep.title}</p>
              <p className="text-xs text-white/50 mt-0.5">
                {formatDateInTimezone(ep.createdAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
