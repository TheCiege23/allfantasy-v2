'use client'

import { Crown, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'
import type { Direction } from '../types'

type RankedTeam = {
  rank: number
  name: string
  record: string
  change: number // positive = moved up, negative = moved down
  direction: Direction
  blurb: string
  isYou?: boolean
}

/**
 * Editorial signature: top-to-bottom leaderboard with a "writer's blurb"
 * per team, a "you" spotlight card pinned at the top, and a biggest mover
 * callout. Feels like an editor's weekly column.
 *
 * TODO: wire to `/api/league/power-rankings?leagueId=…` when ready. UI
 * expects `{ rankings: RankedTeam[], myRank: number, commentary: string,
 * biggestRiser: RankedTeam, biggestFaller: RankedTeam }`.
 */
export function PowerRankingsModal({
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
  const rankings = PLACEHOLDER_RANKINGS
  const myTeam = rankings.find((t) => t.isYou)
  const biggestRiser = [...rankings].sort((a, b) => b.change - a.change)[0]
  const biggestFaller = [...rankings].sort((a, b) => a.change - b.change)[0]

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Power Rankings"
      subtitle="Editorial league intelligence"
      accentColor="violet"
      icon={<Crown className="h-5 w-5" />}
      chimmyPrompt={`Give me the power rankings for ${leagueName} with editorial commentary`}
    >
      {/* My team spotlight — pinned hero */}
      {myTeam ? (
        <div className="mb-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-purple-500/[0.04] px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/70">
              Your Team
            </p>
            <ChangeBadge change={myTeam.change} direction={myTeam.direction} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[28px] font-black tabular-nums text-white/95">#{myTeam.rank}</p>
            <p className="text-[13px] font-semibold text-white/80">{myTeam.name}</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/55">{myTeam.blurb}</p>
        </div>
      ) : null}

      {/* Biggest movers row */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <MoverCard label="Biggest Riser" team={biggestRiser} tone="up" />
        <MoverCard label="Biggest Faller" team={biggestFaller} tone="down" />
      </div>

      {/* Leaderboard */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
        League Standings
      </p>
      <div className="space-y-1.5">
        {rankings.map((team) => (
          <RankedTeamRow key={team.rank} team={team} />
        ))}
      </div>

      {/* Editorial commentary */}
      <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.03] px-4 py-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-violet-300/70">
          Week in Review
        </p>
        <p className="text-[12px] leading-relaxed text-white/65">
          The top tier stayed firm this week, but the middle of the league reshuffled hard — three
          teams swapped spots on the back of one brutal head-to-head upset. Injury news at RB is
          reshaping the contender landscape faster than the trade deadline.
        </p>
      </div>
    </AIToolModalShell>
  )
}

// ── Team row ─────────────────────────────────────────────────────────

function RankedTeamRow({ team }: { team: RankedTeam }) {
  const youCls = team.isYou
    ? 'border-violet-500/25 bg-violet-500/[0.05]'
    : 'border-white/[0.06] bg-white/[0.02]'
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${youCls}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-black ${
          team.rank <= 3
            ? 'bg-amber-500/15 text-amber-300'
            : 'bg-white/[0.04] text-white/60'
        }`}
      >
        {team.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12px] font-bold text-white/85">{team.name}</p>
          {team.isYou ? (
            <span className="rounded bg-violet-500/20 px-1 text-[8px] font-bold uppercase tracking-widest text-violet-200">
              You
            </span>
          ) : null}
        </div>
        <p className="truncate text-[10px] text-white/40">
          {team.record} · {team.blurb}
        </p>
      </div>
      <ChangeBadge change={team.change} direction={team.direction} />
    </div>
  )
}

function ChangeBadge({ change, direction }: { change: number; direction: Direction }) {
  const cls =
    direction === 'up'
      ? 'text-emerald-300 bg-emerald-500/10'
      : direction === 'down'
        ? 'text-red-300 bg-red-500/10'
        : 'text-white/35 bg-white/[0.04]'
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {change !== 0 ? Math.abs(change) : '—'}
    </div>
  )
}

function MoverCard({
  label,
  team,
  tone,
}: {
  label: string
  team: RankedTeam | undefined
  tone: 'up' | 'down'
}) {
  if (!team) return null
  const cls =
    tone === 'up'
      ? 'border-emerald-500/15 bg-emerald-500/[0.04]'
      : 'border-red-500/15 bg-red-500/[0.04]'
  const textCls = tone === 'up' ? 'text-emerald-300' : 'text-red-300'
  const Icon = tone === 'up' ? TrendingUp : TrendingDown
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${textCls}`} />
        <p className={`text-[8px] font-bold uppercase tracking-widest ${textCls}`}>{label}</p>
      </div>
      <p className="mt-1 truncate text-[12px] font-bold text-white/85">{team.name}</p>
      <p className={`text-[9px] font-bold tabular-nums ${textCls}`}>
        {team.change > 0 ? '+' : ''}
        {team.change} spots
      </p>
    </div>
  )
}

// ── Placeholder data ────────────────────────────────────────────────

const PLACEHOLDER_RANKINGS: RankedTeam[] = [
  { rank: 1, name: 'The Juggernaut', record: '9-1', change: 0, direction: 'flat', blurb: 'Still the team to beat.' },
  { rank: 2, name: 'Playoff Pushers', record: '8-2', change: 1, direction: 'up', blurb: 'Hot streak continues.' },
  { rank: 3, name: 'Balanced Attack', record: '7-3', change: -1, direction: 'down', blurb: 'RB depth catching up.' },
  { rank: 4, name: 'Your Team', record: '6-4', change: 2, direction: 'up', blurb: 'Waiver adds finally clicking.', isYou: true },
  { rank: 5, name: 'Underdogs', record: '6-4', change: 0, direction: 'flat', blurb: 'Quietly consistent.' },
  { rank: 6, name: 'Inconsistent', record: '5-5', change: -3, direction: 'down', blurb: 'Trade deadline panic mode.' },
  { rank: 7, name: 'Rebuilders', record: '4-6', change: 1, direction: 'up', blurb: 'Youth movement paying off.' },
  { rank: 8, name: 'Dumpster Fire', record: '2-8', change: 0, direction: 'flat', blurb: 'Tanking for picks.' },
]
