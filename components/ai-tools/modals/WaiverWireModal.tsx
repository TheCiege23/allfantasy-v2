'use client'

import { useMemo, useState } from 'react'
import { Target, Zap, Clock, Activity, Flame } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'
import type { UrgencyLevel } from '../types'

type WaiverPosition = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST' | 'K'

type WaiverPick = {
  rank: number
  name: string
  position: string
  team: string
  urgency: UrgencyLevel
  why: string
  faab: number
  trend: 'hot' | 'warming' | 'steady'
  injuryReplacement: boolean
}

const URGENCY_STYLES: Record<UrgencyLevel, { label: string; text: string; bg: string; bar: string }> = {
  critical: { label: 'Critical', text: 'text-red-200', bg: 'bg-red-500/15 border-red-500/30', bar: 'bg-red-400' },
  high: { label: 'High', text: 'text-amber-200', bg: 'bg-amber-500/15 border-amber-500/25', bar: 'bg-amber-400' },
  medium: { label: 'Medium', text: 'text-cyan-200', bg: 'bg-cyan-500/10 border-cyan-500/20', bar: 'bg-cyan-400' },
  low: { label: 'Low', text: 'text-white/60', bg: 'bg-white/[0.04] border-white/[0.08]', bar: 'bg-white/30' },
}

/**
 * Opportunistic signature: urgency-ordered pickups, each one looks like a
 * scout card — rank number, position tag, FAAB chip, trend badge, "why"
 * blurb, and an injury-replacement flag when relevant.
 *
 * TODO: wire to `/api/waivers/recommendations?leagueId=…` (or equivalent)
 * when ready. Replace `PLACEHOLDER_PICKS` with the fetched `picks` array.
 */
export function WaiverWireModal({
  open,
  onClose,
  leagueId: _leagueId,
  leagueName,
}: {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
}) {
  const [position, setPosition] = useState<WaiverPosition>('ALL')

  const picks = useMemo(() => {
    if (position === 'ALL') return PLACEHOLDER_PICKS
    if (position === 'FLEX') return PLACEHOLDER_PICKS.filter((p) => ['RB', 'WR', 'TE'].includes(p.position))
    return PLACEHOLDER_PICKS.filter((p) => p.position === position)
  }, [position])

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Waiver Wire"
      subtitle="Opportunity scanner"
      accentColor="emerald"
      icon={<Target className="h-5 w-5" />}
      chimmyPrompt={`What are my best waiver pickups for ${leagueName} this week?`}
    >
      {/* Hero: urgency summary */}
      <div className="mb-4 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] to-transparent px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">
          Opportunity Window · {leagueName}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-white/85">
          {countByUrgency(picks, 'critical') + countByUrgency(picks, 'high')} priority adds ·{' '}
          <span className="text-emerald-300">
            {Math.round(picks.reduce((sum, p) => sum + p.faab, 0) / Math.max(1, picks.length))}% FAAB avg
          </span>
        </p>
      </div>

      {/* Position filter */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white/[0.03] p-1">
        {(['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX'] as WaiverPosition[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPosition(p)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
              position === p ? 'bg-emerald-500/15 text-emerald-200' : 'text-white/35 hover:text-white/60'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Ranked list */}
      <div className="space-y-2">
        {picks.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-6 text-center text-[11px] text-white/40">
            No {position !== 'ALL' ? position : ''} targets match this week.
          </div>
        ) : (
          picks.map((pick) => <WaiverPickRow key={pick.rank} pick={pick} />)
        )}
      </div>
    </AIToolModalShell>
  )
}

// ── Pick row ─────────────────────────────────────────────────────────

function WaiverPickRow({ pick }: { pick: WaiverPick }) {
  const s = URGENCY_STYLES[pick.urgency]
  return (
    <div className={`rounded-xl border p-3 ${s.bg}`}>
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0b1020]/80 text-[13px] font-black text-white/80">
          {pick.rank}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-bold text-white/90">{pick.name}</p>
            {pick.trend === 'hot' ? (
              <Flame className="h-3 w-3 shrink-0 text-orange-400" />
            ) : pick.trend === 'warming' ? (
              <Activity className="h-3 w-3 shrink-0 text-amber-400" />
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
            <span className="font-bold text-white/60">{pick.position}</span>
            <span>·</span>
            <span>{pick.team}</span>
            {pick.injuryReplacement ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-red-300/80">
                  <Zap className="h-2.5 w-2.5" /> Injury replacement
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">{pick.why}</p>
        </div>

        {/* FAAB */}
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">FAAB</p>
          <p className={`text-[15px] font-black tabular-nums ${s.text}`}>{pick.faab}%</p>
        </div>
      </div>

      {/* Urgency bar */}
      <div className="mt-2.5 flex items-center gap-2">
        <Clock className="h-3 w-3 text-white/30" />
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${s.bar}`}
            style={{ width: urgencyWidth(pick.urgency) }}
          />
        </div>
        <span className={`text-[8px] font-bold uppercase tracking-widest ${s.text}`}>
          {s.label}
        </span>
      </div>
    </div>
  )
}

function urgencyWidth(u: UrgencyLevel): string {
  return u === 'critical' ? '95%' : u === 'high' ? '72%' : u === 'medium' ? '45%' : '20%'
}

function countByUrgency(picks: WaiverPick[], level: UrgencyLevel): number {
  return picks.filter((p) => p.urgency === level).length
}

// ── Placeholder data ────────────────────────────────────────────────
// Realistic-feeling targets with mixed positions, urgency, and trends.

const PLACEHOLDER_PICKS: WaiverPick[] = [
  {
    rank: 1,
    name: 'High-Upside RB2',
    position: 'RB',
    team: 'FA',
    urgency: 'critical',
    why: 'Moves into a lead-back role after the starter went to IR. Projected 15+ touches immediately.',
    faab: 34,
    trend: 'hot',
    injuryReplacement: true,
  },
  {
    rank: 2,
    name: 'Breakout WR3',
    position: 'WR',
    team: 'FA',
    urgency: 'high',
    why: 'Target share spiked to 27% over the last two weeks, with a plus matchup ahead.',
    faab: 22,
    trend: 'hot',
    injuryReplacement: false,
  },
  {
    rank: 3,
    name: 'Sneaky TE Stream',
    position: 'TE',
    team: 'FA',
    urgency: 'high',
    why: 'Weekly top-8 upside vs. a defense allowing the most TE fantasy points.',
    faab: 14,
    trend: 'warming',
    injuryReplacement: false,
  },
  {
    rank: 4,
    name: 'Deep League QB',
    position: 'QB',
    team: 'FA',
    urgency: 'medium',
    why: 'Two-week rush upside + favorable game script. Bench stash for superflex formats.',
    faab: 6,
    trend: 'steady',
    injuryReplacement: false,
  },
  {
    rank: 5,
    name: 'Defense Streamer',
    position: 'DST',
    team: 'FA',
    urgency: 'medium',
    why: 'Plus matchup vs. a turnover-prone offense. One-week add, drop after.',
    faab: 2,
    trend: 'steady',
    injuryReplacement: false,
  },
]
