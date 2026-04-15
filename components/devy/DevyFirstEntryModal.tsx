'use client'

import { useState, useEffect, useCallback } from 'react'

const DEVY_INTRO_VIDEO = '/league-type-devy-intro.mp4'
const STORAGE_KEY_PREFIX = 'devy_intro_seen_'

const DEVY_TAGLINE = 'Draft the future. Dynasty starts in college.'

const DEVY_WELCOME =
  'Devy Dynasty is a dynasty-only format where you draft and stash college players alongside your pro roster. ' +
  'Build your pipeline years in advance — when they graduate and get drafted to the pros, they promote to your active roster. ' +
  'Three separate drafts: startup veterans, annual rookie, and annual devy.'

const DEVY_TIPS = [
  'Devy slots hold college players who haven\u2019t been drafted to the pros yet.',
  'Taxi squad stashes young pro players without using a bench spot.',
  'Three draft types: startup vet (once), annual rookie, and annual devy.',
  'When a devy player declares and gets drafted, they promote to your pro roster.',
  'Promotion timing depends on your league settings \u2014 immediate, rollover, or manager choice.',
  'College players in devy slots do NOT score fantasy points until promoted.',
  'Draft capital matters \u2014 devy picks and rookie picks are both tradeable assets.',
  'NFL devy pools NCAA football (QB, RB, WR, TE). NBA devy pools NCAA basketball (G, F, C).',
]

export interface DevyFirstEntryModalProps {
  leagueId: string
  userId: string
  enabled: boolean
  onClose: () => void
  videoSrc?: string
  forceReplay?: boolean
}

export function DevyFirstEntryModal({
  leagueId,
  userId,
  enabled,
  onClose,
  videoSrc = DEVY_INTRO_VIDEO,
  forceReplay = false,
}: DevyFirstEntryModalProps) {
  const [visible, setVisible] = useState(false)
  const [videoKey, setVideoKey] = useState(0)
  const [videoFailed, setVideoFailed] = useState(false)

  const storageKey = `${STORAGE_KEY_PREFIX}${leagueId}_${userId}`

  const markSeen = useCallback(() => {
    if (typeof window !== 'undefined' && leagueId && userId) {
      try { window.localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    }
  }, [leagueId, userId, storageKey])

  const handleDismiss = useCallback(() => {
    markSeen()
    setVisible(false)
    onClose()
  }, [markSeen, onClose])

  const handleReplay = useCallback(() => {
    setVideoFailed(false)
    setVideoKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !leagueId || !userId) { setVisible(false); return }
    if (forceReplay) { setVisible(true); return }
    try {
      const seen = typeof window !== 'undefined' && window.localStorage.getItem(storageKey)
      setVisible(!seen)
    } catch { setVisible(true) }
  }, [enabled, leagueId, userId, storageKey, forceReplay])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Devy Dynasty intro"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-violet-500/25 bg-[#050a14] shadow-2xl">
        <div className="border-b border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-indigo-950/20 to-transparent px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-950/40 text-lg">
              <span role="img" aria-label="crystal ball">&#128302;</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-violet-100">Devy Dynasty</p>
              <p className="text-[11px] text-white/50">{DEVY_TAGLINE}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/50">{DEVY_WELCOME}</p>
        </div>

        {!videoFailed ? (
          <video
            key={videoKey}
            className="aspect-video w-full bg-black"
            src={videoSrc}
            controls
            autoPlay
            muted
            playsInline
            onError={() => setVideoFailed(true)}
            onEnded={handleDismiss}
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center bg-gradient-to-b from-[#030816] to-[#0a0520] px-6 text-center">
            <div className="mb-3 text-5xl">&#128302;</div>
            <p className="text-sm font-semibold text-violet-200">Devy Dynasty</p>
            <p className="mt-1 text-xs text-white/50">Startup / Rookie / Devy Drafts</p>
            <p className="mt-3 text-[11px] text-white/40">
              Intro video not found. Add it at{' '}
              <span className="font-mono text-violet-300/70">public/league-type-devy-intro.mp4</span>
            </p>
          </div>
        )}

        <div className="max-h-[28vh] overflow-y-auto border-t border-white/[0.06] bg-[#040914] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">How devy works</p>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-white/55">
            {DEVY_TIPS.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-violet-400/90" aria-hidden>&#8226;</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.04] p-4">
          <button type="button" onClick={handleReplay} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10">
            Replay
          </button>
          <button type="button" onClick={handleDismiss} className="rounded-lg bg-violet-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600" data-testid="devy-intro-continue">
            Build the pipeline
          </button>
        </div>
      </div>
    </div>
  )
}
