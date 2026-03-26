"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Share2, RefreshCw, Loader2, Play, Pause } from "lucide-react"

type PublishLog = {
  id: string
  destinationType: string
  status: string
  createdAt: string
}

type Props = {
  episodeId: string
  title: string
  script: string
  status: string
  playbackUrl: string | null
}

export default function FantasyMediaPlayerClient({
  episodeId,
  title,
  script,
  status: initialStatus,
  playbackUrl: initialPlaybackUrl,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(initialPlaybackUrl)
  const [shareDone, setShareDone] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishStatusMessage, setPublishStatusMessage] = useState<string | null>(null)
  const [publishLogs, setPublishLogs] = useState<PublishLog[]>([])

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/fantasy-media/${episodeId}` : ""

  useEffect(() => {
    if (status !== "generating") return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/fantasy-media/episodes/${episodeId}/status`)
        const data = await res.json()
        if (data.status) setStatus(data.status)
        if (data.playbackUrl) setPlaybackUrl(data.playbackUrl)
      } catch {
        // keep polling
      }
    }, 5000)
    return () => clearInterval(t)
  }, [episodeId, status])

  const handleRefreshStatus = async () => {
    try {
      const res = await fetch(`/api/fantasy-media/episodes/${episodeId}/status`)
      const data = await res.json()
      if (data.status) setStatus(data.status)
      if (data.playbackUrl) setPlaybackUrl(data.playbackUrl)
    } catch {
      // ignore
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const res = await fetch(`/api/fantasy-media/episodes/${episodeId}/retry`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus(data.status ?? "generating")
        setPlaybackUrl(null)
      }
    } finally {
      setRetrying(false)
    }
  }

  const handlePlaybackToggle = () => {
    const video = document.querySelector<HTMLVideoElement>(`video[data-episode-id="${episodeId}"]`)
    if (!video) return
    if (video.paused) {
      void video.play()
      setVideoPlaying(true)
    } else {
      video.pause()
      setVideoPlaying(false)
    }
  }

  const handleShare = async () => {
    setShareError(null)
    setShareDone(false)
    try {
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ url: shareUrl })) {
        await navigator.share({
          title,
          text: `Fantasy video: ${title}`,
          url: shareUrl,
        })
        setShareDone(true)
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setShareDone(true)
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== "AbortError") setShareError("Share failed")
    }
  }

  const canPlay = status === "completed" && playbackUrl

  const fetchPublishLogs = async () => {
    try {
      const res = await fetch(`/api/fantasy-media/episodes/${episodeId}/publish-logs`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setPublishLogs(Array.isArray(data.logs) ? data.logs : [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!episodeId) return
    void fetchPublishLogs()
  }, [episodeId])

  const handlePublish = async () => {
    setPublishing(true)
    setPublishStatusMessage(null)
    try {
      const res = await fetch(`/api/fantasy-media/episodes/${episodeId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationType: "x" }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const status = String(data.status ?? "pending")
        const message = String(data.message ?? "Publish requested")
        setPublishStatusMessage(`${status}: ${message}`)
        await fetchPublishLogs()
      } else {
        setPublishStatusMessage(String(data.error ?? "Publish failed"))
      }
    } catch {
      setPublishStatusMessage("Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/fantasy-media"
        className="text-sm text-white/60 hover:text-white/80 transition"
        data-testid="fantasy-media-back-button"
        data-audit="back-button"
      >
        ← All videos
      </Link>

      <h1 className="text-xl font-bold text-white">{title}</h1>

      <p className="text-xs text-white/50">
        Status: <span className="capitalize">{status}</span>
      </p>

      {status === "generating" && (
        <div
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200"
          data-testid="fantasy-media-status-generating"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Video is being generated by HeyGen. This may take a few minutes.
        </div>
      )}

      {status === "failed" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Video generation failed. You can try again from the list.
        </div>
      )}

      {canPlay && (
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <video
            src={playbackUrl}
            controls
            playsInline
            className="w-full aspect-video"
            preload="metadata"
            data-testid="fantasy-media-video-player"
            data-episode-id={episodeId}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
          >
            Your browser does not support video playback.
          </video>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {status === "generating" && (
          <button
            type="button"
            onClick={handleRefreshStatus}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            aria-label="Refresh status"
            data-testid="fantasy-media-refresh-status-button"
            data-audit="refresh-status-button"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh status
          </button>
        )}
        {status === "failed" && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
            data-testid="fantasy-media-retry-button"
            data-audit="generate-retry-button"
          >
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {retrying ? "Retrying..." : "Retry generation"}
          </button>
        )}
        {canPlay && (
          <button
            type="button"
            onClick={handlePlaybackToggle}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            data-testid="fantasy-media-playback-button"
            data-audit="playback-button"
          >
            {videoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {videoPlaying ? "Pause playback" : "Play playback"}
          </button>
        )}
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
          aria-label="Share or copy link"
          data-testid="fantasy-media-copy-share-button"
          data-audit="copy-share-button"
        >
          <Share2 className="h-4 w-4" />
          {shareDone ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition disabled:opacity-50"
          data-testid="fantasy-media-publish-button"
          data-audit="publish-button"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>

      {shareError && <p className="text-sm text-red-300">{shareError}</p>}
      {publishStatusMessage && (
        <p className="text-sm text-cyan-200" data-testid="fantasy-media-publish-status">
          {publishStatusMessage}
        </p>
      )}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Publish logs</p>
          <button
            type="button"
            onClick={fetchPublishLogs}
            className="text-xs text-white/60 hover:text-white/85"
            data-testid="fantasy-media-refresh-publish-logs-button"
          >
            Refresh
          </button>
        </div>
        {publishLogs.length === 0 ? (
          <p className="text-xs text-white/45">No publish logs yet.</p>
        ) : (
          <ul className="space-y-1">
            {publishLogs.map((log) => (
              <li
                key={log.id}
                className="text-xs text-white/70"
                data-testid={`fantasy-media-publish-log-${log.id}`}
              >
                {log.destinationType} · {log.status}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Script</p>
        <p className="text-sm text-white/80 whitespace-pre-wrap">{script}</p>
      </div>
    </div>
  )
}
