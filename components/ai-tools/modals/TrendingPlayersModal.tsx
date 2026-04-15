'use client'

import { Flame, TrendingUp, TrendingDown, Snowflake } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'
import type { Direction } from '../types'

type TrendRow = {
  name: string
  position: string
  team: string
  movement: number // positive = rising value, negative = falling
  direction: Direction
  tag: string // short reason like "Target share +8%"
}

/**
 * Market-driven signature: two-column risers/fallers split, each row a
 * "ticker" with a value-movement badge and a one-tag reason. Feels like a
 * sports market feed.
 *
 * TODO: wire to `/api/trending/players?sport=…` when available. The UI
 * expects `{ risers: TrendRow[], fallers: TrendRow[] }`.
 */
export function TrendingPlayersModal({
  open,
  onClose,
  sport,
}: {
  open: boolean
  onClose: () => void
  sport: string
}) {
  const risers = PLACEHOLDER_RISERS
  const fallers = PLACEHOLDER_FALLERS

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Trending"
      subtitle="Market movement board"
      accentColor="amber"
      icon={<Flame className="h-5 w-5" />}
      chimmyPrompt={`Tell me about the hottest and coldest ${sport} players this week`}
    >
      {/* Market pulse hero */}
      <div className="mb-4 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.06] to-transparent px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300/70">
          {sport} Market Pulse
        </p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-[13px] font-semibold text-white/85">
            {risers.length} risers · {fallers.length} fallers
          </p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">
            Last 7 days
          </p>
        </div>
      </div>

      {/* Two-column board */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Risers column */}
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3">
          <div className="mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">
              Risers
            </p>
          </div>
          <div className="space-y-2">
            {risers.map((r, i) => (
              <TrendRowCard key={i} row={r} accent="emerald" />
            ))}
          </div>
        </div>

        {/* Fallers column */}
        <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3">
          <div className="mb-3 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-red-300">
              Fallers
            </p>
          </div>
          <div className="space-y-2">
            {fallers.map((r, i) => (
              <TrendRowCard key={i} row={r} accent="red" />
            ))}
          </div>
        </div>
      </div>

      {/* Market commentary */}
      <div className="mt-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] px-4 py-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-amber-300/70">
          Market Read
        </p>
        <p className="text-[12px] leading-relaxed text-white/65">
          Usage-driven risers dominate this week — target share spikes and red-zone carries are
          driving the biggest value jumps. The fallers column is mostly injury-adjacent and committee
          backfield noise.
        </p>
      </div>
    </AIToolModalShell>
  )
}

// ── Row card ─────────────────────────────────────────────────────────

function TrendRowCard({ row, accent }: { row: TrendRow; accent: 'emerald' | 'red' }) {
  const Arrow =
    row.direction === 'up' ? TrendingUp : row.direction === 'down' ? TrendingDown : Snowflake
  const arrowCls = accent === 'emerald' ? 'text-emerald-400' : 'text-red-400'
  const valueCls = accent === 'emerald' ? 'text-emerald-300' : 'text-red-300'
  const sign = row.movement > 0 ? '+' : ''
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0b1020]/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-white/85">{row.name}</p>
          <p className="truncate text-[9px] text-white/35">
            {row.position} · {row.team}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Arrow className={`h-3 w-3 ${arrowCls}`} />
          <span className={`text-[11px] font-black tabular-nums ${valueCls}`}>
            {sign}
            {row.movement}
          </span>
        </div>
      </div>
      <p className="mt-1 line-clamp-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[8px] font-semibold text-white/50">
        {row.tag}
      </p>
    </div>
  )
}

// ── Placeholder data ────────────────────────────────────────────────

const PLACEHOLDER_RISERS: TrendRow[] = [
  { name: 'Usage Spike RB', position: 'RB', team: 'FA', movement: 18, direction: 'up', tag: 'Touches +7/gm' },
  { name: 'Target Monster WR', position: 'WR', team: 'FA', movement: 14, direction: 'up', tag: 'Target share 29%' },
  { name: 'Red-Zone TE', position: 'TE', team: 'FA', movement: 11, direction: 'up', tag: 'RZ looks +4' },
  { name: 'Breakout Rookie', position: 'WR', team: 'FA', movement: 9, direction: 'up', tag: 'Snaps 82%' },
  { name: 'Stream QB', position: 'QB', team: 'FA', movement: 7, direction: 'up', tag: 'Rushing floor' },
]

const PLACEHOLDER_FALLERS: TrendRow[] = [
  { name: 'Committee Back', position: 'RB', team: 'FA', movement: -15, direction: 'down', tag: 'Touch share -30%' },
  { name: 'Phased-Out WR', position: 'WR', team: 'FA', movement: -12, direction: 'down', tag: 'Targets -6/gm' },
  { name: 'Injury Questionable', position: 'WR', team: 'FA', movement: -9, direction: 'down', tag: 'Q status' },
  { name: 'Matchup-Proof TE', position: 'TE', team: 'FA', movement: -7, direction: 'down', tag: 'Tough D stretch' },
]
