'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { RoundOneAnnouncementQueueItem } from '@/lib/draft-room/resolvePickAnnouncementAssets'

export type RoundOneAnnouncementItem = RoundOneAnnouncementQueueItem

const AUTO_DISMISS_MS = 6200

export type DraftRoundOneAnnouncementOverlayProps = {
  presentationVariant?: 'default' | 'redraft_snake'
  leagueName?: string
  sportLabel?: string
  /** Queue: first item is visible */
  queue: RoundOneAnnouncementItem[]
  onDismissFront: () => void
}

export function DraftRoundOneAnnouncementOverlay({
  presentationVariant = 'default',
  leagueName,
  sportLabel,
  queue,
  onDismissFront,
}: DraftRoundOneAnnouncementOverlayProps) {
  const rs = presentationVariant === 'redraft_snake'
  const current = queue[0]
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!current) return
    setEntered(false)
    const id = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(id)
  }, [current?.id])

  useEffect(() => {
    if (!current) return
    const t = window.setTimeout(() => onDismissFront(), AUTO_DISMISS_MS)
    return () => window.clearTimeout(t)
  }, [current?.id, onDismissFront])

  if (!current) return null

  const { pick, headshotUrl, teamLogoUrl } = current
  const mgr = pick.displayName ?? 'Draft board'
  const subtitle = `${sportLabel ? `${sportLabel} · ` : ''}Round 1 · Pick ${pick.slot} · #${pick.overall} overall`

  return (
    <div
      className={`pointer-events-none fixed bottom-24 left-1/2 z-[95] w-[min(92vw,420px)] -translate-x-1/2 px-3 md:bottom-28 ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } transition-all duration-500 ease-out`}
      role="status"
      aria-live="polite"
      data-testid="draft-round-one-announcement"
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.07] backdrop-blur-md">
        <div
          className={`absolute inset-0 ${
            rs
              ? 'bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,23,42,0.94))]'
              : 'bg-[linear-gradient(135deg,rgba(13,24,41,0.94),rgba(7,15,28,0.96))]'
          }`}
        />
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
            rs ? 'bg-cyan-400/25' : 'bg-violet-500/20'
          }`}
        />
        <div className="relative flex gap-4 p-4">
          <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/40 shadow-inner">
            {headshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN URLs from live pool
              <img src={headshotUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-black/40 text-2xl font-black text-white/35">
                {pick.playerName.slice(0, 1)}
              </div>
            )}
            {teamLogoUrl ? (
              <div className="absolute bottom-1 right-1 h-8 w-8 overflow-hidden rounded-md border border-white/20 bg-black/60 p-0.5 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN URLs */}
                <img src={teamLogoUrl} alt="" className="h-full w-full object-contain" />
              </div>
            ) : pick.team ? (
              <div className="absolute bottom-1 right-1 rounded-md border border-white/15 bg-black/55 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/80">
                {pick.team}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 shrink-0 ${rs ? 'text-cyan-300' : 'text-violet-300'}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Round 1 selection</span>
              </div>
              <button
                type="button"
                onClick={onDismissFront}
                className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 truncate text-lg font-bold tracking-tight text-white">{pick.playerName}</p>
            <p className="mt-0.5 text-[13px] font-medium text-white/55">
              {pick.position}
              {pick.team ? ` · ${pick.team}` : ''}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-white/70">
              <span className="font-semibold text-cyan-100/95">{mgr}</span>
              <span className="text-white/40"> · </span>
              <span className="text-white/55">{subtitle}</span>
            </p>
            {leagueName ? (
              <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-white/35">{leagueName}</p>
            ) : null}
          </div>
        </div>

        {queue.length > 1 ? (
          <div className="border-t border-white/[0.06] bg-black/35 px-4 py-2 text-center text-[10px] font-medium text-white/40">
            +{queue.length - 1} more Round 1 pick{queue.length > 2 ? 's' : ''} queued
          </div>
        ) : null}
      </div>
    </div>
  )
}
