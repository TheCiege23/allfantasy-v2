"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Loader2, Video, RefreshCw } from "lucide-react"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { MEDIA_TYPES } from "@/lib/fantasy-media/types"
import { useUserTimezone } from "@/hooks/useUserTimezone"

type Episode = {
  id: string
  sport: string
  leagueId: string | null
  mediaType: string
  title: string
  status: string
  playbackUrl: string | null
  provider: string | null
  createdAt: string
  updatedAt: string
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  weekly_recap: "Weekly recap",
  waiver_targets: "Waiver targets",
  league_recap: "League recap",
  player_spotlight: "Player spotlight",
  matchup_preview: "Matchup preview",
  playoff_preview: "Playoff preview",
  playoff_recap: "Playoff recap",
  championship_recap: "Championship recap",
  trade_reaction: "Trade reaction",
  sport_specific_content: "Sport-specific content",
}

interface FantasyMediaListClientProps {
  onEpisodeCreated?: (episodeId: string) => void
}

export default function FantasyMediaListClient({ onEpisodeCreated }: FantasyMediaListClientProps) {
  const { formatInTimezone } = useUserTimezone()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0] ?? "NFL")
  const [contentType, setContentType] = useState<string>("weekly_recap")
  const [leagueName, setLeagueName] = useState("")
  const [previewScript, setPreviewScript] = useState<string | null>(null)
  const [editableScript, setEditableScript] = useState("")
  const [editingScript, setEditingScript] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (sport) params.set("sport", sport)
      const res = await fetch(`/api/fantasy-media/episodes?${params}`)
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

  const handlePreviewScript = async () => {
    setPreviewLoading(true)
    setPreviewScript(null)
    setError(null)
    try {
      const res = await fetch("/api/fantasy-media/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          contentType,
          leagueName: leagueName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to generate script")
        return
      }
      setPreviewScript(data.script ?? "")
      setEditableScript(data.script ?? "")
      setEditingScript(false)
    } catch {
      setError("Failed to generate script")
    } finally {
      setPreviewLoading(false)
    }
  }

  const runGenerate = async (overrideContentType?: string) => {
    const type = overrideContentType ?? contentType
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/fantasy-media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          contentType: type,
          leagueName: leagueName || undefined,
          script: editingScript && editableScript.trim().length > 0 ? editableScript : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to generate video")
        return
      }
      setEpisodes((prev) => [
        {
          id: data.id,
          title: data.title,
          sport: sport,
          leagueId: null,
          mediaType: type,
          status: data.status ?? "generating",
          playbackUrl: null,
          provider: "heygen",
          createdAt: data.createdAt,
          updatedAt: data.createdAt,
        },
        ...prev,
      ])
      if (onEpisodeCreated) {
        onEpisodeCreated(data.id)
      } else {
        window.location.href = `/fantasy-media/${data.id}`
      }
    } catch {
      setError("Failed to generate video")
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateVideo = () => runGenerate()
  const handleGenerateWeeklyRecap = () => runGenerate("weekly_recap")
  const handleGenerateWaiverVideo = () => runGenerate("waiver_targets")

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">Generate video</h2>
        <div className="grid gap-3">
          <label className="block text-xs text-white/60">Sport</label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
            data-testid="fantasy-media-sport-selector"
            data-audit="sport-selector"
          >
            {SUPPORTED_SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="block text-xs text-white/60">Content type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
            data-testid="fantasy-media-content-type-selector"
          >
            {MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>{MEDIA_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
          <label className="block text-xs text-white/60">League name (optional)</label>
          <input
            type="text"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="My League"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white placeholder:text-white/40"
            data-testid="fantasy-media-league-selector"
            data-audit="league-selector"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={handlePreviewScript}
            disabled={previewLoading}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            data-testid="fantasy-media-preview-script-button"
            data-audit="preview-script-button"
          >
            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Preview script
          </button>
          <button
            type="button"
            onClick={() => {
              if (previewScript == null) {
                const seededScript = editableScript || "Intro. Add your custom fantasy recap script here."
                setPreviewScript(seededScript)
                setEditableScript(seededScript)
              }
              setEditingScript((prev) => !prev)
            }}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            data-testid="fantasy-media-edit-script-button"
            data-audit="edit-script-button"
          >
            {editingScript ? "Stop editing script" : "Edit script"}
          </button>
          <button
            type="button"
            onClick={handleGenerateVideo}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
            data-testid="fantasy-media-generate-video-button"
            data-audit="generate-video-button"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span data-testid="fantasy-media-generate-loading-state">Sending to HeyGen…</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Generate video
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleGenerateWeeklyRecap}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
            data-testid="fantasy-media-generate-weekly-recap-button"
            data-audit="generate-weekly-recap-button"
          >
            Generate weekly recap
          </button>
          <button
            type="button"
            onClick={handleGenerateWaiverVideo}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
            data-testid="fantasy-media-generate-waiver-video-button"
            data-audit="generate-waiver-video-button"
          >
            Generate waiver video
          </button>
          <button
            type="button"
            onClick={handleGenerateVideo}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
            data-testid="fantasy-media-send-to-heygen-button"
            data-audit="send-to-heygen-button"
          >
            Send to HeyGen
          </button>
        </div>
        {previewScript != null && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 mt-2">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Script preview</p>
            {editingScript ? (
              <textarea
                value={editableScript}
                onChange={(e) => setEditableScript(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white/90"
                data-testid="fantasy-media-edit-script-textarea"
              />
            ) : (
              <p className="text-sm text-white/80 whitespace-pre-wrap">{previewScript}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Your episodes</h2>
        <button
          type="button"
          onClick={fetchList}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-50"
          aria-label="Refresh list"
          data-testid="fantasy-media-refresh-list-button"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-white/50">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading…
        </div>
      ) : episodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
          <p>No video episodes yet. Pick sport and content type, then click &quot;Generate video&quot;.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <Link
                href={`/fantasy-media/${ep.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                data-testid={`fantasy-media-episode-row-${ep.id}`}
              >
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-white/50" />
                  <p className="font-medium text-white">{ep.title}</p>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  {ep.sport} · {MEDIA_TYPE_LABELS[ep.mediaType] ?? ep.mediaType} · {ep.status}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {formatInTimezone(ep.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
