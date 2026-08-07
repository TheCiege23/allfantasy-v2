'use client'

/**
 * DashboardLiveDrafts — the CROSS-LEAGUE draft strip on the main dashboard.
 *
 * This is the one surface that shows the viewer's drafts across every league
 * (league pages deliberately show only their own draft room). Live/paused
 * drafts render hot with a link straight into that league's Live Intel tab;
 * scheduled ones show their clock. Complete drafts stay out of the way.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { DraftListItem } from '@/lib/draft-intel/sleeperDraftIntelService'
import type { UserLeague } from '@/app/dashboard/types'
import '@/components/decide/broadcast-deck.css'

type ListResponse =
  | { linked: false; drafts: null }
  | { linked: true; season?: string; drafts: DraftListItem[] | null; error?: string }

export function DashboardLiveDrafts({ leagues }: { leagues: UserLeague[] }) {
  const [drafts, setDrafts] = useState<DraftListItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/draft/intel', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<ListResponse>) : null))
      .then((payload) => {
        if (!cancelled && payload?.linked && Array.isArray(payload.drafts)) {
          setDrafts(payload.drafts)
        }
      })
      .catch(() => {
        /* strip is additive — dashboard renders fine without it */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const active = (drafts ?? []).filter((d) => d.status !== 'complete')
  if (active.length === 0) return null

  const afLeagueFor = (sleeperLeagueId: string | null): UserLeague | null =>
    sleeperLeagueId
      ? leagues.find((l) => l.sleeperLeagueId === sleeperLeagueId) ?? null
      : null

  return (
    <div className="bdx" style={{ padding: '8px 10px 2px' }} data-testid="dashboard-live-drafts">
      <div className="bdx-rows" style={{ marginBottom: 4 }}>
        {active.slice(0, 6).map((d) => {
          const af = afLeagueFor(d.leagueId)
          const chip =
            d.status === 'drafting' ? (
              <span className="bdx-sev ok">● LIVE</span>
            ) : d.status === 'paused' ? (
              <span className="bdx-sev warn">⏸ paused</span>
            ) : (
              <span className="bdx-sev info">
                {d.startTime ? new Date(d.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'scheduled'}
              </span>
            )
          const row = (
            <div className="bdx-row" style={{ alignItems: 'center', padding: '5px 0' }}>
              <span
                className="x"
                style={{ textAlign: 'left', flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {af?.name ?? d.name}
              </span>
              {!af ? (
                <span
                  className="bdx-sev warn"
                  title="This league is on your Sleeper account but not imported to AllFantasy yet — import it to unlock Live Intel, grades, and Chimmy."
                >
                  import
                </span>
              ) : null}
              {chip}
            </div>
          )
          // Imported → straight into that league's Live Intel.
          // NOT imported → into the import flow, so a live draft is never a dead end.
          return (
            <Link
              key={d.draftId}
              href={af ? `/league/${af.id}?view=draft_intel` : '/import?returnTo=/dashboard'}
              style={{ textDecoration: 'none', color: 'inherit' }}
              title={
                af
                  ? "Open this league's Live Intel"
                  : 'Import this league to AllFantasy to unlock its draft cockpit'
              }
            >
              {row}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardLiveDrafts
