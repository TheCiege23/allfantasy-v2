'use client'

import type { UserLeague } from '../types'

export type LineupChipState = 'preview' | 'issues' | 'clear'

export type TodayStripProps = {
  leagues: UserLeague[]
  /** How to label the lineup chip after optional API check. */
  lineupChipState: LineupChipState
  /** Preview: usually leagues.length; issues: API totalIssues; clear: unused for label. */
  lineupCount: number
  onLineupIssuesClick: () => void
}

/**
 * Attention items for "Today" — lineup chip opens lineup-issues modal when wired.
 */
export function TodayStrip({ leagues, lineupChipState, lineupCount, onLineupIssuesClick }: TodayStripProps) {
  if (leagues.length === 0) {
    return null
  }

  const issueLabel =
    lineupCount === 1 ? '1 lineup issue' : `${lineupCount} lineup issues`
  const previewLabel =
    lineupCount === 1 ? '1 lineup to set' : `${lineupCount} lineups to set`

  return (
    <section className="space-y-1.5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-white/35">Today</p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto py-1">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[13px] text-white/75">
          📋 Waivers close tonight
        </span>
        {lineupChipState === 'clear' ? (
          <button
            type="button"
            onClick={onLineupIssuesClick}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[13px] text-emerald-400 transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/15"
          >
            ✓ Lineups look good
          </button>
        ) : (
          <button
            type="button"
            onClick={onLineupIssuesClick}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[13px] text-amber-400 transition-colors hover:border-amber-500/30 hover:bg-amber-500/20"
          >
            ⚠ {lineupChipState === 'preview' ? previewLabel : issueLabel}
          </button>
        )}
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[13px] text-white/75">
          🔄 No pending trades
        </span>
      </div>
    </section>
  )
}
