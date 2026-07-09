'use client'
/**
 * Fantasy OS Suite — Phase OS-B1: Commissioner Multi-League Command Center.
 *
 * "What requires my attention today?" — the top-level answer, in four numbers. Deliberately not a
 * wall of metrics: total leagues (ordinary AF count, always known), leagues with a real Decision OS
 * read on them ("tracked" rather than an invented "active season" concept this codebase has no real
 * signal for), leagues needing attention (Decision OS's own watch/at_risk/critical bucketing), and
 * drafts approaching (AF-native `LeagueSettings.draftDateUtc` only — honestly excludes Sleeper
 * leagues, which have no persisted draft date anywhere in this codebase today).
 */
import { AlertTriangle, CalendarClock, ShieldCheck, Trophy } from 'lucide-react'

type CommissionerCommandCenterOverviewProps = {
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

export default function CommissionerCommandCenterOverview({
  totalLeagues,
  trackedLeagueCount,
  leaguesNeedingAttentionCount,
  draftsApproachingCount,
}: CommissionerCommandCenterOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="command-center-overview">
      <StatChip icon={Trophy} label="Total leagues" value={totalLeagues} />
      <StatChip icon={ShieldCheck} label="Actively monitored" value={trackedLeagueCount} />
      <StatChip icon={AlertTriangle} label="Need attention" value={leaguesNeedingAttentionCount} tone="risk" />
      <StatChip icon={CalendarClock} label="Drafts approaching" value={draftsApproachingCount} />
    </div>
  )
}
