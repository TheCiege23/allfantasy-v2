'use client'
/**
 * Fantasy OS Suite — Phase OS-B1: Commissioner Multi-League Command Center.
 *
 * "What changed since yesterday?" — but only ever answered with a real, already-computed trend
 * (`snapshot.trend.available === true`, i.e. 2+ real behavioral snapshots exist for that league).
 * Real snapshot history is thin everywhere today (the snapshot-capture cron isn't scheduled
 * anywhere — see `OS_PROGRESS_DASHBOARD.md`), so this section honestly shows an empty state in most
 * real environments right now, by design, not as a bug. No delta is ever invented for a league
 * without real trend history.
 */
import { ArrowDown, ArrowRight, ArrowUp, Clock3 } from 'lucide-react'
import type { CommissionerRecentChangeEntry } from '@/lib/decision-os/commissionerCommandCenter'
import { DecisionOsPanel } from './DecisionOsCardPrimitives'

type CommissionerRecentChangesProps = {
  entries: CommissionerRecentChangeEntry[]
  leagueNameById: Map<string, string>
}

const DIRECTION_ICON = { increasing: ArrowUp, decreasing: ArrowDown, flat: ArrowRight } as const

export default function CommissionerRecentChanges({ entries, leagueNameById }: CommissionerRecentChangesProps) {
  return (
    <DecisionOsPanel title="Recent changes">
      {entries.length === 0 ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted" data-testid="recent-changes-empty">
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
          Not enough snapshot history yet to show real changes — check back after a few days of activity.
        </div>
      ) : (
        <ul className="mt-2 space-y-1.5" data-testid="recent-changes-list">
          {entries.map((entry) => {
            const Icon = DIRECTION_ICON[entry.direction]
            return (
              <li key={entry.leagueId} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-primary">
                  {leagueNameById.get(entry.leagueId) ?? entry.leagueId}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-brand-primary" aria-hidden />
                  {entry.direction} ({entry.eventCountDelta > 0 ? '+' : ''}
                  {entry.eventCountDelta})
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </DecisionOsPanel>
  )
}
