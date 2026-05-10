'use client'

import { SkipForward, X } from 'lucide-react'

type ConceptIntroVideoOverlayProps = {
  open: boolean
  conceptLabel: string
  videoSrc: string
  posterSrc?: string | null
  onDismiss: () => void
}

export function ConceptIntroVideoOverlay({
  open,
  conceptLabel,
  videoSrc,
  posterSrc = null,
  onDismiss,
}: ConceptIntroVideoOverlayProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/95 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={`${conceptLabel} intro video`}
      data-testid="concept-intro-overlay"
    >
      <div className="relative w-full max-w-5xl px-4">
        <div className="flex items-center justify-between pb-2 text-white/85">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">
            Welcome to {conceptLabel}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/85 hover:bg-white/10"
              data-testid="concept-intro-skip"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip intro
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close intro"
              className="rounded-lg border border-white/20 bg-white/5 p-1.5 text-white/65 hover:bg-white/10"
              data-testid="concept-intro-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <video
          src={videoSrc}
          poster={posterSrc ?? undefined}
          autoPlay
          muted
          playsInline
          controls
          onEnded={onDismiss}
          onError={onDismiss}
          className="aspect-video w-full rounded-xl border border-white/15 bg-black shadow-2xl"
          data-testid="concept-intro-video"
        />
        <p className="pt-2 text-center text-[10px] text-white/45">
          This intro plays once. Skip or wait for it to finish.
        </p>
      </div>
    </div>
  )
}
