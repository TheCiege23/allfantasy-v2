'use client'
/**
 * Fantasy OS Suite — Phase OS-B1: Commissioner Multi-League Command Center.
 *
 * A reusable, priority-ranked queue of real Decision OS recommended actions across every league a
 * commissioner manages. Deliberately generic: `CommissionerAttentionQueueEntry[]` in, a ranked list
 * out — no page-specific logic, no fetch, no state. This is meant to be the same component the
 * future Notification Engine (Phase OS-B3) reads from, so it takes no dependency on this page's own
 * layout or data-fetching. Ranked by urgency (urgent before standard), never regrouped by feature —
 * exactly the ordering principle this phase's own instructions called for.
 *
 * No fake intelligence: every entry is a real `recommendedActions` message Mission Control already
 * produced for a real league. An empty queue renders a clean, honest empty state, never a
 * placeholder claiming there's nothing to report when the underlying data simply hasn't resolved.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { CommissionerAttentionQueueEntry } from '@/lib/decision-os/commissionerCommandCenter'
import { DecisionOsPanel } from './DecisionOsCardPrimitives'

type CommissionerAttentionQueueProps = {
  entries: CommissionerAttentionQueueEntry[]
  leagueNameById: Map<string, string>
  /** Cap how many entries render, independent of how many the API returned. Defaults to all. */
  limit?: number
}

export default function CommissionerAttentionQueue({ entries, leagueNameById, limit }: CommissionerAttentionQueueProps) {
  const visible = typeof limit === 'number' ? entries.slice(0, limit) : entries

  return (
    <DecisionOsPanel title="Attention queue">
      {visible.length === 0 ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted" data-testid="attention-queue-empty">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" aria-hidden />
          Nothing needs your attention right now.
        </div>
      ) : (
        <ul className="mt-2 space-y-2" data-testid="attention-queue-list">
          {visible.map((entry, index) => (
            <li
              key={`${entry.leagueId}-${index}`}
              data-testid={entry.priority === 'urgent' ? 'attention-queue-urgent-item' : 'attention-queue-item'}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                entry.priority === 'urgent'
                  ? 'border-status-warning/30 bg-status-warning/10'
                  : 'border-subtle bg-surface-muted'
              }`}
            >
              {entry.priority === 'urgent' ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning" aria-hidden />
              ) : null}
              <div className="min-w-0">
                <p className="font-semibold text-primary">{leagueNameById.get(entry.leagueId) ?? entry.leagueId}</p>
                <p className="text-xs leading-5 text-secondary">{entry.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DecisionOsPanel>
  )
}
