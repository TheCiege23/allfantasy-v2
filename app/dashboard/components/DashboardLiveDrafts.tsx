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
    <div className="bdx" style={{ padding: '10px 12px 4px' }} data-testid="dashboard-live-drafts">
      <div className="bdx-kick" style={{ marginBottom: 8 }}>
        <h2 className="bdx-disp" style={{ fontSize: 15 }}>Your drafts</h2>
        <span className="bdx-sub">all leagues</span>
      </div>
      <div className="bdx-rows" style={{ marginBottom: 6 }}>
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
            <div className="bdx-row" style={{ alignItems: 'center' }}>
              <span className="x" style={{ textAlign: 'left', flex: 1, fontSize: 12.5 }}>
                {af?.name ?? d.name}
              </span>
              {chip}
            </div>
          )
          return af ? (
            <Link
              key={d.draftId}
              href={`/league/${af.id}?view=draft_intel`}
              style={{ textDecoration: 'none', color: 'inherit' }}
              title="Open this league's Live Intel"
            >
              {row}
            </Link>
          ) : (
            <div key={d.draftId} title="This draft's league isn't imported to AllFantasy yet.">
              {row}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardLiveDrafts
