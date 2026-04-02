'use client'

import { useEffect } from 'react'

export type PlayerStatCardProps = {
  playerId: string
  leagueId: string
  sport: string
  onClose: () => void
}

/** Global player modal — expanded in LEAGUE_PAGE_TASK Step 11. */
export function PlayerStatCard({ playerId, leagueId, sport, onClose }: PlayerStatCardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="af-player-stat-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[580px] overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0c0c1e] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="af-player-stat-title" className="text-[10px] uppercase tracking-wider text-white/40">
              Player
            </p>
            <p className="mt-1 font-mono text-sm text-white/90">{playerId}</p>
            <p className="mt-2 text-xs text-white/45">
              League {leagueId} · {sport}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="mt-4 text-xs text-white/35">Full stats and tabs ship in Step 11.</p>
      </div>
    </div>
  )
}
