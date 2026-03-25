"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Play, Pause, Share2 } from "lucide-react"

type Props = {
  episodeId: string
  title: string
  script: string
  playbackUrl: string | null
  durationSeconds: number | null
}

function selectVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.find((v) => v.lang.toLowerCase().startsWith("en"))
  return en ?? voices[0] ?? null
}

export default function PodcastPlayerClient({
  episodeId,
  title,
  script,
  playbackUrl,
  durationSeconds,
}: Props) {
  const [playing, setPlaying] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/podcast/${episodeId}`
      : ""

  const handlePlay = () => {
    if (playbackUrl && typeof window !== "undefined" && audioRef.current) {
      const audio = audioRef.current
      if (playing) {
        audio.pause()
      } else {
        audio.play().catch(() => setShareError("Playback failed"))
      }
      setPlaying(!playing)
      return
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const synth = window.speechSynthesis
    synthRef.current = synth
    if (playing) {
      synth.cancel()
      setPlaying(false)
      return
    }
    const u = new SpeechSynthesisUtterance(script)
    u.rate = 0.95
    u.pitch = 1
    const voices = synth.getVoices()
    const v = selectVoice(voices)
    if (v) u.voice = v
    u.onend = () => setPlaying(false)
    u.onerror = () => setPlaying(false)
    synth.speak(u)
    setPlaying(true)
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length) return
      window.speechSynthesis.onvoiceschanged = () => {}
    }
  }, [])

  const handleShare = async () => {
    setShareError(null)
    setShareDone(false)
    try {
      if (navigator.share && navigator.canShare?.({ url: shareUrl })) {
        await navigator.share({
          title: title,
          text: `Fantasy podcast: ${title}`,
          url: shareUrl,
        })
        setShareDone(true)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareDone(true)
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setShareError("Share failed")
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/podcast" className="text-sm text-white/60 hover:text-white/80 transition">
        ← All episodes
      </Link>

      <h1 className="text-xl font-bold text-white">{title}</h1>

      {durationSeconds != null && (
        <p className="text-xs text-white/50">~{Math.ceil(durationSeconds / 60)} min</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handlePlay}
          data-testid="podcast-play-button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-600 transition"
          aria-label={playing ? "Pause podcast" : "Play podcast"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={handleShare}
          data-testid="podcast-share-button"
          className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
          aria-label="Share podcast"
        >
          <Share2 className="h-4 w-4" />
          {shareDone ? "Copied!" : "Share"}
        </button>
      </div>

      {shareError && (
        <p className="text-sm text-red-300" data-testid="podcast-share-error">{shareError}</p>
      )}

      {shareDone && !shareError && (
        <p className="text-xs text-emerald-300" data-testid="podcast-share-success">
          Share link ready.
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Script</p>
        <p className="text-sm text-white/80 whitespace-pre-wrap">{script}</p>
      </div>

      {playbackUrl && (
        <audio
          ref={audioRef}
          src={playbackUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </div>
  )
}
