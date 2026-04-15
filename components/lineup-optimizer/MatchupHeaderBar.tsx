'use client'

import { cn } from '@/lib/utils'
import type { MatchupHeaderModel } from './types'

export function MatchupHeaderBar({ model }: { model: MatchupHeaderModel }) {
  const winPct = Math.round(model.winProbability * 100)
  const barLeft = model.winProbability >= 0.5

  return (
    <section
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#060d1f] to-[#0a1228] p-4 shadow-lg"
      data-testid="lineup-optimizer-matchup-header"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white/90">
            AF
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-white">{model.teamName}</h1>
            <p className="text-xs text-white/55">
              vs <span className="text-white/80">{model.opponentName}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
            {model.record}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
            Rank #{model.rank}
          </span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-100">
            {model.weekLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/45">Projected</p>
          <p className="text-2xl font-semibold tabular-nums text-white">{model.projectedScore.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/45">Win probability</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold tabular-nums text-cyan-200">{winPct}%</p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                model.tag === 'Favorite' && 'bg-emerald-500/15 text-emerald-200',
                model.tag === 'Underdog' && 'bg-amber-500/15 text-amber-200',
                model.tag === 'Close Matchup' && 'bg-sky-500/15 text-sky-200'
              )}
            >
              {model.tag}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/40">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            barLeft ? 'bg-gradient-to-r from-emerald-500/80 to-cyan-500/70' : 'bg-gradient-to-r from-amber-500/70 to-rose-500/60'
          )}
          style={{ width: `${Math.min(100, Math.max(8, winPct))}%` }}
          role="progressbar"
          aria-valuenow={winPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-white/45">Strategy</span>
        <span className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-100">
          {model.strategyLabel}
        </span>
      </div>
    </section>
  )
}
