'use client'
/**
 * Fantasy OS Suite — Phase OS-C1: Manager Operating System Foundation.
 *
 * "What needs my attention today, across every team I play in?" — the manager-facing mirror of
 * `CommissionerCommandCenterOverview.tsx`, same 4-stat-chip layout and visual language. Total
 * leagues (ordinary AF count, always known), leagues with a real Decision OS read on them
 * ("tracked"), leagues needing attention (Manager OS's own retention-risk/inactivity bucketing), and
 * drafts approaching (same real `LeagueSettings.draftDateUtc` source Commissioner OS already uses,
 * counted across every league this user belongs to rather than just the ones they commission).
 */
import { AlertTriangle, CalendarClock, ShieldCheck, Trophy } from 'lucide-react'

type ManagerCommandCenterOverviewProps = {
  totalLeagues: number
  trackedLeagueCount: number
  leaguesNeedingAttentionCount: number
  draftsApproachingCount: number
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Trophy
  label: string
  value: number
  tone?: 'risk' | 'neutral'
}) {
  const toneClass =
    tone === 'risk' && value > 0
      ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
      : 'border-subtle bg-surface-muted text-primary'
  return (
    <div className={`min-w-0 rounded-xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

export default function ManagerCommandCenterOverview({
  totalLeagues,
  trackedLeagueCount,
  leaguesNeedingAttentionCount,
  draftsApproachingCount,
}: ManagerCommandCenterOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="manager-command-center-overview">
      <StatChip icon={Trophy} label="Total leagues" value={totalLeagues} />
      <StatChip icon={ShieldCheck} label="Actively monitored" value={trackedLeagueCount} />
      <StatChip icon={AlertTriangle} label="Need attention" value={leaguesNeedingAttentionCount} tone="risk" />
      <StatChip icon={CalendarClock} label="Drafts approaching" value={draftsApproachingCount} />
    </div>
  )
}
