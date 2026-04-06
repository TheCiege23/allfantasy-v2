'use client'

import { useCallback, useRef } from 'react'

export type LeagueCreatedIntroModalProps = {
  open: boolean
  leagueName: string
  videoUrl?: string
  onEnterLeague: () => void
}

/**
 * Post-create welcome: optional concept video, then commissioner enters the new league hub.
 */
export function LeagueCreatedIntroModal({
  open,
  leagueName,
  videoUrl,
  onEnterLeague,
}: LeagueCreatedIntroModalProps) {
  const endedRef = useRef(false)

  const handleEnded = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    onEnterLeague()
  }, [onEnterLeague])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/92 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="league-intro-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a1228] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.08)_inset]">
        <h2 id="league-intro-title" className="text-center text-lg font-semibold text-white">
          {leagueName}
        </h2>
        <p className="mt-1 text-center text-sm text-white/55">
          Here&apos;s a quick intro to your league hub. You can skip anytime.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {videoUrl ? (
            <video
              className="aspect-video w-full object-cover"
              src={videoUrl}
              controls
              playsInline
              autoPlay
              onEnded={handleEnded}
              data-testid="league-concept-intro-video"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-white/60">
              Welcome to your league. When concept videos are configured for your sport, they&apos;ll play here.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onEnterLeague}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 py-3 text-sm font-bold text-white shadow-lg transition hover:from-cyan-500 hover:to-sky-500"
          data-testid="league-intro-enter"
        >
          Enter league
        </button>
      </div>
    </div>
  )
}
