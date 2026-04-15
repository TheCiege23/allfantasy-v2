'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export type LeagueClipPayload = {
  id: string
  clipUrl: string
  clipType: string
  title?: string
  durationMs?: number
  reducedMotion?: boolean
  displayMode?: 'fullscreen' | 'inline'
  /** Visual accent for concept leagues */
  accent?: 'zombie' | 'survivor'
}

type Props = {
  open: boolean
  payload: LeagueClipPayload | null
  onClose: () => void
}

export function LeagueClipOverlay({ open, payload, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open || !payload) return
    const ms = Math.min(Math.max(payload.durationMs ?? 12_000, 4000), 120_000)
    if (payload.reducedMotion) {
      closeTimer.current = setTimeout(onClose, Math.min(ms, 8000))
      return () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
      }
    }
    closeTimer.current = setTimeout(onClose, ms)
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [open, payload, onClose])

  useEffect(() => {
    if (!open || !payload?.reducedMotion) return
    const v = videoRef.current
    if (v) {
      v.pause()
    }
  }, [open, payload])

  if (!open || !payload) return null

  const isVideo = payload.clipType === 'video' && !payload.reducedMotion
  const isImage = payload.clipType === 'image' && !payload.reducedMotion
  const accent =
    payload.accent === 'survivor'
      ? 'border-amber-500/25 shadow-amber-900/20'
      : payload.accent === 'zombie'
        ? 'border-violet-500/25 shadow-violet-900/25'
        : 'border-white/12 shadow-black/40'

  const shell =
    payload.displayMode === 'inline'
      ? 'fixed bottom-6 right-6 z-[96] w-[min(100vw-1.5rem,420px)] max-h-[min(72vh,520px)]'
      : 'fixed inset-0 z-[96] flex items-center justify-center p-4 sm:p-8'

  return (
    <div className={shell} role="dialog" aria-modal="true" aria-label={payload.title ?? 'League moment'}>
      <button
        type="button"
        className={
          payload.displayMode === 'inline'
            ? 'pointer-events-none absolute inset-0 z-0 bg-transparent'
            : 'absolute inset-0 z-0 bg-black/82 backdrop-blur-[2px]'
        }
        aria-hidden={payload.displayMode === 'inline'}
        tabIndex={payload.displayMode === 'inline' ? -1 : 0}
        onClick={payload.displayMode === 'inline' ? undefined : onClose}
      />

      <div
        className={`relative z-10 flex max-h-full w-full flex-col overflow-hidden rounded-2xl border bg-[#070b18] shadow-2xl ${accent} ${
          payload.displayMode === 'inline' ? '' : 'max-w-4xl'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <p className="truncate text-sm font-semibold text-white/90">{payload.title ?? 'League moment'}</p>
          <button
            type="button"
            data-testid="league-clip-overlay-close"
            onClick={onClose}
            className="inline-flex h-10 min-w-[40px] shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white/85 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/40">
          {payload.reducedMotion ? (
            <p className="px-6 py-16 text-center text-sm text-white/70">
              Motion reduced — showing title only. {payload.title ? ` ${payload.title}` : ''}
            </p>
          ) : isVideo ? (
            <video
              ref={videoRef}
              className="max-h-[min(72vh,560px)] w-full object-contain"
              src={payload.clipUrl}
              autoPlay
              muted
              playsInline
              controls={false}
            />
          ) : isImage ? (
            <img
              src={payload.clipUrl}
              alt={payload.title ?? ''}
              className="max-h-[min(72vh,560px)] w-full object-contain"
            />
          ) : (
            <p className="px-6 py-12 text-sm text-white/60">Unsupported clip type.</p>
          )}
        </div>
      </div>
    </div>
  )
}
