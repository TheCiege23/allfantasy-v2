'use client'

import { Sparkles } from 'lucide-react'
import type { MatchupPlayerSlot } from '@/lib/matchup-center/types'

function PlayerCell({ side, align }: { side: MatchupPlayerSlot; align: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
        {side.headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.headshotUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/35">
            {side.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div
          className={`flex items-center gap-1 truncate text-[12px] font-semibold text-white ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}
        >
          {side.aiInsight ? (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded border border-violet-400/30 bg-violet-500/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-100/90"
              title={side.aiInsight}
            >
              <Sparkles className="h-2.5 w-2.5" />
              AI
            </span>
          ) : null}
          <span className="truncate">{side.name}</span>
        </div>
        <div className={`truncate text-[10px] text-white/45 ${align === 'right' ? 'text-right' : ''}`}>
          {side.opponent ? `${side.team ?? '—'} vs ${side.opponent}` : (side.team ?? '—')} · {side.gameLabel}
          {side.gameStatus === 'live' ? ' · Live' : side.gameStatus === 'final' ? ' · Final' : ''}
        </div>
        {side.newsBlurb ? (
          <div className={`truncate text-[9px] text-white/35 ${align === 'right' ? 'text-right' : ''}`}>{side.newsBlurb}</div>
        ) : null}
        {side.aiInsight ? (
          <div className={`truncate text-[9px] text-cyan-200/70 ${align === 'right' ? 'text-right' : ''}`}>{side.aiInsight}</div>
        ) : null}
        <div className={`mt-0.5 flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
          {side.injuryStatus ? (
            <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-semibold text-amber-100/90">
              {side.injuryStatus}
            </span>
          ) : null}
          {side.weatherSummary ? (
            <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[9px] text-sky-100/90">{side.weatherSummary}</span>
          ) : null}
        </div>
      </div>
      <div className={`shrink-0 text-right ${align === 'right' ? 'text-left' : ''}`}>
        <div className="text-sm font-bold tabular-nums text-white">{side.currentPoints.toFixed(1)}</div>
        <div className="text-[10px] text-white/40">Proj {side.projectedPoints.toFixed(1)}</div>
      </div>
    </div>
  )
}

export function MatchupStarterRow({
  position,
  left,
  right,
  onStartSit,
}: {
  position: string
  left: MatchupPlayerSlot | null
  right: MatchupPlayerSlot | null
  /** Opens AI start/sit for this positional pairing when both sides exist. */
  onStartSit?: (a: MatchupPlayerSlot, b: MatchupPlayerSlot) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-white/[0.06] py-2.5">
      {left ? <PlayerCell side={left} align="left" /> : <div className="opacity-40" />}
      <div className="flex flex-col items-center gap-1 px-1">
        <span className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100/95">
          {position}
        </span>
        {left && right && onStartSit ? (
          <button
            type="button"
            data-testid="matchup-start-sit-row"
            onClick={() => onStartSit(left, right)}
            className="rounded-md border border-violet-400/35 bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-100/95 hover:bg-violet-500/20"
          >
            Start/Sit
          </button>
        ) : null}
      </div>
      {right ? <PlayerCell side={right} align="right" /> : <div className="opacity-40" />}
    </div>
  )
}
