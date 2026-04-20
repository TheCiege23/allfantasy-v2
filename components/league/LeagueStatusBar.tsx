'use client'

import type { LeagueLifecycleSnapshot } from '@/components/league/types'

function labelState(state: string): string {
  return state
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function nextHint(snapshot: LeagueLifecycleSnapshot, currentWeek: number | null | undefined): string {
  switch (snapshot.state) {
    case 'setup':
      return 'Finish league setup and invite managers.'
    case 'pre_draft':
      return 'Configure draft settings, then start the draft when ready.'
    case 'drafting':
      return 'Draft in progress — make picks or wait on the clock.'
    case 'post_draft':
      return 'Draft complete — open the season or adjust rosters.'
    case 'in_season':
      return currentWeek != null
        ? `Week ${currentWeek} — waivers, trades, and lineups follow lifecycle rules.`
        : 'Season in progress.'
    case 'playoffs':
      return 'Playoffs — scoring settings are protected; use commissioner override if needed.'
    case 'completed':
      return 'Season completed — archive or review final standings.'
    case 'archived':
      return 'League archived — read-only history.'
    default:
      return ''
  }
}

export default function LeagueStatusBar({
  snapshot,
  currentWeek,
}: {
  snapshot: LeagueLifecycleSnapshot | undefined
  currentWeek?: number | null
}) {
  if (!snapshot) return null

  const hint = nextHint(snapshot, currentWeek)

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-[#0a1228]/90 px-3 py-2.5 text-left shadow-sm"
      data-testid="league-status-bar"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/90">League status</span>
        {snapshot.emergencyPaused ? (
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
            Emergency pause
          </span>
        ) : null}
        {snapshot.locked ? (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/80">Locked</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold text-white">{labelState(snapshot.state)}</p>
      {hint ? <p className="mt-0.5 text-xs text-white/55">{hint}</p> : null}
    </div>
  )
}
